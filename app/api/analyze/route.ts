import { after } from "next/server";
import { scrapeShopifyProducts } from "@/lib/shopify/scraper";
import { scoreAllProducts } from "@/lib/openai/scorer";
import { generateMockupsForTopProducts } from "@/lib/openai/image-generator";
import { computeXRReadinessScore, computeTopOpportunities, computeROIScenarios, computeStoreInsights, computeQuickWins } from "@/lib/scoring/xr-readiness";
import { uploadPdfToS3 } from "@/lib/s3/upload";
import { generateReportPDF } from "@/lib/pdf/generate";
import { getVerifiedContact, insertReport, insertTokenLogs, updateReport } from "@/lib/db/queries";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import { sendReportReadyEmail } from "@/lib/resend";
import type { XRReport, TokenUsageEntry, ScoredProduct } from "@/lib/types";
import type { GlbEntry } from "@/lib/db/schema";

export const maxDuration = 300;

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

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

        // ── Stage 3: assemble base report & persist to DB ──────────
        const xrReadinessScore = computeXRReadinessScore(scoredProducts);
        const avgProductPrice = products.reduce((s, p) => s + p.price, 0) / products.length;
        const roiScenarios = computeROIScenarios(avgProductPrice);
        const categories = Array.from(new Set(scoredProducts.map((p) => p.category)));
        const storeInsights = computeStoreInsights(scoredProducts);
        const quickWins = computeQuickWins(scoredProducts);

        const baseReport: XRReport = {
          storeName,
          storeUrl: rawUrl,
          analyzedAt: new Date().toISOString(),
          xrReadinessScore,
          productCount: products.length,
          categories,
          topOpportunities,
          storeInsights,
          quickWins,
          products: scoredProducts,
          roiScenarios,
          avgProductPrice,
        };

        // Insert with status 'processing' so report page exists immediately
        const reportId = await insertReport({
          contactId: verifiedContact.id,
          contactEmail: verifiedContact.email,
          contactPhone: verifiedContact.phone,
          storeUrl: rawUrl,
          storeName,
          productCount: products.length,
          xrReadinessScore,
          topOpportunities,
          reportData: baseReport,
          status: "processing",
        });
        await insertTokenLogs(reportId, allTokenUsage);

        emit({ type: "reportId", id: reportId });

        // ── Stage 4: 3D model generation (150s budget) ────────────
        emit({ type: "phase", phase: "images" });

        const webhookSecret = process.env.MESHY_WEBHOOK_SECRET ?? "";
        const baseUrl = getBaseUrl();

        let productsWithMockups: ScoredProduct[] = scoredProducts;
        let meshyTimedOut = false;

        try {
          const { products: withMockups, tokenUsage: imageUsage } =
            await generateMockupsForTopProducts(
              scoredProducts,
              (event) => emit({ type: "meshy_progress", ...event }),
              (productId) =>
                `${baseUrl}/api/webhooks/meshy?reportId=${reportId}&productId=${productId}&secret=${webhookSecret}`
            );
          productsWithMockups = withMockups;
          allTokenUsage.push(imageUsage);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("timed out")) {
            meshyTimedOut = true;
            console.log(`[meshy] timed out for report ${reportId} — webhook will complete later`);
          } else {
            console.error("[meshy] failed:", err);
          }
        }

        // Build final report with whatever GLBs we have
        const glbEntries: GlbEntry[] = productsWithMockups
          .filter((p) => p.glbUrl)
          .map((p) => ({
            productId: p.id,
            title: p.title,
            glbUrl: p.glbUrl!,
            previewImageUrl: p.previewImageUrl,
            score: p.overallXRScore,
          }));

        const finalReport: XRReport = { ...baseReport, products: productsWithMockups };

        // Update DB: if not timed out → ready now; if timed out → webhook will set ready
        await updateReport(reportId, {
          reportData: finalReport,
          ...(glbEntries.length > 0 ? { glbUrls: glbEntries } : {}),
          ...(!meshyTimedOut ? { status: "ready" } : {}),
        });

        emit({ type: "redirect", url: `/report/${reportId}` });
        controller.close();

        // PDF + S3 + email run after response is closed
        after(
          finalizePersist(reportId, finalReport, verifiedContact.email, meshyTimedOut)
            .catch((err) => console.error("[persist] failed:", err))
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

async function finalizePersist(
  reportId: string,
  report: XRReport,
  contactEmail: string,
  meshyTimedOut: boolean
) {
  // Generate PDF with whatever GLBs we have (even partial)
  let pdfUrl: string | undefined;
  try {
    const pdfBuffer = await generateReportPDF(report);
    pdfUrl = await uploadPdfToS3({ buffer: pdfBuffer, storeName: report.storeName });
    console.log(`[s3] uploaded: ${pdfUrl}`);
    await updateReport(reportId, { pdfUrl });
  } catch (err) {
    console.error("[s3] pdf/upload failed:", err);
  }

  // Only send "ready" email if Meshy finished in-stream (webhook sends its own email)
  if (!meshyTimedOut) {
    try {
      await sendReportReadyEmail({ to: contactEmail, storeName: report.storeName, reportId });
    } catch (err) {
      console.error("[email] failed:", err);
    }
  }
}
