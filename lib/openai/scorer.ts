import { z } from "zod";
import { getOpenAI, GPT_MODEL } from "@/lib/openai/client";
import { computeOverallScore } from "@/lib/scoring/weights";
import { calcGPTCost, type TokenUsageEntry } from "@/lib/types";
import type { NormalizedProduct, ScoredProduct } from "@/lib/types";

const CATEGORY_VALUES = [
  "Wearables",
  "Footwear",
  "Jewellery",
  "Home & Furniture",
  "Beauty",
  "Electronics",
  "Accessories",
  "Other",
] as const;

const CONFIDENCE_VALUES = ["High", "Medium", "Low"] as const;
const RESOLUTION_VALUES = ["High", "Medium", "Low"] as const;
const BACKGROUND_VALUES = ["Clean", "Cluttered", "N/A"] as const;
const ANGLE_VALUES = ["Multiple", "Single", "N/A"] as const;
const TEXTURE_VALUES = ["Excellent", "Good", "Poor", "N/A"] as const;

const dimensionSchema = z.object({
  score: z.number().min(1).max(10),
  confidence: z.enum(CONFIDENCE_VALUES),
  reason: z.string(),
  missingOut: z.string(),
  tip: z.string(),
});

const scoringSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  scores: z.object({
    visualization3D: dimensionSchema,
    virtualTryOn: dimensionSchema,
    configurator: dimensionSchema,
    immersiveCommerce: dimensionSchema,
  }),
  assetQuality: z.object({
    score: z.number().min(1).max(10),
    resolution: z.enum(RESOLUTION_VALUES),
    background: z.enum(BACKGROUND_VALUES),
    angleCoverage: z.enum(ANGLE_VALUES),
    textureVisibility: z.enum(TEXTURE_VALUES),
    recommendations: z.array(z.string()),
  }),
});

type ScoringResponse = z.infer<typeof scoringSchema>;
type ScoreContentPart =
  | {
      type: "image_url";
      image_url: { url: string; detail: "low" };
    }
  | {
      type: "text";
      text: string;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clampScore(value: unknown, fallback = 5): number {
  const num = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(10, Math.max(1, Math.round(num * 10) / 10));
}

function normalizeConfidence(value: unknown): ScoringResponse["scores"]["visualization3D"]["confidence"] {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized.startsWith("h")) return "High";
  if (normalized.startsWith("l")) return "Low";
  return "Medium";
}

function normalizeCategory(value: unknown, product: NormalizedProduct): ScoringResponse["category"] {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";

  const aliases: Array<[string[], ScoringResponse["category"]]> = [
    [["wearable", "apparel", "clothing", "tops", "bottoms", "activewear"], "Wearables"],
    [["shoe", "sneaker", "boot", "footwear", "sandals"], "Footwear"],
    [["jewellery", "jewelry", "ring", "necklace", "bracelet", "earring"], "Jewellery"],
    [["furniture", "sofa", "chair", "table", "home", "decor"], "Home & Furniture"],
    [["beauty", "cosmetic", "makeup", "skincare", "fragrance"], "Beauty"],
    [["electronics", "tech", "device", "gadget", "audio"], "Electronics"],
    [["accessories", "bag", "watch", "eyewear", "sunglasses", "hat", "belt"], "Accessories"],
  ];

  for (const [needles, category] of aliases) {
    if (needles.some((needle) => raw.includes(needle))) return category;
  }

  const productHint = `${product.productType} ${product.title} ${product.tags.join(" ")}`.toLowerCase();
  for (const [needles, category] of aliases) {
    if (needles.some((needle) => productHint.includes(needle))) return category;
  }

  return "Other";
}

function normalizeEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  const match = allowed.find((option) => option.toLowerCase() === raw);
  return (match ?? fallback) as T[number];
}

function normalizeDimension(
  value: unknown,
  fallbackReason: string,
  fallbackMissingOut: string,
  fallbackTip: string,
  fallbackScore = 5
): ScoringResponse["scores"]["visualization3D"] {
  const obj = asRecord(value);
  return {
    score: clampScore(obj?.score, fallbackScore),
    confidence: normalizeConfidence(obj?.confidence),
    reason: typeof obj?.reason === "string" && obj.reason.trim() ? obj.reason.trim() : fallbackReason,
    missingOut: typeof obj?.missingOut === "string" && obj.missingOut.trim() ? obj.missingOut.trim() : fallbackMissingOut,
    tip: typeof obj?.tip === "string" && obj.tip.trim() ? obj.tip.trim() : fallbackTip,
  };
}

function buildFallbackResponse(product: NormalizedProduct): ScoringResponse {
  const category = normalizeCategory(product.productType || product.tags.join(" "), product);
  const hasImage = Boolean(product.imageUrl);
  const variantBoost = product.variantCount >= 5 ? 2 : product.variantCount >= 2 ? 1 : 0;
  const priceBoost = product.price >= 100 ? 2 : product.price >= 50 ? 1 : 0;

  return {
    category,
    scores: {
      visualization3D: {
        score: clampScore(5 + priceBoost),
        confidence: "Medium",
        reason: "Fallback score based on product details while the model response was incomplete.",
        missingOut: "Shoppers can't inspect product details from every angle — they hesitate and abandon before buying.",
        tip: "Start with a 360° spin model using existing product photos — low cost, immediate impact on purchase confidence.",
      },
      virtualTryOn: {
        score: clampScore(category === "Wearables" || category === "Accessories" || category === "Footwear" ? 7 : 4),
        confidence: "Medium",
        reason: "Fallback score based on category fit for virtual try-on.",
        missingOut: "Customers guess if the product fits or suits them, leading to high return rates and lost repeat buyers.",
        tip: "A try-on integration requires just one clean product image — launch a pilot on your top-selling wearable first.",
      },
      configurator: {
        score: clampScore(4 + variantBoost),
        confidence: "Medium",
        reason: "Fallback score based on detected variant count.",
        missingOut: "Buyers can't visualize how color, material, or size options actually look — they pick safer (cheaper) alternatives.",
        tip: "Build a live swatch previewer so customers click a color and instantly see the product update — no new photography needed.",
      },
      immersiveCommerce: {
        score: clampScore(5 + priceBoost),
        confidence: "Medium",
        reason: "Fallback score based on price point and category.",
        missingOut: "Your store delivers a flat 2D experience while competitors offer immersive previews — premium customers notice.",
        tip: "Run a 2-week AR pilot on your single highest-price product; the conversion data from this test justifies a full rollout.",
      },
    },
    assetQuality: {
      score: hasImage ? 6 : 3,
      resolution: hasImage ? "Medium" : "Low",
      background: hasImage ? "Clean" : "N/A",
      angleCoverage: hasImage ? "Single" : "N/A",
      textureVisibility: hasImage ? "Good" : "N/A",
      recommendations: hasImage
        ? ["Add more angle shots for higher-confidence 3D conversion."]
        : ["Add at least one clear product image for asset quality scoring."],
    },
  };
}

function normalizeScoringResponse(raw: unknown, product: NormalizedProduct): ScoringResponse {
  const strict = scoringSchema.safeParse(raw);
  if (strict.success) return strict.data;

  const obj = asRecord(raw);
  if (!obj) return buildFallbackResponse(product);

  const scoreContainer =
    asRecord(obj.scores) ??
    asRecord(obj.scoreBreakdown) ??
    asRecord(obj.dimensions) ??
    obj;

  const assetObj = asRecord(obj.assetQuality) ?? asRecord(obj.assets) ?? {};

  const normalized: ScoringResponse = {
    category: normalizeCategory(obj.category ?? obj.productCategory ?? obj.type, product),
    scores: {
      visualization3D: normalizeDimension(
        scoreContainer?.visualization3D ?? scoreContainer?.["3dVisualization"] ?? scoreContainer?.["3D Visualization"],
        "Normalized from a non-standard model response.",
        "Shoppers can't inspect product details from every angle — they hesitate and abandon before buying.",
        "Start with a 360° spin model using existing product photos — low cost, immediate impact on purchase confidence.",
        5
      ),
      virtualTryOn: normalizeDimension(
        scoreContainer?.virtualTryOn ?? scoreContainer?.["virtualTry-On"] ?? scoreContainer?.["Virtual Try-On"],
        "Normalized from a non-standard model response.",
        "Customers guess if the product fits or suits them, leading to high return rates and lost repeat buyers.",
        "A try-on integration requires just one clean product image — launch a pilot on your top-selling wearable first.",
        5
      ),
      configurator: normalizeDimension(
        scoreContainer?.configurator ?? scoreContainer?.["Configurator"],
        "Normalized from a non-standard model response.",
        "Buyers can't visualize how color, material, or size options actually look — they pick safer (cheaper) alternatives.",
        "Build a live swatch previewer so customers click a color and instantly see the product update — no new photography needed.",
        5
      ),
      immersiveCommerce: normalizeDimension(
        scoreContainer?.immersiveCommerce ?? scoreContainer?.immersiveShopping ?? scoreContainer?.["Immersive Commerce"],
        "Normalized from a non-standard model response.",
        "Your store delivers a flat 2D experience while competitors offer immersive previews — premium customers notice.",
        "Run a 2-week AR pilot on your single highest-price product; the conversion data from this test justifies a full rollout.",
        5
      ),
    },
    assetQuality: {
      score: clampScore(assetObj.score, product.imageUrl ? 6 : 3),
      resolution: normalizeEnum(assetObj.resolution, RESOLUTION_VALUES, product.imageUrl ? "Medium" : "Low"),
      background: normalizeEnum(assetObj.background, BACKGROUND_VALUES, product.imageUrl ? "Clean" : "N/A"),
      angleCoverage: normalizeEnum(assetObj.angleCoverage, ANGLE_VALUES, product.imageUrl ? "Single" : "N/A"),
      textureVisibility: normalizeEnum(assetObj.textureVisibility, TEXTURE_VALUES, product.imageUrl ? "Good" : "N/A"),
      recommendations: Array.isArray(assetObj.recommendations)
        ? assetObj.recommendations.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : buildFallbackResponse(product).assetQuality.recommendations,
    },
  };

  return scoringSchema.parse(normalized);
}

const SYSTEM_PROMPT = `You are an XR commerce expert evaluating products for Ctruh — a platform that converts ecommerce stores into immersive 3D/AR experiences.

Score this product on 4 XR dimensions (1-10 each):
- visualization3D: How much does the product benefit from 3D viewing? (shape complexity, physical details matter)
- virtualTryOn: Can the user try it virtually? (wearables, accessories, eyewear score high)
- configurator: How many meaningful variants exist to configure? (color, material, size combinations)
- immersiveCommerce: Overall immersive shopping potential (premium feel, discovery value)

For each dimension, include:
- "missingOut": one crisp sentence on what revenue or customers the merchant loses TODAY without this XR feature
- "tip": one concrete, actionable step they can take immediately to improve this dimension

Also score the product image asset quality (1-10) for 3D asset generation readiness.

Respond ONLY with valid JSON matching exactly this structure:
{
  "category": "Wearables|Footwear|Jewellery|Home & Furniture|Beauty|Electronics|Accessories|Other",
  "scores": {
    "visualization3D": { "score": 8, "confidence": "High|Medium|Low", "reason": "one sentence", "missingOut": "one sentence", "tip": "one sentence" },
    "virtualTryOn": { "score": 7, "confidence": "High|Medium|Low", "reason": "one sentence", "missingOut": "one sentence", "tip": "one sentence" },
    "configurator": { "score": 6, "confidence": "High|Medium|Low", "reason": "one sentence", "missingOut": "one sentence", "tip": "one sentence" },
    "immersiveCommerce": { "score": 8, "confidence": "High|Medium|Low", "reason": "one sentence", "missingOut": "one sentence", "tip": "one sentence" }
  },
  "assetQuality": {
    "score": 7,
    "resolution": "High|Medium|Low",
    "background": "Clean|Cluttered|N/A",
    "angleCoverage": "Multiple|Single|N/A",
    "textureVisibility": "Excellent|Good|Poor|N/A",
    "recommendations": ["Use white background", "Add more angle shots"]
  }
}`;

async function scoreProduct(
  product: NormalizedProduct
): Promise<{ result: ScoringResponse; inputTokens: number; outputTokens: number }> {
  const userContent: ScoreContentPart[] = [];

  if (product.imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: product.imageUrl, detail: "low" },
    });
  }

  userContent.push({
    type: "text",
    text: `Product: ${product.title}
Type: ${product.productType || "Unknown"}
Tags: ${product.tags.join(", ") || "none"}
Price: $${product.price}
Variants: ${product.variantCount}
Description: ${product.description.slice(0, 300)}
${product.imageUrl ? "" : "No image available — score asset quality as N/A where applicable."}`,
  });

  const response = await getOpenAI().chat.completions.create({
    model: GPT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    max_tokens: 1200,
    temperature: 0.1,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;

  try {
    const parsed = normalizeScoringResponse(JSON.parse(raw), product);
    return { result: parsed, inputTokens, outputTokens };
  } catch {
    // Retry with simplified prompt
    const retry = await getOpenAI().chat.completions.create({
      model: GPT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON with category and scores for 3D visualization, virtualTryOn, configurator, immersiveCommerce (each: score 1-10, confidence High/Medium/Low, reason string) and assetQuality (score, resolution High/Medium/Low, background Clean/Cluttered/N/A, angleCoverage Multiple/Single/N/A, textureVisibility Excellent/Good/Poor/N/A, recommendations array).",
        },
        {
          role: "user",
          content: `Product: ${product.title}, Price: $${product.price}, Variants: ${product.variantCount}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.1,
    });
    const retryRaw = retry.choices[0]?.message?.content ?? "{}";
    let retryParsed: ScoringResponse;
    try {
      retryParsed = normalizeScoringResponse(JSON.parse(retryRaw), product);
    } catch {
      retryParsed = buildFallbackResponse(product);
    }
    return {
      result: retryParsed,
      inputTokens: inputTokens + (retry.usage?.prompt_tokens ?? 0),
      outputTokens: outputTokens + (retry.usage?.completion_tokens ?? 0),
    };
  }
}

const XR_PRIORITY_LABELS: Record<string, string> = {
  visualization3D: "3D Viewer",
  virtualTryOn: "Virtual Try-On",
  configurator: "Configurator",
  immersiveCommerce: "AR Placement",
};

function determineXRPriority(result: ScoringResponse): { xrPriority: string; xrPriorityReason: string } {
  const entries = Object.entries(result.scores) as [keyof ScoringResponse["scores"], ScoringResponse["scores"]["visualization3D"]][];
  const top = entries.reduce((a, b) => (b[1].score > a[1].score ? b : a));
  return {
    xrPriority: XR_PRIORITY_LABELS[top[0]] ?? "3D Viewer",
    xrPriorityReason: top[1].reason,
  };
}

export async function scoreAllProducts(
  products: NormalizedProduct[]
): Promise<{ scoredProducts: ScoredProduct[]; tokenUsage: TokenUsageEntry[] }> {
  const BATCH_SIZE = 5;
  const scoredProducts: ScoredProduct[] = [];
  const tokenUsage: TokenUsageEntry[] = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1;

    const results = await Promise.all(batch.map((p) => scoreProduct(p)));

    let batchInputTokens = 0;
    let batchOutputTokens = 0;

    results.forEach((r, idx) => {
      const product = batch[idx];
      const { result } = r;
      batchInputTokens += r.inputTokens;
      batchOutputTokens += r.outputTokens;

      const overallXRScore = computeOverallScore(
        {
          visualization3D: result.scores.visualization3D.score,
          virtualTryOn: result.scores.virtualTryOn.score,
          configurator: result.scores.configurator.score,
          immersiveCommerce: result.scores.immersiveCommerce.score,
        },
        result.category
      );

      const { xrPriority, xrPriorityReason } = determineXRPriority(result);
      scoredProducts.push({
        ...product,
        category: result.category,
        xrScores: result.scores,
        assetQuality: result.assetQuality,
        overallXRScore,
        xrPriority,
        xrPriorityReason,
        glbUrl: null,
        previewImageUrl: null,
      });
    });

    tokenUsage.push({
      operation: `scoring_batch_${batchIndex}`,
      model: GPT_MODEL,
      inputTokens: batchInputTokens,
      outputTokens: batchOutputTokens,
      costUsd: calcGPTCost(batchInputTokens, batchOutputTokens),
    });
  }

  return { scoredProducts, tokenUsage };
}
