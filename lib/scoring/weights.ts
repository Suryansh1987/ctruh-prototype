export type Category =
  | "Wearables"
  | "Footwear"
  | "Jewellery"
  | "Home & Furniture"
  | "Beauty"
  | "Electronics"
  | "Accessories"
  | "Other";

export interface CategoryWeights {
  visualization3D: number;
  virtualTryOn: number;
  configurator: number;
  immersiveCommerce: number;
}

export const CATEGORY_WEIGHTS: Record<string, CategoryWeights> = {
  Wearables: { visualization3D: 0.2, virtualTryOn: 0.4, configurator: 0.2, immersiveCommerce: 0.2 },
  Footwear: { visualization3D: 0.2, virtualTryOn: 0.4, configurator: 0.2, immersiveCommerce: 0.2 },
  Jewellery: { visualization3D: 0.35, virtualTryOn: 0.3, configurator: 0.15, immersiveCommerce: 0.2 },
  "Home & Furniture": { visualization3D: 0.4, virtualTryOn: 0.05, configurator: 0.35, immersiveCommerce: 0.2 },
  Beauty: { visualization3D: 0.3, virtualTryOn: 0.25, configurator: 0.1, immersiveCommerce: 0.35 },
  Electronics: { visualization3D: 0.4, virtualTryOn: 0.05, configurator: 0.35, immersiveCommerce: 0.2 },
  Accessories: { visualization3D: 0.25, virtualTryOn: 0.3, configurator: 0.2, immersiveCommerce: 0.25 },
  Other: { visualization3D: 0.25, virtualTryOn: 0.25, configurator: 0.25, immersiveCommerce: 0.25 },
};

export function getWeights(category: string): CategoryWeights {
  return CATEGORY_WEIGHTS[category] ?? CATEGORY_WEIGHTS["Other"];
}

export function computeOverallScore(
  scores: { visualization3D: number; virtualTryOn: number; configurator: number; immersiveCommerce: number },
  category: string
): number {
  const w = getWeights(category);
  const weighted =
    scores.visualization3D * w.visualization3D +
    scores.virtualTryOn * w.virtualTryOn +
    scores.configurator * w.configurator +
    scores.immersiveCommerce * w.immersiveCommerce;
  return Math.round(weighted * 10) / 10;
}
