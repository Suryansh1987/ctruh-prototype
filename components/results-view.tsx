"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { XRReport } from "@/lib/types";

function scoreBucket(score: number): "strong" | "mid" | "low" {
  if (score >= 7) return "strong";
  if (score >= 4) return "mid";
  return "low";
}

function getToolCards() {
  return [
    {
      key: "versaai",
      title: "VersaAI",
      subtitle: "Converts your product photos into interactive 3D models",
      week: "Week 1",
      description: "Asset audit + 3D generation for your top 3 products",
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
  const readyProducts = sortedProducts.filter((product) => product.overallXRScore >= 7).length;
  const topRows = sortedProducts.slice(0, 10);
  const buildCards = getToolCards();

  async function handleDownloadPDF() {
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
  }

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
          <h2>{report.storeName} has {readyProducts} products ready for immersive commerce</h2>
          <p>
            Brands like yours typically see 40% fewer returns and 90% higher conversions after going immersive.
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
                <th>Looks Better in 3D?</th>
                <th>Virtual Try-On Ready?</th>
                <th>Style Switcher Ready?</th>
                <th>XR Score</th>
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
          Based on Ctruh&apos;s results across 100+ stores. Estimates vary by category and implementation.
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
