import { getOpenAI, getImageOpenAI, GPT_MODEL, DALLE_MODEL } from "@/lib/openai/client";
import { calcDalleCost, type TokenUsageEntry } from "@/lib/types";
import type { ScoredProduct } from "@/lib/types";

async function fetchImageAsBase64(url: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
    return { b64: buffer.toString("base64"), mime };
  } catch {
    return null;
  }
}

async function describeProductForRender(
  title: string,
  category: string,
  b64: string,
  mime: string
): Promise<string> {
  try {
    const vision = await getOpenAI().chat.completions.create({
      model: GPT_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${b64}`, detail: "low" },
            },
            {
              type: "text",
              text:
                `Describe this product photo in one dense sentence (colours, shape, material, key details) ` +
                `so an image generator can recreate it accurately as a 3D render. ` +
                `Product: "${title}", category: ${category}. ` +
                `Output only the description, no preamble.`,
            },
          ],
        },
      ],
    });
    return vision.choices[0]?.message?.content?.trim() ?? title;
  } catch {
    return title;
  }
}

async function generate3DMockup(product: ScoredProduct): Promise<string | null> {
  let productDescription = `"${product.title}", ${product.category} category`;

  // Use GPT-4o vision to build an accurate description from the real product photo
  if (product.imageUrl) {
    const img = await fetchImageAsBase64(product.imageUrl);
    if (img) {
      console.log(`[image] describing "${product.title}" via vision…`);
      productDescription = await describeProductForRender(
        product.title,
        product.category,
        img.b64,
        img.mime
      );
      console.log(`[image] description: ${productDescription.slice(0, 80)}…`);
    }
  }

  const prompt =
    `Professional photorealistic 3D render of: ${productDescription}. ` +
    `Clean white background, soft studio lighting, centered composition, ` +
    `suitable for AR/XR commerce. High-detail textures, no hard shadows, ` +
    `no text, no logos, commercial product photography style.`;

  try {
    const response = await getImageOpenAI().images.generate({
      model: DALLE_MODEL,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const img = response.data?.[0];

    if (img?.b64_json) {
      console.log(`[image] ✓ generate b64 for "${product.title}"`);
      return `data:image/png;base64,${img.b64_json}`;
    }

    if (img?.url) {
      const r = await fetch(img.url);
      if (r.ok) {
        const contentType = r.headers.get("content-type")?.split(";")[0] ?? "image/png";
        const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
        console.log(`[image] ✓ generate URL for "${product.title}"`);
        return `data:${contentType};base64,${b64}`;
      }
    }

    console.error(`[image] no image data for "${product.title}"`);
    return null;
  } catch (err) {
    console.error(`[image] error for "${product.title}":`, err);
    return null;
  }
}

export async function generateMockupsForTopProducts(
  products: ScoredProduct[]
): Promise<{ products: ScoredProduct[]; tokenUsage: TokenUsageEntry }> {
  const sorted = [...products].sort((a, b) => b.overallXRScore - a.overallXRScore);
  const top3 = sorted.slice(0, 3);

  console.log(`[image] generating for: ${top3.map((p) => p.title).join(" | ")}`);
  const mockups = await Promise.all(top3.map((p) => generate3DMockup(p)));

  const successCount = mockups.filter(Boolean).length;
  console.log(`[image] ${successCount}/${top3.length} succeeded`);

  const updatedProducts = products.map((p) => {
    const topIdx = top3.findIndex((t) => t.id === p.id);
    if (topIdx !== -1 && mockups[topIdx]) {
      return { ...p, mockupImageBase64: mockups[topIdx] };
    }
    return p;
  });

  return {
    products: updatedProducts,
    tokenUsage: {
      operation: "image_generation",
      model: DALLE_MODEL,
      imagesGenerated: successCount,
      costUsd: calcDalleCost(successCount),
    },
  };
}
