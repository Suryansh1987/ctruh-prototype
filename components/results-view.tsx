"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ROI_BASE_CONVERSION_RATE,
  ROI_BASE_RETURN_RATE,
  ROI_CONVERSION_LIFT_MULTIPLIER,
  ROI_RETURN_REDUCTION_MULTIPLIER,
  ROI_TRAFFIC_LEVELS,
} from "@/lib/scoring/xr-readiness";
import type { XRReport } from "@/lib/types";

function scoreBucket(score: number): "strong" | "mid" | "low" {
  if (score >= 7) return "strong";
  if (score >= 4) return "mid";
  return "low";
}

function getToolCards(generatedCount: number) {
  const generationDescription =
    generatedCount > 0
      ? `Asset audit + 3D generation for your top ${generatedCount} product${generatedCount === 1 ? "" : "s"}`
      : "Asset audit + 3D generation for your priority products";

  return [
    {
      key: "versaai",
      title: "VersaAI",
      subtitle: "Converts your product photos into interactive 3D models",
      week: "Week 1",
      description: generationDescription,
      icon: "AI",
    },
    {
      key: "commverse",
      title: "Commverse Studio",
      subtitle: "Your virtual storefront, live in a browser, no app needed",
      week: "Week 2",
      description: "Integration on product pages. QA on mobile and desktop.",
      icon: "",
    },
    {
      key: "config",
      title: "3D Configurator",
      subtitle: "Customers switch colors and styles in real time",
      week: "Week 3",
      description: "Go live. A/B test XR vs standard. Track conversion metrics.",
      icon: "",
    },
  ];
}

function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, visible } = useReveal();

  return (
    <section ref={ref} className={`xr-report-section ${visible ? "is-visible" : ""} ${className}`.trim()}>
      {children}
    </section>
  );
}


function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="xr-tooltip-wrap" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span className="xr-tooltip-icon">i</span>
      {show && <span className="xr-tooltip-bubble">{text}</span>}
    </span>
  );
}

const DIMENSION_INFO: Record<string, string> = {
  "Looks Better in 3D?": "How much this product benefits from 3D viewing — complex shapes, textures, and physical details score higher.",
  "Virtual Try-On Ready?": "How well this product can be virtually tried on — wearables, eyewear, and accessories score highest.",
  "Style Switcher Ready?": "How much value a live variant configurator adds — products with many color, size, or material options score higher.",
  "XR Score": "Overall XR opportunity score (1–10) combining all four dimensions, weighted by product category.",
};

export function ResultsView({
  report,
  onReset,
}: {
  report: XRReport;
  onReset: () => void;
  analyzedUrl?: string;
  isVisible?: boolean;
  showPill?: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const sortedProducts = useMemo(
    () => [...report.products].sort((a, b) => b.overallXRScore - a.overallXRScore),
    [report.products]
  );
  const generatedProducts = useMemo(
    () => sortedProducts.filter((product) => product.previewImageUrl || product.glbUrl),
    [sortedProducts]
  );
  const readyProducts = sortedProducts.filter((product) => product.overallXRScore >= 7).length;
  const topRows = sortedProducts.slice(0, 10);
  const buildCards = getToolCards(generatedProducts.length);
  const conversionLiftPct = Math.round((ROI_CONVERSION_LIFT_MULTIPLIER - 1) * 100);
  const returnReductionPct = Math.round((1 - ROI_RETURN_REDUCTION_MULTIPLIER) * 100);

  const handleDownloadPDF = useCallback(async () => {
    const res = await fetch("/api/download-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctruh-xr-report-${report.storeName.toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  async function handleCalendlyClick() {
    window.open("https://calendly.com/contact-ctruh/30min", "_blank", "noopener,noreferrer");
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(report.storeUrl);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div>
      <RevealSection>
        <div className="xr-stats-bar">
          <span className="xr-stat-pill">{report.productCount} products analyzed</span>
          <span className="xr-stat-pill">XR Score: {report.xrReadinessScore.toFixed(1)}/10</span>
          <span className="xr-stat-pill">
            {report.categories.length} categor{report.categories.length === 1 ? "y" : "ies"}
          </span>
          <span className="xr-stat-pill">Avg price ${Math.round(report.avgProductPrice)}</span>
        </div>
      </RevealSection>

      <RevealSection>
        <div className="xr-section-heading">
          <h2>{report.storeName} has {readyProducts} products ready for 3D and AR shopping experiences</h2>
          <p>
            We ranked your catalog for 3D viewing, AR, try-on, and configurable shopping moments.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="mt-12">
        <div className="xr-section-label">Your products — ranked by XR opportunity</div>
        <div className="xr-table-wrap">
          <table className="xr-table is-visible">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>
                  Looks Better in 3D?
                  <InfoTooltip text={DIMENSION_INFO["Looks Better in 3D?"]} />
                </th>
                <th>
                  Virtual Try-On Ready?
                  <InfoTooltip text={DIMENSION_INFO["Virtual Try-On Ready?"]} />
                </th>
                <th>
                  Style Switcher Ready?
                  <InfoTooltip text={DIMENSION_INFO["Style Switcher Ready?"]} />
                </th>
                <th>
                  XR Score
                  <InfoTooltip text={DIMENSION_INFO["XR Score"]} />
                </th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((product, index) => (
                <tr
                  key={product.id}
                  className="xr-table-row"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td>{product.title}</td>
                  <td>{product.category}</td>
                  <td><span className="xr-score-text">{product.xrScores.visualization3D.score.toFixed(1)}</span></td>
                  <td><span className="xr-score-text">{product.xrScores.virtualTryOn.score.toFixed(1)}</span></td>
                  <td><span className="xr-score-text">{product.xrScores.configurator.score.toFixed(1)}</span></td>
                  <td>
                    <span className={`xr-table-score-pill is-${scoreBucket(product.overallXRScore)}`}>
                      {product.overallXRScore.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </RevealSection>

      {sortedProducts.slice(0, 3).some((p) => p.xrScores.visualization3D.missingOut) && (
        <RevealSection className="mt-12">
          <div className="xr-section-label">Deep dive — what you&apos;re missing &amp; how to fix it</div>
          {sortedProducts.slice(0, 3).map((product) => (
            <div key={product.id} className="xr-deep-card">
              <div className="xr-deep-header">
                <span className="xr-deep-title">{product.title}</span>
                <span className="xr-deep-priority-badge">{product.xrPriority}</span>
                <span className={`xr-table-score-pill is-${scoreBucket(product.overallXRScore)}`} style={{ marginLeft: "auto" }}>
                  {product.overallXRScore.toFixed(1)}/10
                </span>
              </div>
              <p className="xr-deep-priority-reason">{product.xrPriorityReason}</p>
              <div className="xr-deep-dims">
                {(
                  [
                    { label: "3D Viewer", dim: product.xrScores.visualization3D },
                    { label: "Virtual Try-On", dim: product.xrScores.virtualTryOn },
                    { label: "Configurator", dim: product.xrScores.configurator },
                    { label: "AR Placement", dim: product.xrScores.immersiveCommerce },
                  ] as const
                ).map(({ label, dim }) => (
                  <div key={label} className={`xr-deep-dim is-${scoreBucket(dim.score)}`}>
                    <div className="xr-deep-dim-header">
                      <span className="xr-deep-dim-label">{label}</span>
                      <span className="xr-deep-dim-score">{dim.score}/10</span>
                    </div>
                    <p className="xr-deep-dim-missing">
                      <span className="xr-deep-dim-tag xr-deep-dim-tag--miss">Missing out:</span>
                      {dim.missingOut}
                    </p>
                    <p className="xr-deep-dim-tip">
                      <span className="xr-deep-dim-tag xr-deep-dim-tag--tip">Quick fix:</span>
                      {dim.tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </RevealSection>
      )}

      {(report.storeInsights?.length > 0 || report.quickWins?.length > 0) && (
        <RevealSection className="mt-12">
          <div className="xr-insights-grid">
            {report.storeInsights?.length > 0 && (
              <div className="xr-insights-col">
                <div className="xr-section-label">Store insights</div>
                <ul className="xr-insights-list">
                  {report.storeInsights.map((insight, i) => (
                    <li key={i} className="xr-insights-item xr-insights-item--insight">{insight}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.quickWins?.length > 0 && (
              <div className="xr-insights-col">
                <div className="xr-section-label">Quick wins</div>
                <ul className="xr-insights-list">
                  {report.quickWins.map((win, i) => (
                    <li key={i} className="xr-insights-item xr-insights-item--win">{win}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </RevealSection>
      )}

      <RevealSection className="mt-12">
        <div className="xr-section-label">What could XR mean for your revenue?</div>
        <div className="xr-roi-grid">
          {report.roiScenarios.map((row, index) => (
            <div key={row.monthlyTraffic} className={`xr-info-card ${index === 1 ? "is-featured" : ""}`}>
              {index === 1 ? <span className="xr-corner-badge">most common</span> : null}
              <h3>{row.monthlyTraffic.toLocaleString()} visitors / month</h3>
              <strong>${row.totalMonthlyImpact.toLocaleString()}</strong>
              <p>extra per month</p>
              <small>${row.annualImpact.toLocaleString()} per year</small>
            </div>
          ))}
        </div>
        <div className="xr-disclaimer">
          Estimated from fixed benchmark scenarios, not your live analytics.
        </div>
        <div className="xr-info-card" style={{ marginTop: 16 }}>
          <h3>How impact is calculated</h3>
          <p>
            We model {ROI_TRAFFIC_LEVELS.map((level) => level.toLocaleString()).join(" / ")} monthly visitors,
            a {Math.round(ROI_BASE_CONVERSION_RATE * 100)}% baseline conversion rate, a {conversionLiftPct}% 3D + AR
            conversion lift, a {Math.round(ROI_BASE_RETURN_RATE * 100)}% baseline return rate, and a {returnReductionPct}%
            return reduction.
          </p>
          <p>
            Extra monthly impact = additional orders from the conversion lift plus return savings, using your analyzed
            average product price of ${Math.round(report.avgProductPrice)}.
          </p>
        </div>
        <div className="xr-disclaimer">
          Benchmarks are directional. Actual business impact depends on traffic quality, category, pricing, and rollout.
        </div>
      </RevealSection>

      <RevealSection className="mt-12">
        <div className="xr-section-label">What Ctruh builds for you</div>
        <div className="xr-build-grid">
          {buildCards.map((card) => (
            <div key={card.key} className="xr-build-card">
              <span className="xr-week-badge">{card.week}</span>
              {card.icon ? <div className="xr-ai-icon">{card.icon}</div> : <div className="xr-ai-icon">3D</div>}
              <h3>{card.title}</h3>
              <p>{card.subtitle}</p>
              <p className="xr-build-description">{card.description}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      {generatedProducts.length > 0 && (
        <RevealSection className="mt-12">
          <div className="xr-section-label">Before XR → After XR</div>
          {generatedProducts.slice(0, 2).map((product) => (
            <div key={product.id} className="xr-beforeafter-section" style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>{product.title}</div>
              <div className="xr-ba-grid">
                <div className="xr-ba-panel">
                  <span className="xr-ba-tag">Before</span>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.imageUrl} alt="Original" className="xr-ba-img" />
                  ) : (
                    <div className="xr-ba-placeholder">No photo</div>
                  )}
                  <span className="xr-ba-caption">Flat product photo</span>
                </div>
                <div className="xr-ba-arrow">→</div>
                <div className="xr-ba-panel">
                  <span className="xr-ba-tag xr-ba-tag--after">After XR</span>
                  {product.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.previewImageUrl} alt="3D render" className="xr-ba-img" />
                  ) : (
                    <div className="xr-ba-placeholder">3D model being generated</div>
                  )}
                  <span className="xr-ba-caption">Interactive 3D + AR</span>
                </div>
              </div>
              {product.glbUrl && (
                <a
                  href={`/viewer?glb=${encodeURIComponent(product.glbUrl)}&name=${encodeURIComponent(product.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xr-ba-viewer-link"
                >
                  Open Interactive 3D Demo →
                </a>
              )}
            </div>
          ))}
        </RevealSection>
      )}

      <RevealSection className="mt-12">
        <div className="xr-footer-cta">
          <h2>Ready to make this real?</h2>
          <p>
            Book a free 30-minute demo.
            <br />
            See your store in XR within the week.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button type="button" className="xr-primary-button" onClick={handleCalendlyClick}>
              Book Free Demo →
            </button>
            <button type="button" className="xr-secondary-button" onClick={handleDownloadPDF}>
              Download PDF Report
            </button>
            <button type="button" className="xr-secondary-button" onClick={handleCopyLink}>
              {copyState === "copied" ? "Copied ✓" : "Copy Store URL"}
            </button>
          </div>
          <div className="xr-powered">Powered by Ctruh</div>
          <div className="mt-3">
            <button
              type="button"
              onClick={onReset}
              className="text-[12px] font-medium text-[var(--blue)] underline-offset-4 hover:underline"
            >
              Analyze another →
            </button>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
