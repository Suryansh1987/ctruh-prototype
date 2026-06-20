import type { ScoredProduct, ROIScenario } from "@/lib/types";

export const ROI_TRAFFIC_LEVELS = [5_000, 25_000, 100_000] as const;
export const ROI_BASE_CONVERSION_RATE = 0.02;
export const ROI_CONVERSION_LIFT_MULTIPLIER = 1.9;
export const ROI_BASE_RETURN_RATE = 0.3;
export const ROI_RETURN_REDUCTION_MULTIPLIER = 0.6;

export function computeXRReadinessScore(products: ScoredProduct[]): number {
  if (products.length === 0) return 0;

  const avgProductScore =
    products.reduce((sum, p) => sum + p.overallXRScore, 0) / products.length;

  const avgPrice =
    products.reduce((sum, p) => sum + p.price, 0) / products.length;
  const priceBonus = avgPrice > 100 ? 0.5 : avgPrice > 50 ? 0.25 : 0;

  const avgVariants =
    products.reduce((sum, p) => sum + p.variantCount, 0) / products.length;
  const variantBonus = avgVariants > 5 ? 0.3 : avgVariants > 2 ? 0.15 : 0;

  const avgAssetQuality =
    products.reduce((sum, p) => sum + p.assetQuality.score, 0) / products.length;
  const assetPenalty = avgAssetQuality < 5 ? -0.5 : 0;

  const raw = avgProductScore + priceBonus + variantBonus + assetPenalty;
  return Math.min(10, Math.max(1, Math.round(raw * 10) / 10));
}

export function computeTopOpportunities(products: ScoredProduct[]): string[] {
  const sorted = [...products].sort((a, b) => b.overallXRScore - a.overallXRScore);
  const top3 = sorted.slice(0, 3);

  return top3.map((p) => {
    const scores = p.xrScores;
    const best = Object.entries({
      "3D Visualization": scores.visualization3D.score,
      "Virtual Try-On": scores.virtualTryOn.score,
      Configurator: scores.configurator.score,
      "Immersive Shopping": scores.immersiveCommerce.score,
    }).sort(([, a], [, b]) => b - a)[0][0];

    return `${p.title} — strong ${best} opportunity (${p.overallXRScore}/10)`;
  });
}

export function computeStoreInsights(products: ScoredProduct[]): string[] {
  const insights: string[] = [];

  // Category concentration
  const catCounts: Record<string, number> = {};
  for (const p of products) catCounts[p.category] = (catCounts[p.category] ?? 0) + 1;
  const topCatEntry = Object.entries(catCounts).sort(([, a], [, b]) => b - a)[0];
  if (topCatEntry && topCatEntry[1] >= 3) {
    const pct = Math.round((topCatEntry[1] / products.length) * 100);
    insights.push(`${topCatEntry[1]} of ${products.length} products are ${topCatEntry[0]} (${pct}%) — a single XR experience type could cover most of your catalog immediately.`);
  }

  // Price tier
  const avgPrice = products.reduce((s, p) => s + p.price, 0) / products.length;
  if (avgPrice >= 100) {
    insights.push(`Average product price $${Math.round(avgPrice)} — at this price point XR typically pays for itself within 2–3 months of launch, driven by fewer returns alone.`);
  } else if (avgPrice >= 40) {
    insights.push(`At an average of $${Math.round(avgPrice)}, even a modest 5% conversion lift from 3D/AR adds meaningful revenue — the ROI case is straightforward.`);
  }

  // Asset readiness
  const cleanCount = products.filter((p) => p.assetQuality.background === "Clean").length;
  if (cleanCount >= Math.ceil(products.length * 0.5)) {
    insights.push(`${cleanCount} products already have clean backgrounds — they're ready for 3D model generation today, with no additional photography required.`);
  } else {
    const remaining = products.length - cleanCount;
    insights.push(`${remaining} products have complex or cluttered backgrounds — a single half-day photography session on white would unlock 3D conversion for your entire catalog.`);
  }

  // High-score products
  const highScore = products.filter((p) => p.overallXRScore >= 7);
  if (highScore.length > 0) {
    insights.push(`${highScore.length} product${highScore.length !== 1 ? "s" : ""} score${highScore.length === 1 ? "s" : ""} 7+ out of 10 for XR readiness — these are ideal candidates for an immediate low-risk pilot.`);
  }

  // Variant configurator opportunity
  const highVariants = products.filter((p) => p.variantCount >= 5);
  if (highVariants.length >= 2) {
    insights.push(`${highVariants.length} products have 5+ variants — a live configurator where shoppers toggle colors and materials could significantly reduce pre-purchase uncertainty.`);
  }

  return insights;
}

export function computeQuickWins(products: ScoredProduct[]): string[] {
  const sorted = [...products].sort((a, b) => b.overallXRScore - a.overallXRScore);
  const wins: string[] = [];

  const top = sorted[0];
  if (top) {
    wins.push(`Launch "${top.title}" as your XR pilot — highest overall score (${top.overallXRScore}/10) and best return on a focused test.`);
  }

  const tryOnCandidates = sorted.filter(
    (p) =>
      ["Wearables", "Footwear", "Accessories", "Jewellery"].includes(p.category) &&
      p.xrScores.virtualTryOn.score >= 7
  );
  if (tryOnCandidates.length >= 2) {
    wins.push(`${tryOnCandidates.length} products are strong virtual try-on candidates — this feature alone typically cuts return rates by 25–40% in ${tryOnCandidates[0].category.toLowerCase()}.`);
  }

  const cleanReady = sorted.filter(
    (p) => p.assetQuality.background === "Clean" && p.overallXRScore >= 6
  );
  if (cleanReady.length > 0) {
    wins.push(`${cleanReady.length} product${cleanReady.length !== 1 ? "s" : ""} with clean backgrounds can go live as interactive 3D models within a week — no extra photography required.`);
  }

  const configuratorReady = sorted.filter((p) => p.variantCount >= 5 && p.xrScores.configurator.score >= 6);
  if (configuratorReady.length > 0) {
    wins.push(`Add a 3D configurator to "${configuratorReady[0].title}" (${configuratorReady[0].variantCount} variants) — shoppers visualizing every option before checkout convert at 2× the average rate.`);
  }

  return wins;
}

export function computeROIScenarios(
  avgProductPrice: number
): ROIScenario[] {
  const xrConversionRate = ROI_BASE_CONVERSION_RATE * ROI_CONVERSION_LIFT_MULTIPLIER;
  const xrReturnRate = ROI_BASE_RETURN_RATE * ROI_RETURN_REDUCTION_MULTIPLIER;
  const aov = avgProductPrice > 0 ? avgProductPrice : 50;

  return ROI_TRAFFIC_LEVELS.map((traffic) => {
    const baseOrders = traffic * ROI_BASE_CONVERSION_RATE;
    const xrOrders = traffic * xrConversionRate;
    const additionalRevenue = (xrOrders - baseOrders) * aov;

    const baseReturns = baseOrders * ROI_BASE_RETURN_RATE * aov;
    const xrReturns = xrOrders * xrReturnRate * aov;
    const returnSavings = baseReturns - xrReturns;

    const totalMonthlyImpact = additionalRevenue + returnSavings;

    return {
      monthlyTraffic: traffic,
      additionalRevenue: Math.round(additionalRevenue),
      returnSavings: Math.round(returnSavings),
      totalMonthlyImpact: Math.round(totalMonthlyImpact),
      annualImpact: Math.round(totalMonthlyImpact * 12),
    };
  });
}
