"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { GlbPhaseLoader } from "@/components/ui/glb-phase-loader";
import {
  ROI_BASE_CONVERSION_RATE,
  ROI_BASE_RETURN_RATE,
  ROI_CONVERSION_LIFT_MULTIPLIER,
  ROI_RETURN_REDUCTION_MULTIPLIER,
} from "@/lib/scoring/xr-readiness";
import type { XRReport } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "complete";

interface SlideStep {
  text: string; // shown when pending or active
  done: string; // shown when complete
}

interface SlideConfig {
  label: string;
  headline: string;
  subhead: string;
  initStep: number; // which step index is active when slide first loads
  steps: SlideStep[];
}

export interface MeshyProgressItem {
  product: string;
  progress: number;
}

// ─── Slide Configs ────────────────────────────────────────────────────────────

const SLIDE_1: SlideConfig = {
  label: "ANALYZING 01 / 04",
  headline: "Connecting to Store",
  subhead: "We're mapping your storefront and preparing your catalog for analysis.",
  initStep: 2,
  steps: [
    { text: "Store URL received", done: "Store URL received" },
    { text: "Verifying storefront accessibility", done: "Verifying storefront accessibility" },
    { text: "Reading catalog structure", done: "Reading catalog structure" },
    { text: "Identifying products and collections", done: "Identifying products and collections" },
    { text: "Store connected", done: "Store connected" },
  ],
};

function buildSlide2(report: XRReport | null, streamCount: number | null): SlideConfig {
  const count = streamCount ?? report?.productCount ?? 247;
  const selected = Math.min(count, 50);
  return {
    label: "ANALYZING 02 / 04",
    headline: "Scanning Products",
    subhead: "CTRUH is evaluating products, imagery, variants, and merchandising signals.",
    initStep: 1,
    steps: [
      { text: "Fetching product catalogue", done: `${count} products discovered` },
      { text: "Loading product imagery", done: "Product imagery loaded" },
      { text: "Detecting variants and pricing", done: "Variants and pricing detected" },
      { text: "Selecting products for analysis", done: `${selected} products selected` },
    ],
  };
}

function buildSlide3(): SlideConfig {
  return {
    label: "ANALYZING 03 / 04",
    headline: "Detecting XR Opportunities",
    subhead: "We are identifying where immersive experiences can create the largest impact.",
    initStep: 1,
    steps: [
      { text: "Categorizing products", done: "Top category detected" },
      { text: "Calculating XR suitability", done: "XR opportunities mapped" },
      { text: "Detecting 3D opportunities", done: "3D opportunities detected" },
      { text: "Detecting AR opportunities", done: "AR opportunities detected" },
      { text: "Ranking opportunities", done: "Opportunity ranking complete" },
    ],
  };
}

function buildSlide4(isComplete: boolean): SlideConfig {
  if (isComplete) {
    return {
      label: "ANALYZING 04 / 04",
      headline: "Analysis Complete",
      subhead: "Your XR opportunity report is ready.",
      initStep: 5,
      steps: [
        { text: "Revenue impact calculated", done: "Revenue impact calculated" },
        { text: "Opportunity recommendations generated", done: "Opportunity recommendations generated" },
        { text: "Priority products selected", done: "Priority products selected" },
        { text: "Report assembled", done: "Report assembled" },
        { text: "Report ready", done: "Report ready" },
      ],
    };
  }
  return {
    label: "ANALYZING 04 / 04",
    headline: "Calculating Business Impact",
    subhead: "We're translating ranked 3D and AR opportunities into benchmark-based business estimates.",
    initStep: 1,
    steps: [
      { text: "Measuring conversion potential", done: "Conversion potential measured" },
      { text: "Estimating engagement uplift", done: "Engagement uplift estimated" },
      { text: "Calculating return reduction", done: "Return reduction calculated" },
      { text: "Building recommendations", done: "Recommendations built" },
      { text: "Preparing report", done: "Report assembled" },
    ],
  };
}

function getConfig(
  idx: number,
  report: XRReport | null,
  slide4Done: boolean,
  streamCount: number | null,
): SlideConfig {
  switch (idx) {
    case 0: return SLIDE_1;
    case 1: return buildSlide2(report, streamCount);
    case 2: return buildSlide3();
    case 3: return buildSlide4(slide4Done);
    default: return SLIDE_1;
  }
}

// ─── Visual: Slide 1 — Connection ────────────────────────────────────────────

function trimUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function ConnectVisual({ storeUrl }: { storeUrl: string }) {
  return (
    <div className="xr-ac-visual xr-ac-visual--connect">
      <div className="xr-ac-conn-url-pill">
        {trimUrl(storeUrl) || "your-store.com"}
      </div>
      <div className="xr-ac-conn-line">
        <div className="xr-ac-conn-particle" />
      </div>
      <div className="xr-ac-conn-node">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.ctruh.com/assets/images/ctruh-logo.png"
          alt="Ctruh"
          className="xr-ac-conn-logo"
        />
      </div>
    </div>
  );
}

// ─── Visual: Slide 2 — Product Grid ──────────────────────────────────────────

function GridVisual({ report }: { report: XRReport | null }) {
  const slots = Array.from({ length: 8 }, (_, i) => {
    const url = report?.products?.[i]?.imageUrl ?? null;
    return url;
  });

  return (
    <div className="xr-ac-visual xr-ac-visual--grid">
      {slots.map((src, i) =>
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="xr-ac-grid-cell xr-ac-grid-img" />
        ) : (
          <div key={i} className="xr-ac-grid-cell xr-ac-grid-skel" />
        )
      )}
      <div className="xr-ac-scan-beam" />
    </div>
  );
}

// ─── Visual: Slide 3 — XR Opportunities ──────────────────────────────────────

const FALLBACK_OPPS = ["3D Viewer", "Virtual Try-On", "AR Placement"];
const OPP_ICONS: Record<string, string> = {
  "3D Viewer": "⬡",
  "Virtual Try-On": "◎",
  "AR Placement": "◈",
};

function OppsVisual({
  report,
  streamOpportunities,
}: {
  report: XRReport | null;
  streamOpportunities?: string[] | null;
}) {
  const raw = streamOpportunities ?? report?.topOpportunities ?? FALLBACK_OPPS;
  const opps = raw.length >= 3 ? raw.slice(0, 3) : FALLBACK_OPPS;

  return (
    <div className="xr-ac-visual xr-ac-visual--opps">
      {opps.map((label, i) => (
        <div key={label} className={`xr-ac-opp-card${i === 0 ? " is-lead" : ""}`}>
          <div className="xr-ac-opp-icon">{OPP_ICONS[label] ?? "◈"}</div>
          <div className="xr-ac-opp-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Visual: Slide 4 — Business Metrics ──────────────────────────────────────

function MetricsVisual({ report }: { report: XRReport | null }) {
  const impact = report?.roiScenarios?.[1]?.totalMonthlyImpact;
  const conversionLiftPct = Math.round((ROI_CONVERSION_LIFT_MULTIPLIER - 1) * 100);
  const returnReductionPct = Math.round((1 - ROI_RETURN_REDUCTION_MULTIPLIER) * 100);
  return (
    <div className="xr-ac-visual xr-ac-visual--metrics">
      <div className="xr-ac-metric-row">
        <div className="xr-ac-metric-card">
          <span className="xr-ac-metric-val is-up">+{conversionLiftPct}%</span>
          <span className="xr-ac-metric-label">benchmark conversion lift</span>
        </div>
        <div className="xr-ac-metric-card">
          <span className="xr-ac-metric-val is-up">{Math.round(ROI_BASE_CONVERSION_RATE * 100)}%</span>
          <span className="xr-ac-metric-label">base conversion assumption</span>
        </div>
        <div className="xr-ac-metric-card">
          <span className="xr-ac-metric-val is-good">−{returnReductionPct}%</span>
          <span className="xr-ac-metric-label">benchmark return reduction</span>
        </div>
      </div>
      {impact !== undefined && (
        <div className="xr-ac-impact-card">
          <div>
            <div className="xr-ac-impact-val">${impact.toLocaleString()}</div>
            <div className="xr-ac-impact-label">
              estimated monthly impact at {Math.round(ROI_BASE_RETURN_RATE * 100)}% baseline returns
            </div>
          </div>
          <span className="xr-ac-impact-badge">benchmark estimate</span>
        </div>
      )}
    </div>
  );
}

// ─── Visual: Meshy 3D generation progress ────────────────────────────────────

function Generating3DVisual({
  meshyProgress,
}: {
  meshyProgress: MeshyProgressItem[];
}) {
  const overall =
    meshyProgress.length > 0
      ? Math.round(meshyProgress.reduce((s, p) => s + p.progress, 0) / meshyProgress.length)
      : 0;

  return (
    <div className="xr-ac-visual xr-ac-visual--3d">
      <GlbPhaseLoader progress={overall} />
    </div>
  );
}

export function MeshyGenerationPreview({
  meshyProgress,
}: {
  meshyProgress: MeshyProgressItem[];
}) {
  return (
    <div className="xr-ac">
      <div className="xr-ac-carousel">
        <div className="xr-ac-slide xr-ac-slide--active">
          <div className="xr-ac-slide-inner">
            <div className="xr-ac-label">ANALYZING 04 / 04</div>
            <h3 className="xr-ac-headline">Generating 3D Previews</h3>
            <p className="xr-ac-subhead">
              This is the standalone GLB generation loader shown while browser-ready 3D previews are being built.
            </p>
            <GlbPhaseLoader progress={overallProgress(meshyProgress)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function overallProgress(meshyProgress: MeshyProgressItem[]) {
  return meshyProgress.length > 0
    ? Math.round(meshyProgress.reduce((sum, item) => sum + item.progress, 0) / meshyProgress.length)
    : 0;
}

// ─── Visual: Before / After reveal ───────────────────────────────────────────

function BeforeAfterVisual({ report }: { report: XRReport }) {
  const topProduct = [...report.products]
    .sort((a, b) => b.overallXRScore - a.overallXRScore)
    .find((p) => p.imageUrl);

  if (!topProduct) return <MetricsVisual report={report} />;

  return (
    <div className="xr-ac-visual xr-ac-visual--beforeafter">
      <div className="xr-ac-ba-panel">
        <span className="xr-ac-ba-tag">Before</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={topProduct.imageUrl!} alt="Original" className="xr-ac-ba-img" />
        <span className="xr-ac-ba-caption">Flat product photo</span>
      </div>

      <div className="xr-ac-ba-arrow">→</div>

      <div className="xr-ac-ba-panel">
        <span className="xr-ac-ba-tag xr-ac-ba-tag--after">After XR</span>
        {topProduct.previewImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={topProduct.previewImageUrl} alt="3D model preview" className="xr-ac-ba-img" />
        ) : (
          <div className="xr-ac-ba-placeholder">3D + AR{"\n"}experience</div>
        )}
        <span className="xr-ac-ba-caption">Interactive 3D + AR</span>
      </div>
    </div>
  );
}

function SlideVisual({
  slideIdx,
  storeUrl,
  report,
  streamOpportunities,
  meshyProgress,
}: {
  slideIdx: number;
  storeUrl: string;
  report: XRReport | null;
  streamOpportunities?: string[] | null;
  meshyProgress?: MeshyProgressItem[];
}) {
  if (slideIdx === 0) return <ConnectVisual storeUrl={storeUrl} />;
  if (slideIdx === 1) return <GridVisual report={report} />;
  if (slideIdx === 2) return <OppsVisual report={report} streamOpportunities={streamOpportunities} />;
  if (slideIdx === 3) {
    if (report) return <BeforeAfterVisual report={report} />;
    if (meshyProgress && meshyProgress.length > 0) return <Generating3DVisual meshyProgress={meshyProgress} />;
    return <MetricsVisual report={report} />;
  }
  return null;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ steps, activeStep }: { steps: SlideStep[]; activeStep: number }) {
  return (
    <div className="xr-ac-timeline">
      {steps.map((step, i) => {
        const status: StepStatus =
          i < activeStep ? "complete" : i === activeStep ? "active" : "pending";
        const isLast = i === steps.length - 1;
        return (
          <div key={`${step.text}-${i}`} className="xr-ac-step">
            <div className="xr-ac-step-rail">
              <div className={`xr-ac-step-dot is-${status}`}>
                {status === "complete" && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path
                      d="M1 3.5L3 5.5L8 1"
                      stroke="#00C48C"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {status === "active" && <div className="xr-ac-dot-pulse" />}
              </div>
              {!isLast && (
                <div
                  className={`xr-ac-step-line ${status === "complete" ? "is-done" : "is-wait"}`}
                />
              )}
            </div>
            <div className="xr-ac-step-body">
              <span className={`xr-ac-step-text is-${status}`}>
                {status === "complete" ? step.done : step.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Slide Content ────────────────────────────────────────────────────────────

function SlideContent({
  config,
  activeStep,
  slideIdx,
  storeUrl,
  report,
  streamOpportunities,
  meshyProgress,
}: {
  config: SlideConfig;
  activeStep: number;
  slideIdx: number;
  storeUrl: string;
  report: XRReport | null;
  streamOpportunities?: string[] | null;
  meshyProgress?: MeshyProgressItem[];
}) {
  return (
    <div className="xr-ac-slide-inner">
      <div className="xr-ac-label">{config.label}</div>
      <h3 className="xr-ac-headline">{config.headline}</h3>
      <p className="xr-ac-subhead">{config.subhead}</p>
      <SlideVisual
        slideIdx={slideIdx}
        storeUrl={storeUrl}
        report={report}
        streamOpportunities={streamOpportunities}
        meshyProgress={meshyProgress}
      />
      <Timeline steps={config.steps} activeStep={activeStep} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalysisProgress({
  reportReady,
  onComplete,
  reportPreview,
  storeUrl,
  streamProductCount = null,
  streamOpportunities = null,
  meshyProgress = [],
}: {
  reportReady: boolean;
  onComplete: () => void;
  reportPreview: XRReport | null;
  storeUrl: string;
  streamProductCount?: number | null;
  streamOpportunities?: string[] | null;
  meshyProgress?: MeshyProgressItem[];
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [activeStep, setActiveStep] = useState(SLIDE_1.initStep);
  const [prevSlideIdx, setPrevSlideIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slide4Complete, setSlide4Complete] = useState(false);
  const completedRef = useRef(false);
  const triggerComplete = useEffectEvent(() => {
    onComplete();
  });

  // Step/slide advancement — does NOT schedule onComplete
  useEffect(() => {
    if (slide4Complete) return;

    const config = getConfig(slideIdx, reportPreview, false, streamProductCount);
    const total = config.steps.length;

    if (activeStep >= total) {
      if (slideIdx < 3) {
        const t = window.setTimeout(() => {
          const next = slideIdx + 1;
          const nextInit = getConfig(next, reportPreview, false, streamProductCount).initStep;
          setPrevSlideIdx(slideIdx);
          setSlideIdx(next);
          setActiveStep(nextInit);
          setIsTransitioning(true);
          window.setTimeout(() => {
            setPrevSlideIdx(null);
            setIsTransitioning(false);
          }, 680);
        }, 300);
        return () => window.clearTimeout(t);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          setSlide4Complete(true);
        }
      }
      return;
    }

    if (slideIdx === 3 && activeStep === total - 1 && !reportReady) return;

    const delay = 680 + Math.floor(Math.random() * 120);
    const t = window.setTimeout(() => setActiveStep((s) => s + 1), delay);
    return () => window.clearTimeout(t);
  }, [slideIdx, activeStep, reportReady, slide4Complete, reportPreview, streamProductCount]);

  // Separate effect: fire onComplete 800ms after slide4 finishes — never cancels itself
  useEffect(() => {
    if (!slide4Complete) return;
    const t = window.setTimeout(() => triggerComplete(), 800);
    return () => window.clearTimeout(t);
  }, [slide4Complete]);

  const currentConfig = getConfig(slideIdx, reportPreview, slide4Complete, streamProductCount);
  const prevConfig =
    prevSlideIdx !== null ? getConfig(prevSlideIdx, reportPreview, false, streamProductCount) : null;

  return (
    <div className="xr-ac">
      <div className="xr-ac-carousel">
        {prevConfig !== null && (
          <div className="xr-ac-slide xr-ac-slide--exit">
            <SlideContent
              config={prevConfig}
              activeStep={prevConfig.steps.length}
              slideIdx={prevSlideIdx!}
              storeUrl={storeUrl}
              report={reportPreview}
              streamOpportunities={streamOpportunities}
              meshyProgress={meshyProgress}
            />
          </div>
        )}

        <div
          className={`xr-ac-slide ${isTransitioning ? "xr-ac-slide--enter" : "xr-ac-slide--active"}`}
        >
          <SlideContent
            config={currentConfig}
            activeStep={slide4Complete ? currentConfig.steps.length : activeStep}
            slideIdx={slideIdx}
            storeUrl={storeUrl}
            report={reportPreview}
            streamOpportunities={streamOpportunities}
            meshyProgress={meshyProgress}
          />
        </div>
      </div>
    </div>
  );
}
