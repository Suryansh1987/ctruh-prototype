import { getMeshyTaskByTaskId, getReportById, markMeshyTaskCompleted, updateReport } from "@/lib/db/queries";
import { uploadGlbToS3 } from "@/lib/s3/upload";
import { sendReportReadyEmail } from "@/lib/resend";
import { isValidMeshyWebhookSignature, matchesLegacyMeshySecret } from "@/lib/meshy/webhook-auth";
import type { GlbEntry } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedReportId = searchParams.get("reportId");
    const requestedProductId = searchParams.get("productId");
    const secret = searchParams.get("secret");
    const signature = searchParams.get("sig");

    const task = await request.json() as {
      id?: string;
      status?: string;
      model_urls?: { glb?: string };
      thumbnail_url?: string;
      progress?: number;
    };

    const mappedTask = task.id ? await getMeshyTaskByTaskId(task.id) : null;
    const reportId = requestedReportId ?? mappedTask?.reportId ?? null;
    const productId = requestedProductId ?? mappedTask?.productId ?? null;

    if (!reportId || !productId) {
      console.warn("[webhook] ignored Meshy event with no report/product mapping", {
        taskId: task.id ?? null,
        url: request.url,
      });
      return new Response(null, { status: 204 });
    }

    const isSignedRequest = isValidMeshyWebhookSignature(reportId, productId, signature);
    const isLegacyRequest = matchesLegacyMeshySecret(secret);

    if ((signature || secret) && !isSignedRequest && !isLegacyRequest) {
      return new Response(null, { status: 401 });
    }

    if (!signature && !secret && !mappedTask) {
      console.warn("[webhook] ignored unsigned Meshy event for unknown task", {
        taskId: task.id ?? null,
      });
      return new Response(null, { status: 204 });
    }

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
    if (task.id) {
      await markMeshyTaskCompleted(task.id);
    }

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
