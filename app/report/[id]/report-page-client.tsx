"use client";

import { useEffect, useRef, useState } from "react";
import { ResultsView } from "@/components/results-view";
import Link from "next/link";
import type { XRReport } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;
const POLL_MAX_MS = 5 * 60 * 1000;

export function ReportPageClient({
  reportId,
  initialReport,
  initialStatus,
  initialPdfUrl,
}: {
  reportId: string;
  initialReport: XRReport;
  initialStatus: string;
  initialPdfUrl: string | null;
}) {
  const [report, setReport] = useState<XRReport>(initialReport);
  const [status, setStatus] = useState(initialStatus);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef(Date.now());

  const isProcessing = status === "processing";

  useEffect(() => {
    if (!isProcessing) return;

    pollStartRef.current = Date.now();

    pollRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_MAX_MS) {
        clearInterval(pollRef.current!);
        return;
      }

      try {
        const res = await fetch(`/api/report/${reportId}`);
        if (!res.ok) return;

        const data = await res.json() as {
          status: string;
          report: XRReport | null;
          pdfUrl: string | null;
        };

        if (data.status === "ready" || (data.report?.products.some((p) => p.glbUrl))) {
          setStatus("ready");
          if (data.report) setReport(data.report);
          clearInterval(pollRef.current!);
        }
      } catch {
        // silent — keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [reportId, isProcessing]);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="xr-report-stage">
      <div className="xr-report-hero">
        <img
          src="https://www.ctruh.com/assets/images/ctruh-logo.png"
          alt="Ctruh"
          className="xr-wordmark"
        />
        <div className="xr-label">Powered by Ctruh</div>
        <h1 className="xr-headline xr-report-hero-title">
          <span className="xr-headline-line">Your 3D + AR</span>
          <span className="xr-headline-line">Opportunity Report</span>
        </h1>

        <div className="xr-report-pill-row">
          <div className="xr-pill-input">
            <span>✓ {report.storeUrl.replace(/^https?:\/\//, "")}</span>
            <Link href="/">Analyze another →</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center" }}>
          <button
            type="button"
            onClick={handleCopyLink}
            className="xr-secondary-button"
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            {copyState === "copied" ? "Link copied!" : "Share report →"}
          </button>
        </div>

        {isProcessing && (
          <div style={{
            marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.55)",
            display: "flex", alignItems: "center", gap: 8, justifyContent: "center"
          }}>
            <span className="xr-url-lock-spinner" />
            3D models generating in background — this page updates automatically
          </div>
        )}
      </div>

      <div className="xr-report-shell">
        <ResultsView report={report} onReset={() => { window.location.href = "/"; }} />
      </div>
    </div>
  );
}
