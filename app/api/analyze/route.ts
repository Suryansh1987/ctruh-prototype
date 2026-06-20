import { scrapeShopifyProducts } from "@/lib/shopify/scraper";
import { scoreAllProducts } from "@/lib/openai/scorer";
import { generateMockupsForTopProducts } from "@/lib/openai/image-generator";
import { computeXRReadinessScore, computeTopOpportunities, computeROIScenarios } from "@/lib/scoring/xr-readiness";
import { uploadPdfToS3 } from "@/lib/s3/upload";
import { generateReportPDF } from "@/lib/pdf/generate";
import { getVerifiedContact, insertReport, insertTokenLogs } from "@/lib/db/queries";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import type { XRReport, TokenUsageEntry } from "@/lib/types";

export const maxDuration = 300;

// NDJSON streaming — each line is a JSON event
export async function POST(request: Request) {
  const body = await request.json() as { url?: string; email?: string; phone?: string };
  const rawUrl = body?.url;
  const email = normalizeEmail(body?.email || "");
  const phone = normalizePhone(body?.phone || "");

  if (!rawUrl || typeof rawUrl !== "string") {
    return Response.json({ error: "Paste a Shopify store URL to begin." }, { status: 400 });
  }

  if (!isValidEmail(email) || !isValidPhone(phone)) {
    return Response.json({ error: "Enter a valid email and phone number before starting analysis." }, { status: 400 });
  }

  const verifiedContact = await getVerifiedContact({ email, phone });
  if (!verifiedContact) {
    return Response.json({ error: "Verify your email before generating a report." }, { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        // ── Stage 1: scraping ──────────────────────────────────────
        emit({ type: "phase", phase: "scraping" });

        const { storeName, products } = await scrapeShopifyProducts(rawUrl);

        if (products.length === 0) {
          emit({ type: "error", message: "We couldn't find products to analyze from this store." });
          controller.close();
          return;
        }

        emit({ type: "scraped", storeName, count: products.length });

        // ── Stage 2: scoring ───────────────────────────────────────
        emit({ type: "phase", phase: "scoring" });

        const allTokenUsage: TokenUsageEntry[] = [];
        const { scoredProducts, tokenUsage: scoringUsage } = await scoreAllProducts(products);
        allTokenUsage.push(...scoringUsage);

        const topOpportunities = computeTopOpportunities(scoredProducts);
        emit({ type: "scored", opportunities: topOpportunities });

        // ── Stage 3: images ────────────────────────────────────────
        emit({ type: "phase", phase: "images" });

        const { products: productsWithMockups, tokenUsage: imageUsage } =
          await generateMockupsForTopProducts(scoredProducts);
        allTokenUsage.push(imageUsage);

        // ── Stage 4: assemble report ───────────────────────────────
        const xrReadinessScore = computeXRReadinessScore(productsWithMockups);
        const avgProductPrice = products.reduce((s, p) => s + p.price, 0) / products.length;
        const roiScenarios = computeROIScenarios(avgProductPrice);
        const categories = Array.from(new Set(productsWithMockups.map((p) => p.category)));

        const report: XRReport = {
          storeName,
          storeUrl: rawUrl,
          analyzedAt: new Date().toISOString(),
          xrReadinessScore,
          productCount: products.length,
          categories,
          topOpportunities,
          products: productsWithMockups,
          roiScenarios,
          avgProductPrice,
        };

        emit({ type: "report", data: report });
        controller.close();

        // PDF + S3 + DB in background
        persistReport(report, allTokenUsage, {
          contactId: verifiedContact.id,
          contactEmail: verifiedContact.email,
          contactPhone: verifiedContact.phone,
        }).catch((err) =>
          console.error("[persist] failed:", err)
        );
      } catch (err) {
        console.error("[analyze] pipeline error:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong generating your report. Try again.";
        emit({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}

async function persistReport(
  report: XRReport,
  tokenUsage: TokenUsageEntry[],
  contact: { contactId: string; contactEmail: string; contactPhone: string }
) {
  // Generate PDF + upload to S3
  let pdfUrl: string | undefined;
  try {
    const pdfBuffer = await generateReportPDF(report);
    pdfUrl = await uploadPdfToS3({ buffer: pdfBuffer, storeName: report.storeName });
    console.log(`[s3] uploaded: ${pdfUrl}`);
  } catch (err) {
    console.error("[s3] pdf/upload failed:", err);
  }

  const reportId = await insertReport({
    contactId: contact.contactId,
    contactEmail: contact.contactEmail,
    contactPhone: contact.contactPhone,
    storeUrl: report.storeUrl,
    storeName: report.storeName,
    productCount: report.productCount,
    xrReadinessScore: report.xrReadinessScore,
    topOpportunities: report.topOpportunities,
    pdfUrl,
  });

  await insertTokenLogs(reportId, tokenUsage);

  const totalCost = tokenUsage.reduce((sum, e) => sum + e.costUsd, 0);
  console.log(`[db] report ${reportId} saved — $${totalCost.toFixed(4)} total cost`);
}
