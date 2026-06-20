import type { ScoredProduct, ROIScenario } from "@/lib/types";

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

export function computeROIScenarios(
  avgProductPrice: number
): ROIScenario[] {
  const trafficLevels = [5_000, 25_000, 100_000];
  const baseConversionRate = 0.02;
  const xrConversionRate = baseConversionRate * 1.9; // 90% lift
  const baseReturnRate = 0.3;
  const xrReturnRate = baseReturnRate * 0.6; // 40% reduction
  const aov = avgProductPrice > 0 ? avgProductPrice : 50;

  return trafficLevels.map((traffic) => {
    const baseOrders = traffic * baseConversionRate;
    const xrOrders = traffic * xrConversionRate;
    const additionalRevenue = (xrOrders - baseOrders) * aov;

    const baseReturns = baseOrders * baseReturnRate * aov;
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
