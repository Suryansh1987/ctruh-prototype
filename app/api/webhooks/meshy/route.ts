import { getReportById, updateReport } from "@/lib/db/queries";
import { uploadGlbToS3 } from "@/lib/s3/upload";
import { sendReportReadyEmail } from "@/lib/resend";
import { isValidMeshyWebhookSignature, matchesLegacyMeshySecret } from "@/lib/meshy/webhook-auth";
import type { GlbEntry } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const productId = searchParams.get("productId");
    const secret = searchParams.get("secret");
    const signature = searchParams.get("sig");

    if (!reportId || !productId) {
      return new Response(null, { status: 400 });
    }

    const isSignedRequest = isValidMeshyWebhookSignature(reportId, productId, signature);
    const isLegacyRequest = matchesLegacyMeshySecret(secret);

    if (!isSignedRequest && !isLegacyRequest) {
      return new Response(null, { status: 401 });
    }

    const task = await request.json() as {
      id?: string;
      status?: string;
      model_urls?: { glb?: string };
      thumbnail_url?: string;
      progress?: number;
    };

    if (task.status !== "SUCCEEDED" || !task.model_urls?.glb) {
      // Not a completion event we care about
      return new Response(null, { status: 204 });
    }

    const row = await getReportById(reportId);
    if (!row) return new Response(null, { status: 404 });

    const pid = parseInt(productId, 10);

    // If this product's GLB is already stored, ignore duplicate webhook
    if (row.glbUrls?.some((g) => g.productId === pid)) {
      console.log(`[webhook] duplicate for report ${reportId} product ${pid} — ignored`);
      return new Response(null, { status: 204 });
    }

    // Find product info from reportData
    const product = row.reportData?.products.find((p) => p.id === pid);
    const productTitle = product?.title ?? `Product ${pid}`;
    const productScore = product?.overallXRScore ?? 0;

    // Upload GLB to S3 — fall back to raw Meshy URL if S3 fails
    let finalGlbUrl = task.model_urls.glb;
    try {
      finalGlbUrl = await uploadGlbToS3({
        glbUrl: task.model_urls.glb,
        storeName: row.storeName ?? "store",
        productId: pid,
      });
    } catch (err) {
      console.error("[webhook] S3 upload failed, using raw Meshy URL:", err);
    }

    const newEntry: GlbEntry = {
      productId: pid,
      title: productTitle,
      glbUrl: finalGlbUrl,
      previewImageUrl: task.thumbnail_url ?? null,
      score: productScore,
    };

    const updatedGlbUrls = [...(row.glbUrls ?? []), newEntry];

    await updateReport(reportId, {
      glbUrls: updatedGlbUrls,
      status: "ready",
    });

    console.log(`[webhook] report ${reportId} — GLB for "${productTitle}" stored`);

    // Send email if contact email is available
    if (row.contactEmail && row.storeName) {
      await sendReportReadyEmail({
        to: row.contactEmail,
        storeName: row.storeName,
        reportId,
      }).catch((err) => console.error("[webhook] email failed:", err));
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[webhook/meshy] error:", err);
    return new Response(null, { status: 500 });
  }
}
