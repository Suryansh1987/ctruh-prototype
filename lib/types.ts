export interface NormalizedProduct {
  id: number;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  price: number;
  variantCount: number;
  imageUrl: string | null;
}

export type Confidence = "High" | "Medium" | "Low";

export interface DimensionScore {
  score: number;
  confidence: Confidence;
  reason: string;
  missingOut: string;
  tip: string;
}

export interface AssetQuality {
  score: number;
  resolution: "High" | "Medium" | "Low";
  background: "Clean" | "Cluttered" | "N/A";
  angleCoverage: "Multiple" | "Single" | "N/A";
  textureVisibility: "Excellent" | "Good" | "Poor" | "N/A";
  recommendations: string[];
}

export interface XRScores {
  visualization3D: DimensionScore;
  virtualTryOn: DimensionScore;
  configurator: DimensionScore;
  immersiveCommerce: DimensionScore;
}

export interface ScoredProduct extends NormalizedProduct {
  category: string;
  xrScores: XRScores;
  assetQuality: AssetQuality;
  overallXRScore: number;
  xrPriority: string;
  xrPriorityReason: string;
  glbUrl: string | null;
  previewImageUrl: string | null;
}

export interface ROIScenario {
  monthlyTraffic: number;
  additionalRevenue: number;
  returnSavings: number;
  totalMonthlyImpact: number;
  annualImpact: number;
}

export interface XRReport {
  storeName: string;
  storeUrl: string;
  analyzedAt: string;
  xrReadinessScore: number;
  productCount: number;
  categories: string[];
  topOpportunities: string[];
  storeInsights: string[];
  quickWins: string[];
  products: ScoredProduct[];
  roiScenarios: ROIScenario[];
  avgProductPrice: number;
}

export interface TokenUsageEntry {
  operation: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  imagesGenerated?: number;
  costUsd: number;
}

// Cost constants
export const GPT4O_INPUT_COST_PER_TOKEN = 2.5 / 1_000_000;
export const GPT4O_OUTPUT_COST_PER_TOKEN = 10.0 / 1_000_000;
export const DALLE3_COST_PER_IMAGE = 0.04;

export function calcGPTCost(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * GPT4O_INPUT_COST_PER_TOKEN +
    outputTokens * GPT4O_OUTPUT_COST_PER_TOKEN
  );
}

export function calcDalleCost(images: number): number {
  return images * DALLE3_COST_PER_IMAGE;
}
