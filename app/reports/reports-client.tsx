"use client";

import { useState } from "react";
import type { GlbEntry } from "@/lib/db/schema";

type ReportRow = {
  id: string;
  storeName: string | null;
  storeUrl: string;
  xrReadinessScore: string | null;
  productCount: number | null;
  glbUrls: GlbEntry[] | null;
  pdfUrl: string | null;
  createdAt: Date | null;
};

type Step = "identity" | "otp" | "reports";

function ScoreBadge({ score }: { score: string | null }) {
  const n = parseFloat(score ?? "0");
  const color = n >= 7 ? "#00c48c" : n >= 4 ? "#f59e0b" : "#f87171";
  return (
    <span style={{ color, fontWeight: 700, fontSize: 15 }}>{n.toFixed(1)}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>/10</span></span>
  );
}

function ReportCard({ report }: { report: ReportRow }) {
  const date = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div className="rp-card">
      <div className="rp-card-header">
        <div>
          <div className="rp-store-name">{report.storeName ?? "Unknown Store"}</div>
          <div className="rp-store-url">{report.storeUrl.replace(/^https?:\/\//, "")}</div>
        </div>
        <div className="rp-card-meta">
          <ScoreBadge score={report.xrReadinessScore} />
          <span className="rp-card-date">{date}</span>
        </div>
      </div>

      <div className="rp-card-stats">
        <span className="rp-stat">{report.productCount ?? 0} products</span>
        {report.glbUrls && report.glbUrls.length > 0 && (
          <span className="rp-stat">{report.glbUrls.length} 3D model{report.glbUrls.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {report.glbUrls && report.glbUrls.length > 0 && (
        <div className="rp-models">
          {report.glbUrls.map((g) => (
            <div key={g.productId} className="rp-model-row">
              {g.previewImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.previewImageUrl} alt={g.title} className="rp-model-thumb" />
              )}
              <div className="rp-model-info">
                <div className="rp-model-title">{g.title}</div>
                <div className="rp-model-score">XR Score: <strong>{g.score.toFixed(1)}</strong></div>
              </div>
              <a
                href={`/viewer?glb=${encodeURIComponent(g.glbUrl)}&name=${encodeURIComponent(g.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rp-model-btn"
              >
                View 3D →
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="rp-card-actions">
        {report.pdfUrl && (
          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer" className="rp-action-link">
            Download PDF
          </a>
        )}
        <a href="/" className="rp-action-link rp-action-link--primary">
          New Analysis →
        </a>
      </div>
    </div>
  );
}

export function ReportsClient() {
  const [step, setStep] = useState<Step>("identity");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/contact/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to send code.");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const verifyRes = await fetch("/api/contact/confirm-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, code }),
      });
      const verifyData = await verifyRes.json() as { ok?: boolean; error?: string };
      if (!verifyRes.ok || !verifyData.ok) throw new Error(verifyData.error ?? "Invalid code.");

      const reportsRes = await fetch("/api/my-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const reportsData = await reportsRes.json() as { reports?: ReportRow[]; error?: string };
      if (!reportsRes.ok) throw new Error(reportsData.error ?? "Failed to fetch reports.");

      setReports(reportsData.reports ?? []);
      setStep("reports");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rp-page">
      <div className="rp-header">
        <a href="/" className="rp-back">← Back</a>
        <div className="rp-wordmark">Ctruh</div>
      </div>

      <div className="rp-body">
        {step === "identity" && (
          <form onSubmit={handleSendCode} className="rp-form">
            <div className="rp-form-title">View Your Reports</div>
            <p className="rp-form-sub">Enter the email and phone you used to generate reports.</p>
            {error && <div className="rp-error">{error}</div>}
            <input
              className="rp-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="rp-input"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <button className="rp-submit" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send Verification Code →"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerify} className="rp-form">
            <div className="rp-form-title">Enter the Code</div>
            <p className="rp-form-sub">We sent a 6-digit code to <strong>{email}</strong></p>
            {error && <div className="rp-error">{error}</div>}
            <input
              className="rp-input rp-input--otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button className="rp-submit" type="submit" disabled={pending}>
              {pending ? "Verifying…" : "View My Reports →"}
            </button>
            <button type="button" className="rp-link-btn" onClick={() => { setStep("identity"); setError(null); }}>
              ← Back
            </button>
          </form>
        )}

        {step === "reports" && (
          <div className="rp-reports">
            <div className="rp-reports-title">
              {reports.length === 0 ? "No reports yet" : `${reports.length} report${reports.length !== 1 ? "s" : ""} found`}
            </div>
            {reports.length === 0 ? (
              <p className="rp-empty">Analyze a store to see your XR opportunity report here.</p>
            ) : (
              reports.map((r) => <ReportCard key={r.id} report={r} />)
            )}
            <a href="/" className="rp-submit" style={{ display: "block", textAlign: "center", marginTop: 24, textDecoration: "none" }}>
              Analyze Another Store →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
