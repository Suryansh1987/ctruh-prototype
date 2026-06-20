import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { XRReport, ScoredProduct, Confidence } from "@/lib/types";
import {
  ROI_BASE_CONVERSION_RATE,
  ROI_BASE_RETURN_RATE,
  ROI_CONVERSION_LIFT_MULTIPLIER,
  ROI_RETURN_REDUCTION_MULTIPLIER,
  ROI_TRAFFIC_LEVELS,
} from "@/lib/scoring/xr-readiness";

const BLUE = "#0057ff";
const BLUE_DEEP = "#001aff";
const BLUE_LIGHT = "#e8f0ff";
const BLUE_BORDER = "#d0deff";
const GREEN = "#00c48c";
const AMBER = "#d97706";
const RED = "#dc2626";
const DARK_BG = "#060d22";
const GRAY_100 = "#F3F4F6";
const GRAY_300 = "#D1D5DB";
const GRAY_600 = "#4B5563";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#FFFFFF", padding: 0 },
  coverPage: { fontFamily: "Helvetica", backgroundColor: DARK_BG, padding: 0 },

  // Cover
  coverInner: { padding: 48, flex: 1, justifyContent: "space-between" },
  coverTag: {
    fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase",
    marginBottom: 8,
  },
  coverBrand: { fontSize: 28, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.58)", marginBottom: 48 },
  coverStoreName: {
    fontSize: 22, color: "#FFFFFF", fontFamily: "Helvetica-Bold", marginBottom: 8,
  },
  coverStoreUrl: { fontSize: 10, color: "#6ba3ff", marginBottom: 32 },
  scoreBox: {
    backgroundColor: BLUE, borderRadius: 12, padding: 20,
    alignSelf: "flex-start", marginBottom: 24,
  },
  scoreLabel: { fontSize: 9, color: BLUE_LIGHT, letterSpacing: 1.5, marginBottom: 4 },
  scoreValue: { fontSize: 48, color: "#FFFFFF", fontFamily: "Helvetica-Bold" },
  scoreSuffix: { fontSize: 20, color: BLUE_LIGHT },
  coverFooter: { borderTopColor: "rgba(255,255,255,0.12)", borderTopWidth: 1, paddingTop: 16 },
  coverFooterText: { fontSize: 9, color: "rgba(255,255,255,0.24)" },
  coverFooterLink: { fontSize: 9, color: "#6ba3ff", textDecoration: "none" },

  // Section pages
  pageInner: { padding: 40 },
  sectionHeader: {
    backgroundColor: BLUE, paddingHorizontal: 40, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: 14, color: "#FFFFFF", fontFamily: "Helvetica-Bold", letterSpacing: 0.5,
  },
  sectionHeaderSub: { fontSize: 9, color: BLUE_LIGHT, marginLeft: "auto" },
  pageNumber: { fontSize: 8, color: GRAY_600, textAlign: "right", marginBottom: 20 },

  // Overview
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: BLUE_LIGHT, borderRadius: 8, padding: 16,
    borderLeftColor: BLUE, borderLeftWidth: 3,
  },
  statLabel: { fontSize: 8, color: GRAY_600, marginBottom: 4, letterSpacing: 1 },
  statValue: { fontSize: 24, color: BLUE_DEEP, fontFamily: "Helvetica-Bold" },
  statUnit: { fontSize: 10, color: GRAY_600 },

  // Opportunities
  oppTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLUE_DEEP, marginBottom: 12 },
  oppItem: {
    flexDirection: "row", alignItems: "flex-start", marginBottom: 8,
    backgroundColor: BLUE_LIGHT, borderRadius: 6, padding: 10,
  },
  oppDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE,
    marginTop: 3, marginRight: 8, flexShrink: 0,
  },
  oppText: { fontSize: 9, color: BLUE_DEEP, flex: 1 },

  // Heatmap table
  tableHeader: {
    flexDirection: "row", backgroundColor: BLUE_DEEP,
    paddingVertical: 8, paddingHorizontal: 4,
  },
  tableHeaderCell: { fontSize: 8, color: "#FFFFFF", fontFamily: "Helvetica-Bold", textAlign: "center" },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 4, borderBottomColor: GRAY_300, borderBottomWidth: 0.5 },
  tableRowAlt: { backgroundColor: GRAY_100 },
  tableCell: { fontSize: 8, color: "#1F2937", textAlign: "center" },
  tableCellLeft: { fontSize: 8, color: "#1F2937", textAlign: "left" },
  scoreChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "center" },
  scoreChipText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#FFFFFF" },

  // Product detail page
  productPageInner: { padding: 24 },
  productTitle: {
    fontSize: 16, fontFamily: "Helvetica-Bold", color: BLUE_DEEP, marginBottom: 4,
  },
  productMeta: { fontSize: 9, color: GRAY_600, marginBottom: 12 },
  productReason: { fontSize: 8.5, color: GRAY_600, lineHeight: 1.4, marginBottom: 12 },

  // Before / After comparison
  baSection: { marginBottom: 16 },
  baSectionLabel: {
    fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 8,
  },
  baRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  baSide: { flex: 1, alignItems: "center" },
  baTag: {
    fontSize: 7, fontFamily: "Helvetica-Bold", letterSpacing: 1,
    textTransform: "uppercase", color: GRAY_600,
    backgroundColor: GRAY_100, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6, alignSelf: "center",
  },
  baTagAfter: { color: BLUE, backgroundColor: BLUE_LIGHT },
  baImgBox: {
    width: "100%", height: 100, backgroundColor: GRAY_100,
    borderRadius: 8, overflow: "hidden", borderColor: BLUE_BORDER, borderWidth: 1,
  },
  baImg: { width: "100%", height: 100, objectFit: "contain" },
  baPlaceholder: {
    width: "100%", height: 128, backgroundColor: BLUE_LIGHT,
    borderRadius: 8, borderColor: BLUE_BORDER, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  baPlaceholderText: { fontSize: 8, color: BLUE, textAlign: "center" },
  baCaption: { fontSize: 7, color: GRAY_600, textAlign: "center", marginTop: 5 },
  baArrow: { width: 28, alignItems: "center", justifyContent: "center", paddingTop: 50 },
  baArrowText: { fontSize: 18, color: BLUE, fontFamily: "Helvetica-Bold" },

  scoresBlock: {},
  dimensionRow: {
    marginBottom: 8, backgroundColor: GRAY_100, borderRadius: 6, padding: 8,
  },
  dimensionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  dimensionName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1F2937", flex: 1 },
  dimensionScore: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  confidenceBadge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6 },
  confidenceBadgeText: { fontSize: 7, color: "#FFFFFF" },
  dimensionReason: { fontSize: 7.5, color: GRAY_600, lineHeight: 1.35 },
  progressBar: { height: 4, backgroundColor: GRAY_300, borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, borderRadius: 2 },

  // Asset quality
  assetBox: {
    marginTop: 16, backgroundColor: BLUE_LIGHT, borderRadius: 6, padding: 12,
    borderLeftColor: BLUE, borderLeftWidth: 3,
  },
  assetTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLUE_DEEP, marginBottom: 8 },
  assetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  assetItem: { width: "48%" },
  assetLabel: { fontSize: 7, color: GRAY_600 },
  assetValue: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1F2937" },
  assetRecs: { marginTop: 8 },
  assetRec: { fontSize: 8, color: GRAY_600, marginBottom: 2 },
  browserButton: {
    fontSize: 8,
    color: "#FFFFFF",
    backgroundColor: BLUE,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    textDecoration: "none",
  },

  // ROI
  roiIntro: { fontSize: 9, color: GRAY_600, marginBottom: 16, lineHeight: 1.5 },
  roiTable: { borderRadius: 6, overflow: "hidden" },
  roiTableHeader: { flexDirection: "row", backgroundColor: BLUE_DEEP, padding: 10 },
  roiTableHeaderCell: { fontSize: 9, color: "#FFFFFF", fontFamily: "Helvetica-Bold", flex: 1, textAlign: "center" },
  roiTableRow: { flexDirection: "row", padding: 10, borderBottomColor: GRAY_300, borderBottomWidth: 0.5 },
  roiTableRowAlt: { backgroundColor: GRAY_100 },
  roiTableCell: { fontSize: 9, color: "#1F2937", flex: 1, textAlign: "center" },
  roiHighlight: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, flex: 1, textAlign: "center" },
  roiBenchmarks: {
    marginTop: 16, flexDirection: "row", gap: 12,
  },
  roiBenchmark: {
    flex: 1, backgroundColor: GRAY_100, borderRadius: 6, padding: 10, alignItems: "center",
  },
  roiBenchmarkValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN },
  roiBenchmarkLabel: { fontSize: 8, color: GRAY_600, textAlign: "center", marginTop: 2 },

  // Ctruh mapping
  mappingRow: {
    marginBottom: 12, backgroundColor: BLUE_LIGHT, borderRadius: 8, padding: 14,
  },
  mappingProduct: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BLUE_DEEP, marginBottom: 4 },
  mappingTools: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  mappingToolBadge: {
    backgroundColor: BLUE, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  mappingToolText: { fontSize: 8, color: "#FFFFFF" },
  mappingToolDesc: { fontSize: 7, color: GRAY_600, marginBottom: 8 },
  roadmapRow: { flexDirection: "row", gap: 8 },
  roadmapWeek: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 4, padding: 8, borderColor: BLUE_BORDER, borderWidth: 0.5 },
  roadmapWeekLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 4 },
  roadmapWeekText: { fontSize: 7, color: GRAY_600 },

});

// Helpers
function scoreColor(score: number): string {
  if (score >= 7) return GREEN;
  if (score >= 4) return AMBER;
  return RED;
}

function confidenceColor(c: string): string {
  if (c === "High" || c === "Strong Signal") return GREEN;
  if (c === "Medium" || c === "Good Signal") return AMBER;
  return RED;
}

function confidenceLabel(confidence: Confidence): string {
  if (confidence === "High") return "Strong Signal";
  if (confidence === "Medium") return "Good Signal";
  return "Weak Signal";
}

function getBusinessReason(product: ScoredProduct): string {
  const entries = [
    { key: "virtualTryOn", score: product.xrScores.virtualTryOn.score },
    { key: "visualization3D", score: product.xrScores.visualization3D.score },
    { key: "configurator", score: product.xrScores.configurator.score },
    { key: "immersiveCommerce", score: product.xrScores.immersiveCommerce.score },
  ].sort((a, b) => b.score - a.score);

  switch (entries[0]?.key) {
    case "virtualTryOn":
      return "Customers can't tell how this will fit from a flat photo. Virtual try-on removes that doubt and directly reduces returns.";
    case "visualization3D":
      return "This product has details that a flat image can't show. Letting customers rotate and inspect it in 3D builds confidence to buy.";
    case "configurator":
      return "This product comes in multiple styles or colors. Letting customers switch between them in real time dramatically increases time on page and purchase intent.";
    default:
      return "At this price point, customers need to feel confident before buying. An immersive experience gives them that confidence without needing to visit a store.";
  }
}

function toolDescription(tool: string): string {
  if (tool === "VersaAI") return "Converts your product photos into interactive 3D models";
  if (tool === "Commverse Studio") return "Your virtual storefront, live in a browser, no app needed";
  return "Lets customers switch colors, materials, and styles in real time";
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString()}`;
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function getGeneratedProducts(report: XRReport, limit = 2): ScoredProduct[] {
  return [...report.products]
    .filter((product) => product.previewImageUrl || product.glbUrl)
    .sort((a, b) => b.overallXRScore - a.overallXRScore)
    .slice(0, limit);
}

function getRecommendedProducts(report: XRReport, limit = 2): ScoredProduct[] {
  const generated = getGeneratedProducts(report, limit);
  if (generated.length > 0) return generated;

  return [...report.products]
    .sort((a, b) => b.overallXRScore - a.overallXRScore)
    .slice(0, limit);
}

// --- Sub-components ---

function ScoreChip({ score }: { score: number }) {
  return (
    <View style={[s.scoreChip, { backgroundColor: scoreColor(score) }]}>
      <Text style={s.scoreChipText}>{score.toFixed(1)}</Text>
    </View>
  );
}

function DimensionBlock({
  label,
  score,
  confidence,
  reason,
  missingOut,
  tip,
}: {
  label: string;
  score: number;
  confidence: string;
  reason: string;
  missingOut?: string;
  tip?: string;
}) {
  const color = scoreColor(score);
  const fillPct = `${(score / 10) * 100}%`;

  return (
    <View style={s.dimensionRow}>
      <View style={s.dimensionHeader}>
        <Text style={s.dimensionName}>{label}</Text>
        <Text style={[s.dimensionScore, { color }]}>{score}/10</Text>
        <View style={[s.confidenceBadge, { backgroundColor: confidenceColor(confidence) }]}>
          <Text style={s.confidenceBadgeText}>{confidence}</Text>
        </View>
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: fillPct as string, backgroundColor: color }]} />
      </View>
      <Text style={s.dimensionReason}>{clampText(reason, 90)}</Text>
      {missingOut ? (
        <View style={{ flexDirection: "row", marginTop: 3, gap: 3 }}>
          <Text style={{ fontSize: 6, color: RED, fontFamily: "Helvetica-Bold", flexShrink: 0 }}>↓ </Text>
          <Text style={{ fontSize: 6, color: GRAY_600, flex: 1 }}>{clampText(missingOut, 85)}</Text>
        </View>
      ) : null}
      {tip ? (
        <View style={{ flexDirection: "row", marginTop: 2, gap: 3 }}>
          <Text style={{ fontSize: 6, color: GREEN, fontFamily: "Helvetica-Bold", flexShrink: 0 }}>→ </Text>
          <Text style={{ fontSize: 6, color: GRAY_600, flex: 1 }}>{clampText(tip, 85)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function BeforeAfterBlock({ product }: { product: ScoredProduct }) {
  const hasOriginal = Boolean(product.imageUrl);
  const hasPreview = Boolean(product.previewImageUrl);
  const hasGlb = Boolean(product.glbUrl);
  if (!hasOriginal && !hasPreview) return null;

  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://ctruh.com";
  const viewerUrl = hasGlb
    ? `${appUrl}/viewer?glb=${encodeURIComponent(product.glbUrl!)}&name=${encodeURIComponent(product.title)}`
    : null;

  return (
    <View style={s.baSection}>
      <Text style={s.baSectionLabel}>What XR Would Do For This Product</Text>
      <View style={s.baRow}>
        <View style={s.baSide}>
          <View style={s.baTag}><Text style={{ fontSize: 7, color: GRAY_600 }}>BEFORE</Text></View>
          {hasOriginal ? (
            <View style={s.baImgBox}>
              <Image style={s.baImg} src={product.imageUrl!} />
            </View>
          ) : (
            <View style={s.baPlaceholder}>
              <Text style={s.baPlaceholderText}>No photo</Text>
            </View>
          )}
          <Text style={s.baCaption}>Current flat photo</Text>
        </View>

        <View style={s.baArrow}>
          <Text style={s.baArrowText}>→</Text>
        </View>

        <View style={s.baSide}>
          <View style={[s.baTag, s.baTagAfter]}><Text style={{ fontSize: 7, color: BLUE }}>AFTER XR</Text></View>
          {hasPreview ? (
            <View style={s.baImgBox}>
              <Image style={s.baImg} src={product.previewImageUrl!} />
            </View>
          ) : (
            <View style={s.baPlaceholder}>
              <Text style={s.baPlaceholderText}>3D model{"\n"}generated</Text>
            </View>
          )}
          <Text style={s.baCaption}>3D model — rotate, zoom, place in AR</Text>
        </View>
      </View>

      {viewerUrl && (
        <View style={{ marginTop: 10, alignItems: "center" }}>
          <Link src={viewerUrl} style={s.browserButton}>
            Open in Browser
          </Link>
        </View>
      )}
    </View>
  );
}

function CoverPage({ report }: { report: XRReport }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={s.coverInner}>
        <View>
          <Text style={s.coverTag}>Powered by Ctruh</Text>
          <Text style={s.coverBrand}>XR (3D and AR shopping experiences) Opportunity Report</Text>
          <Text style={s.coverSubtitle}>
            Built to help brands prioritize 3D, AR, and try-on opportunities
          </Text>
        </View>

        <View>
          <Text style={s.coverStoreName}>{report.storeName}</Text>
          <Text style={s.coverStoreUrl}>{report.storeUrl}</Text>

          <View style={s.scoreBox}>
            <Text style={s.scoreLabel}>OPPORTUNITY SCORE</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Text style={s.scoreValue}>{report.xrReadinessScore.toFixed(1)}</Text>
              <Text style={s.scoreSuffix}> /10</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 20, marginBottom: 16 }}>
            <View>
              <Text style={[s.coverTag, { marginBottom: 2 }]}>PRODUCTS ANALYZED</Text>
              <Text style={{ fontSize: 20, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }}>
                {report.productCount}
              </Text>
            </View>
            <View>
              <Text style={[s.coverTag, { marginBottom: 2 }]}>CATEGORIES</Text>
              <Text style={{ fontSize: 20, color: "#FFFFFF", fontFamily: "Helvetica-Bold" }}>
                {report.categories.length}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>
            Generated {new Date(report.analyzedAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })} · Powered by Ctruh · ctruh.com · Built to help brands discover their XR opportunity
          </Text>
          <Text style={[s.coverFooterText, { marginTop: 6 }]}>
            Made by{" "}
            <Link src="https://www.linkedin.com/in/suryansh-singh-972754242/" style={s.coverFooterLink}>
              Suryansh Singh
            </Link>
          </Text>
        </View>
      </View>
    </Page>
  );
}

function OverviewPage({ report }: { report: XRReport }) {
  const conversionLiftPct = Math.round((ROI_CONVERSION_LIFT_MULTIPLIER - 1) * 100);
  const returnReductionPct = Math.round((1 - ROI_RETURN_REDUCTION_MULTIPLIER) * 100);

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionHeaderText}>Store Overview</Text>
        <Text style={s.sectionHeaderSub}>Page 2</Text>
      </View>
      <View style={s.pageInner}>
        <Text style={[s.oppTitle, { fontSize: 14, marginBottom: 8 }]}>
          {report.storeName} has {report.productCount} products ranked for 3D and AR shopping experiences
        </Text>
        <Text style={[s.roiIntro, { marginBottom: 18 }]}>
          This report ranks where 3D viewing, AR, and virtual try-on could create the most value, then applies benchmark assumptions of {conversionLiftPct}% higher conversion and {returnReductionPct}% fewer returns.
        </Text>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>OPPORTUNITY SCORE</Text>
            <Text style={[s.statValue, { color: scoreColor(report.xrReadinessScore) }]}>
              {report.xrReadinessScore.toFixed(1)}
            </Text>
            <Text style={s.statUnit}>out of 10</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>PRODUCTS</Text>
            <Text style={s.statValue}>{report.productCount}</Text>
            <Text style={s.statUnit}>analyzed</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>AVG. PRICE</Text>
            <Text style={s.statValue}>{formatCurrency(Math.round(report.avgProductPrice))}</Text>
            <Text style={s.statUnit}>per product</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statLabel}>CATEGORIES</Text>
            <Text style={s.statValue}>{report.categories.length}</Text>
            <Text style={s.statUnit}>detected</Text>
          </View>
        </View>

        <Text style={[s.oppTitle, { marginTop: 8 }]}>Categories Detected</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
          {report.categories.map((cat) => (
            <View key={cat} style={{ backgroundColor: BLUE_LIGHT, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 9, color: BLUE_DEEP }}>{cat}</Text>
            </View>
          ))}
        </View>

        <Text style={s.oppTitle}>Where 3D and try-on could help most</Text>
        {report.topOpportunities.map((opp, i) => (
          <View key={i} style={s.oppItem}>
            <View style={s.oppDot} />
            <Text style={s.oppText}>{clampText(opp, 92)}</Text>
          </View>
        ))}

        {report.storeInsights?.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.oppTitle}>Store insights</Text>
            {report.storeInsights.slice(0, 2).map((insight, i) => (
              <View key={i} style={[s.oppItem, { backgroundColor: BLUE_LIGHT, paddingVertical: 7 }]}>
                <View style={[s.oppDot, { backgroundColor: BLUE }]} />
                <Text style={s.oppText}>{clampText(insight, 88)}</Text>
              </View>
            ))}
          </View>
        )}

        {report.quickWins?.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={[s.oppTitle, { color: GREEN }]}>Quick wins — start here</Text>
            {report.quickWins.slice(0, 2).map((win, i) => (
              <View key={i} style={[s.oppItem, { backgroundColor: "#e8fff7", borderRadius: 6, paddingVertical: 7 }]}>
                <View style={[s.oppDot, { backgroundColor: GREEN }]} />
                <Text style={[s.oppText, { color: "#005738" }]}>{clampText(win, 88)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

function HeatmapPage({ products }: { products: ScoredProduct[] }) {
  const sorted = [...products].sort((a, b) => b.overallXRScore - a.overallXRScore).slice(0, 15);

  const colWidths = { name: "32%", cat: "13%", score: "9%", viz: "9%", tryon: "9%", config: "9%", immersive: "9%", asset: "10%" };

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionHeaderText}>Your Products — Ranked by XR Opportunity</Text>
        <Text style={s.sectionHeaderSub}>Page 3</Text>
      </View>
      <View style={s.pageInner}>
        <Text style={[s.roiIntro, { marginBottom: 10 }]}>
          Green = strong opportunity. Yellow = possible. Red = not suited.
        </Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderCell, { width: colWidths.name, textAlign: "left" }]}>Product</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.cat }]}>Category</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.score }]}>XR Score</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.viz }]}>Looks Better in 3D?</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.tryon }]}>Virtual Try-On Ready?</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.config }]}>Style Switcher Ready?</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.immersive }]}>High-Value Enough?</Text>
          <Text style={[s.tableHeaderCell, { width: colWidths.asset }]}>Image Quality</Text>
        </View>

        {sorted.map((p, i) => (
          <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.tableCellLeft, { width: colWidths.name }]}>
              {p.title.length > 28 ? p.title.slice(0, 28) + "…" : p.title}
            </Text>
            <Text style={[s.tableCell, { width: colWidths.cat }]}>
              {p.category.length > 12 ? p.category.slice(0, 12) + "…" : p.category}
            </Text>
            <View style={{ width: colWidths.score, alignItems: "center" }}>
              <ScoreChip score={p.overallXRScore} />
            </View>
            <View style={{ width: colWidths.viz, alignItems: "center" }}>
              <ScoreChip score={p.xrScores.visualization3D.score} />
            </View>
            <View style={{ width: colWidths.tryon, alignItems: "center" }}>
              <ScoreChip score={p.xrScores.virtualTryOn.score} />
            </View>
            <View style={{ width: colWidths.config, alignItems: "center" }}>
              <ScoreChip score={p.xrScores.configurator.score} />
            </View>
            <View style={{ width: colWidths.immersive, alignItems: "center" }}>
              <ScoreChip score={p.xrScores.immersiveCommerce.score} />
            </View>
            <View style={{ width: colWidths.asset, alignItems: "center" }}>
              <ScoreChip score={p.assetQuality.score} />
            </View>
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          {[{ color: GREEN, label: "7-10: Strong opportunity" }, { color: AMBER, label: "4-6: Possible" }, { color: RED, label: "1-3: Not suited" }].map((item) => (
            <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color }} />
              <Text style={{ fontSize: 8, color: GRAY_600 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

function ProductDetailPage({
  product,
  pageNum,
}: {
  product: ScoredProduct;
  pageNum: number;
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionHeaderText}>Top Product Analysis</Text>
        <Text style={s.sectionHeaderSub}>Page {pageNum}</Text>
      </View>
      <View style={s.productPageInner}>
        <Text style={s.productTitle}>{product.title}</Text>
        <Text style={s.productMeta}>
          {product.category} · ${product.price} · {product.variantCount} variant{product.variantCount !== 1 ? "s" : ""} · XR Score: {product.overallXRScore}/10
        </Text>
        <Text style={s.productReason}>{clampText(getBusinessReason(product), 170)}</Text>

        <BeforeAfterBlock product={product} />

        <View style={[s.scoresBlock, { flexDirection: "row", gap: 8, marginBottom: 10 }]}>
          <View style={{ flex: 1 }}>
            <DimensionBlock
              label="3D Viewing Impact"
              score={product.xrScores.visualization3D.score}
              confidence={confidenceLabel(product.xrScores.visualization3D.confidence)}
              reason={product.xrScores.visualization3D.reason}
              missingOut={product.xrScores.visualization3D.missingOut}
              tip={product.xrScores.visualization3D.tip}
            />
            <DimensionBlock
              label="Style Switching Value"
              score={product.xrScores.configurator.score}
              confidence={confidenceLabel(product.xrScores.configurator.confidence)}
              reason={product.xrScores.configurator.reason}
              missingOut={product.xrScores.configurator.missingOut}
              tip={product.xrScores.configurator.tip}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DimensionBlock
              label="Try-On Potential"
              score={product.xrScores.virtualTryOn.score}
              confidence={confidenceLabel(product.xrScores.virtualTryOn.confidence)}
              reason={product.xrScores.virtualTryOn.reason}
              missingOut={product.xrScores.virtualTryOn.missingOut}
              tip={product.xrScores.virtualTryOn.tip}
            />
            <DimensionBlock
              label="High-Ticket Confidence"
              score={product.xrScores.immersiveCommerce.score}
              confidence={confidenceLabel(product.xrScores.immersiveCommerce.confidence)}
              reason={product.xrScores.immersiveCommerce.reason}
              missingOut={product.xrScores.immersiveCommerce.missingOut}
              tip={product.xrScores.immersiveCommerce.tip}
            />
          </View>
        </View>

        <View style={s.assetBox}>
          <Text style={s.assetTitle}>
            Image Readiness for 3D Conversion: {product.assetQuality.score}/10
          </Text>
          <Text style={[s.assetRec, { marginBottom: 8 }]}>
            How ready your product photos are to be converted into 3D models by Ctruh&apos;s VersaAI engine
          </Text>
          <View style={s.assetGrid}>
            <View style={s.assetItem}>
              <Text style={s.assetLabel}>PHOTO QUALITY</Text>
              <Text style={s.assetValue}>{product.assetQuality.resolution}</Text>
            </View>
            <View style={s.assetItem}>
              <Text style={s.assetLabel}>BACKGROUND CLEANLINESS</Text>
              <Text style={s.assetValue}>{product.assetQuality.background}</Text>
            </View>
            <View style={s.assetItem}>
              <Text style={s.assetLabel}>NUMBER OF ANGLES</Text>
              <Text style={s.assetValue}>{product.assetQuality.angleCoverage}</Text>
            </View>
            <View style={s.assetItem}>
              <Text style={s.assetLabel}>MATERIAL DETAIL</Text>
              <Text style={s.assetValue}>{product.assetQuality.textureVisibility}</Text>
            </View>
          </View>
          {product.assetQuality.recommendations.length > 0 && (
            <View style={s.assetRecs}>
              <Text style={[s.assetLabel, { marginBottom: 4 }]}>RECOMMENDATIONS</Text>
              {product.assetQuality.recommendations.slice(0, 2).map((r, i) => (
                <Text key={i} style={s.assetRec}>· {clampText(r, 80)}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
    </Page>
  );
}

function ROIPage({ report, pageNum }: { report: XRReport; pageNum: number }) {
  const conversionLiftPct = Math.round((ROI_CONVERSION_LIFT_MULTIPLIER - 1) * 100);
  const returnReductionPct = Math.round((1 - ROI_RETURN_REDUCTION_MULTIPLIER) * 100);

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionHeaderText}>What Could XR Mean for Your Revenue?</Text>
        <Text style={s.sectionHeaderSub}>Page {pageNum}</Text>
      </View>
      <View style={s.pageInner}>
        <Text style={s.roiIntro}>
          This estimate uses benchmark traffic scenarios of {ROI_TRAFFIC_LEVELS.map((level) => level.toLocaleString()).join(" / ")} monthly visitors, your store&apos;s analyzed average product price of {formatCurrency(Math.round(report.avgProductPrice))}, a baseline conversion rate of {Math.round(ROI_BASE_CONVERSION_RATE * 100)}%, and a baseline return rate of {Math.round(ROI_BASE_RETURN_RATE * 100)}%.
        </Text>

        <View style={s.roiBenchmarks}>
          <View style={s.roiBenchmark}>
            <Text style={s.roiBenchmarkValue}>{conversionLiftPct}%</Text>
            <Text style={s.roiBenchmarkLabel}>Higher Conversion{"\n"}Rate</Text>
          </View>
          <View style={s.roiBenchmark}>
            <Text style={s.roiBenchmarkValue}>{returnReductionPct}%</Text>
            <Text style={s.roiBenchmarkLabel}>Fewer{"\n"}Returns</Text>
          </View>
          <View style={s.roiBenchmark}>
            <Text style={[s.roiBenchmarkValue, { color: BLUE }]}>{report.xrReadinessScore.toFixed(1)}/10</Text>
            <Text style={s.roiBenchmarkLabel}>Your Opportunity{"\n"}Score</Text>
          </View>
        </View>

        <View style={[s.roiTable, { marginTop: 20 }]}>
          <View style={s.roiTableHeader}>
            <Text style={s.roiTableHeaderCell}>Your Monthly Visitors</Text>
            <Text style={s.roiTableHeaderCell}>Extra Revenue Per Month</Text>
            <Text style={s.roiTableHeaderCell}>Saved in Returns Per Month</Text>
            <Text style={s.roiTableHeaderCell}>Total Monthly Gain</Text>
            <Text style={s.roiTableHeaderCell}>Total Annual Gain</Text>
          </View>
          {report.roiScenarios.map((row, i) => (
            <View key={i} style={[s.roiTableRow, i % 2 === 1 ? s.roiTableRowAlt : {}]}>
              <Text style={s.roiTableCell}>{row.monthlyTraffic.toLocaleString()}</Text>
              <Text style={s.roiTableCell}>{formatCurrency(row.additionalRevenue)}</Text>
              <Text style={s.roiTableCell}>{formatCurrency(row.returnSavings)}</Text>
              <Text style={s.roiHighlight}>{formatCurrency(row.totalMonthlyImpact)}</Text>
              <Text style={[s.roiHighlight, { fontFamily: "Helvetica-Bold" }]}>
                {formatCurrency(row.annualImpact)}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[s.assetRec, { marginTop: 10 }]}>
          Estimated monthly impact = conversion lift revenue + return savings. These benchmarks are directional, not guaranteed.
        </Text>
      </View>
    </Page>
  );
}

function MappingPage({
  report,
  products,
  pageNum,
}: {
  report: XRReport;
  products: ScoredProduct[];
  pageNum: number;
}) {

  function getCtruhTool(product: ScoredProduct): string[] {
    const tools: string[] = [];
    const { xrScores } = product;
    if (xrScores.visualization3D.score >= 6) tools.push("VersaAI");
    if (xrScores.virtualTryOn.score >= 6) tools.push("Commverse Studio");
    if (xrScores.configurator.score >= 6) tools.push("3D Configurator");
    if (tools.length === 0) tools.push("Commverse Studio");
    return tools;
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionHeaderText}>What Ctruh Would Build for {report.storeName}</Text>
        <Text style={s.sectionHeaderSub}>Page {pageNum}</Text>
      </View>
      <View style={s.pageInner}>
        <Text style={[s.roiIntro, { marginBottom: 16 }]}>
          Here&apos;s exactly what gets built, in what order, and what it does for your store.
        </Text>
        {products.map((product) => {
          const tools = getCtruhTool(product);
          return (
            <View key={product.id} style={s.mappingRow}>
              <Text style={s.mappingProduct}>{product.title}</Text>
              <View style={s.mappingTools}>
                {tools.map((t) => (
                  <View key={t} style={s.mappingToolBadge}>
                    <Text style={s.mappingToolText}>{t}</Text>
                  </View>
                ))}
              </View>
              <Text style={s.mappingToolDesc}>{tools.map((t) => toolDescription(t)).join("  ·  ")}</Text>
              <View style={s.roadmapRow}>
                <View style={s.roadmapWeek}>
                  <Text style={s.roadmapWeekLabel}>Week 1 — Asset Preparation</Text>
                  <Text style={s.roadmapWeekText}>
                    Gather your best product photos and prepare them for 3D conversion. VersaAI converts your product photos into interactive 3D models for {product.title}.
                  </Text>
                </View>
                <View style={s.roadmapWeek}>
                  <Text style={s.roadmapWeekLabel}>Week 2 — Build & Integration</Text>
                  <Text style={s.roadmapWeekText}>
                    {tools[0]} ({toolDescription(tools[0])}) is added to the product page and checked across mobile and desktop.
                  </Text>
                </View>
                <View style={s.roadmapWeek}>
                  <Text style={s.roadmapWeekLabel}>Week 3 — Go Live & Measure</Text>
                  <Text style={s.roadmapWeekText}>
                    Launch the experience, compare it against standard product pages, and measure conversion lift plus return reduction.
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        <Text style={[s.roiIntro, { marginTop: 6 }]}>
          Most brands are live within 3 weeks. No engineering team needed on your side.
        </Text>
      </View>
    </Page>
  );
}

// Main document export
export function ReportDocument({ report }: { report: XRReport }) {
  const detailProducts = getGeneratedProducts(report, 2);
  const mappingProducts = getRecommendedProducts(report, 2);
  const roiPageNum = 4 + detailProducts.length;
  const mappingPageNum = roiPageNum + 1;

  return (
    <Document
      title={`XR Opportunity Report — ${report.storeName}`}
      author="Ctruh Opportunity Analyzer"
    >
      <CoverPage report={report} />
      <OverviewPage report={report} />
      <HeatmapPage products={report.products} />
      {detailProducts.map((p, i) => (
        <ProductDetailPage key={p.id} product={p} pageNum={4 + i} />
      ))}
      <ROIPage report={report} pageNum={roiPageNum} />
      <MappingPage report={report} products={mappingProducts} pageNum={mappingPageNum} />
    </Document>
  );
}
