import { createImageTo3DTask, waitForTaskCompletion } from "@/lib/meshy/meshy-service";
import { uploadGlbToS3 } from "@/lib/s3/upload";
import type { ScoredProduct, TokenUsageEntry } from "@/lib/types";

export interface MeshyProgressEvent {
  product: string;
  taskIndex: number;
  total: number;
  progress: number;
}

async function generate3DModel(
  product: ScoredProduct,
  taskIndex: number,
  total: number,
  onProgress?: (event: MeshyProgressEvent) => void
): Promise<{ glbUrl: string | null; previewImageUrl: string | null }> {
  if (!product.imageUrl) {
    console.log(`[meshy] skipping "${product.title}" — no imageUrl`);
    return { glbUrl: null, previewImageUrl: null };
  }

  try {
    console.log(`[meshy] starting image-to-3D for "${product.title}"`);
    const taskId = await createImageTo3DTask(product.imageUrl);

    const result = await waitForTaskCompletion(
      taskId,
      (progress) => onProgress?.({ product: product.title, taskIndex, total, progress })
    );

    console.log(`[meshy] ✓ "${product.title}" — uploading GLB to S3`);
    const s3GlbUrl = await uploadGlbToS3({
      glbUrl: result.glbUrl,
      storeName: product.title,
      productId: product.id,
    });

    console.log(`[meshy] ✓ "${product.title}" — S3: ${s3GlbUrl}`);
    return { glbUrl: s3GlbUrl, previewImageUrl: result.previewImageUrl };
  } catch (err) {
    console.error(`[meshy] failed for "${product.title}":`, err);
    return { glbUrl: null, previewImageUrl: null };
  }
}

export async function generateMockupsForTopProducts(
  products: ScoredProduct[],
  onProgress?: (event: MeshyProgressEvent) => void
): Promise<{ products: ScoredProduct[]; tokenUsage: TokenUsageEntry }> {
  const sorted = [...products].sort((a, b) => b.overallXRScore - a.overallXRScore);
  const top2 = sorted.slice(0, 2);

  console.log(`[meshy] generating for: ${top2.map((p) => p.title).join(" | ")}`);

  const results = await Promise.all(
    top2.map((p, i) => generate3DModel(p, i, top2.length, onProgress))
  );

  const successCount = results.filter((r) => r.glbUrl).length;
  console.log(`[meshy] ${successCount}/${top2.length} GLBs generated`);

  const updatedProducts = products.map((p) => {
    const idx = top2.findIndex((t) => t.id === p.id);
    if (idx !== -1) {
      return { ...p, glbUrl: results[idx].glbUrl, previewImageUrl: results[idx].previewImageUrl };
    }
    return { ...p, glbUrl: null, previewImageUrl: null };
  });

  return {
    products: updatedProducts,
    tokenUsage: {
      operation: "meshy_image_to_3d",
      model: "meshy-4",
      imagesGenerated: successCount,
      costUsd: 0,
    },
  };
}
