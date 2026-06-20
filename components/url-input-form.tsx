"use client";

import { useEffect, useRef, useState } from "react";
import { AnalysisProgress } from "./analysis-progress";
import { ResultsView } from "./results-view";
import { RightPanelCarousel } from "./right-panel-carousel";
import { useToast } from "@/components/toast";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import type { XRReport } from "@/lib/types";

type AppState = "idle" | "analyzing" | "transition" | "report";
type TransitionPhase = "exiting" | null;

export type RecentReportSummary = {
  id: string;
  storeName: string;
  storeUrl: string;
  productCount: number;
  opportunityScore: number | null;
};

type OwnedReport = {
  id: string;
  storeName: string | null;
  storeUrl: string;
  productCount: number | null;
  xrReadinessScore: string | null;
  pdfUrl: string | null;
  createdAt: string | null;
};

const CHIP_GROUPS = [
  ["mvmt.com", "mejuri.com", "gymshark.com"],
];

function normalizeLabel(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function contactIdentity(email: string, phone: string): string {
  return `${normalizeEmail(email)}|${normalizePhone(phone)}`;
}

export function UrlInputForm({
  recentReports: _recentReports,
}: {
  recentReports: RecentReportSummary[];
}) {
  void _recentReports;
  const [url, setUrl] = useState("");
  const [contactStepOpen, setContactStepOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedIdentity, setVerifiedIdentity] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem("ctruh_verified_identity");
  });
  const [pendingAnalyzeUrl, setPendingAnalyzeUrl] = useState<string | null>(null);

  const [lookupOpen] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupPending, setLookupPending] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [ownedReports, setOwnedReports] = useState<OwnedReport[]>([]);

  const [appState, setAppState] = useState<AppState>("idle");
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<XRReport | null>(null);
  const [pendingReport, setPendingReport] = useState<XRReport | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [progressDone, setProgressDone] = useState(false);
  const [streamProductCount, setStreamProductCount] = useState<number | null>(null);
  const [streamOpportunities, setStreamOpportunities] = useState<string[] | null>(null);
  const [meshyProgress, setMeshyProgress] = useState<Array<{ product: string; progress: number }>>([]);
  const [chipGroupIndex, setChipGroupIndex] = useState(0);
  const [chipsFading, setChipsFading] = useState(false);
  const [clickedChip, setClickedChip] = useState<string | null>(null);
  const reportStageRef = useRef<HTMLDivElement | null>(null);

  const transitionTimerIds = useRef<number[]>([]);
  const transitionFired = useRef(false);
  const { toast } = useToast();

  useEffect(() => () => transitionTimerIds.current.forEach(window.clearTimeout), []);

  useEffect(() => {
    if (appState !== "idle") return;
    const interval = window.setInterval(() => {
      setChipsFading(true);
      window.setTimeout(() => {
        setChipGroupIndex((i) => (i + 1) % CHIP_GROUPS.length);
        setChipsFading(false);
      }, 300);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [appState]);

  useEffect(() => {
    if (appState !== "report") return;
    const node = reportStageRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [appState]);

  useEffect(() => {
    if (transitionFired.current) return;
    if (appState !== "analyzing" || !progressDone || !pendingReport) return;

    transitionFired.current = true;
    const capturedReport = pendingReport;

    function at(fn: () => void, ms: number) {
      transitionTimerIds.current.push(window.setTimeout(fn, ms));
    }

    at(() => {
      setAppState("transition");
      setTransitionPhase("exiting");
      at(() => {
        setReport(capturedReport);
        setPendingReport(null);
        setRequestPending(false);
        setTransitionPhase(null);
        setAppState("report");
      }, 520);
    }, 0);
  }, [appState, progressDone, pendingReport]);

  async function runAnalysis(targetUrl: string) {
    const trimmed = targetUrl.trim();
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    if (!trimmed) return;

    setError(null);
    setReport(null);
    setPendingReport(null);
    setProgressDone(false);
    setStreamProductCount(null);
    setStreamOpportunities(null);
    setMeshyProgress([]);
    setRequestPending(true);
    transitionFired.current = false;
    transitionTimerIds.current = [];
    setAppState("analyzing");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, email: normalizedEmail, phone: normalizedPhone }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          const event = JSON.parse(trimmedLine) as {
            type: string;
            count?: number;
            opportunities?: string[];
            data?: XRReport;
            message?: string;
            product?: string;
            taskIndex?: number;
            progress?: number;
          };

          if (event.type === "scraped" && event.count != null) {
            setStreamProductCount(event.count);
          } else if (event.type === "scored" && event.opportunities) {
            setStreamOpportunities(event.opportunities);
          } else if (event.type === "meshy_progress" && event.product != null && event.taskIndex != null) {
            setMeshyProgress((prev) => {
              const next = [...prev];
              next[event.taskIndex!] = { product: event.product!, progress: event.progress ?? 0 };
              return next;
            });
          } else if (event.type === "report" && event.data) {
            setPendingReport(event.data);
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Analysis failed");
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong generating your report. Try again.";
      setRequestPending(false);
      setAppState("idle");
      setError(msg);
      toast("Analysis failed", msg, "error");
    }
  }

  async function requestVerification() {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!isValidEmail(normalizedEmail)) {
      setVerificationError("Enter a valid email address.");
      return false;
    }

    if (!isValidPhone(normalizedPhone)) {
      setVerificationError("Enter a valid phone number.");
      return false;
    }

    setVerificationPending(true);
    setVerificationError(null);

    try {
      const res = await fetch("/api/contact/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, phone: normalizedPhone }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not send verification email.");
      setVerificationSent(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send verification email.";
      setVerificationError(msg);
      toast("Verification failed", msg, "error");
      return false;
    } finally {
      setVerificationPending(false);
    }
  }

  async function confirmVerificationAndAnalyze() {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);
    setVerificationPending(true);
    setVerificationError(null);

    try {
      const res = await fetch("/api/contact/confirm-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          phone: normalizedPhone,
          code: verificationCode,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      const identity = contactIdentity(normalizedEmail, normalizedPhone);
      setVerifiedIdentity(identity);
      window.sessionStorage.setItem("ctruh_verified_identity", identity);
      setVerificationCode("");
      setVerificationSent(false);

      if (pendingAnalyzeUrl) {
        const target = pendingAnalyzeUrl;
        setPendingAnalyzeUrl(null);
        void runAnalysis(target);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed.";
      setVerificationError(msg);
      toast("Code incorrect", msg, "error");
    } finally {
      setVerificationPending(false);
    }
  }

  function contactIsVerifiedForCurrentInput() {
    return verifiedIdentity === contactIdentity(email, phone);
  }

  async function handleStartAnalysis(targetUrl: string) {
    if (!targetUrl.trim()) return;
    if (!contactIsVerifiedForCurrentInput()) {
      setPendingAnalyzeUrl(targetUrl);
      await requestVerification();
      return;
    }
    void runAnalysis(targetUrl);
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!contactStepOpen) {
      if (!url.trim()) return;
      setContactStepOpen(true);
      return;
    }
    void handleStartAnalysis(url);
  }

  function handleChipClick(store: string) {
    setClickedChip(store);
    setUrl(store);
    window.setTimeout(() => setClickedChip(null), 150);
    window.setTimeout(() => setContactStepOpen(true), 300);
  }

  async function handleLookupReports() {
    const normalizedEmail = normalizeEmail(lookupEmail);
    const normalizedPhone = normalizePhone(lookupPhone);

    setLookupPending(true);
    setLookupError(null);
    setOwnedReports([]);

    try {
      const res = await fetch("/api/contact/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, phone: normalizedPhone }),
      });
      const data = await res.json() as { error?: string; reports?: OwnedReport[] };
      if (!res.ok) throw new Error(data.error || "Could not fetch reports.");
      setOwnedReports(data.reports || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not fetch reports.";
      setLookupError(msg);
      toast("Could not load reports", msg, "error");
    } finally {
      setLookupPending(false);
    }
  }

  function handleReset() {
    transitionTimerIds.current.forEach(window.clearTimeout);
    transitionTimerIds.current = [];
    transitionFired.current = false;
    setUrl("");
    setContactStepOpen(false);
    setError(null);
    setReport(null);
    setPendingReport(null);
    setRequestPending(false);
    setProgressDone(false);
    setStreamProductCount(null);
    setStreamOpportunities(null);
    setTransitionPhase(null);
    setAppState("idle");
  }

  const visibleChips = CHIP_GROUPS[chipGroupIndex];

  function handleContactInput(next: { email?: string; phone?: string }) {
    const nextEmail = next.email ?? email;
    const nextPhone = next.phone ?? phone;

    if (next.email !== undefined) setEmail(next.email);
    if (next.phone !== undefined) setPhone(next.phone);

    if (verifiedIdentity && verifiedIdentity !== contactIdentity(nextEmail, nextPhone)) {
      setVerificationSent(false);
      setVerificationCode("");
    }
  }

  return (
    <div className="xr-input-shell">
      {appState !== "report" && (
        <div className={`xr-idle-shell${transitionPhase === "exiting" ? " is-exiting" : ""}`}>
          <section className="xr-idle-left">
            <img
              src="https://www.ctruh.com/assets/images/ctruh-logo.png"
              alt="Ctruh"
              className="xr-wordmark"
            />
            <div className="xr-idle-content">
              <div className="xr-reports-toggle-row">
                <a href="/reports" className="xr-link-button">
                  View your reports →
                </a>
              </div>

              {lookupOpen && (
                <div className="xr-lookup-panel">
                  <div className="xr-lookup-title">Find your previous reports</div>
                  <div className="xr-form-stack">
                    <div className="xr-input-wrapper">
                      <input
                        type="email"
                        value={lookupEmail}
                        onChange={(e) => setLookupEmail(e.target.value)}
                        placeholder="Email address"
                        className="xr-input"
                      />
                    </div>
                    <div className="xr-input-wrapper">
                      <input
                        type="tel"
                        value={lookupPhone}
                        onChange={(e) => setLookupPhone(e.target.value)}
                        placeholder="Phone number"
                        className="xr-input"
                      />
                    </div>
                    <button
                      type="button"
                      className="xr-secondary-button"
                      onClick={() => void handleLookupReports()}
                      disabled={lookupPending}
                    >
                      {lookupPending ? "Finding reports..." : "See my reports"}
                    </button>
                  </div>

                  {lookupError ? <div className="xr-error">{lookupError}</div> : null}

                  {ownedReports.length > 0 && (
                    <div className="xr-owned-reports">
                      {ownedReports.map((item) => (
                        <div key={item.id} className="xr-owned-report-card">
                          <div>
                            <div className="xr-owned-report-title">{item.storeName || item.storeUrl}</div>
                            <div className="xr-owned-report-meta">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Saved report"} · {item.productCount ?? 0} products
                            </div>
                          </div>
                          {item.pdfUrl ? (
                            <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="xr-link-button">
                              Download PDF
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="xr-label">Powered by Ctruh</div>
              <h1 className="xr-headline">
                {["Find Your 3D + AR", "Opportunity"].map((line, i) => (
                  <span key={line} className="xr-headline-line">
                    <span
                      className="xr-headline-word"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {line}
                    </span>
                  </span>
                ))}
              </h1>
              <p className="xr-subtext">
                Paste your Shopify URL to see which products are best suited for 3D viewers,
                AR, virtual try-on, and higher-conversion shopping experiences.
              </p>
              <div className="xr-input-anchor">
                {appState === "analyzing" ? (
                  <div className="xr-url-lock">
                    <div className="xr-url-lock-pill">
                      <span className="xr-url-lock-spinner" />
                      <span className="xr-url-lock-text">{normalizeLabel(url)}</span>
                    </div>
                    <p className="xr-url-lock-status">Scanning your catalog for XR opportunities…</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="xr-input-card">
                    {!contactStepOpen ? (
                      <div className="xr-input-row">
                        <div className="xr-input-wrapper">
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={appState === "idle" ? "e.g. gymshark.com" : ""}
                            className="xr-input"
                            disabled={requestPending}
                            autoFocus={appState === "idle"}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!url.trim() || requestPending}
                          className="xr-primary-button"
                        >
                          Analyze My Store →
                        </button>
                      </div>
                    ) : (
                      <div className="xr-form-stack">
                        <div className="xr-input-wrapper">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleContactInput({ email: e.target.value })}
                            placeholder="Email address"
                            className="xr-input"
                            disabled={requestPending || verificationSent}
                            autoFocus
                          />
                        </div>
                        <div className="xr-input-wrapper">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => handleContactInput({ phone: e.target.value })}
                            placeholder="Phone number"
                            className="xr-input"
                            disabled={requestPending || verificationSent}
                          />
                        </div>
                        {verificationSent ? (
                          <>
                            <div className="xr-input-wrapper">
                              <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="Enter 6-digit code from email"
                                className="xr-input"
                              />
                            </div>
                            <button
                              type="button"
                              className="xr-primary-button xr-primary-button-full"
                              disabled={verificationPending || verificationCode.trim().length < 6}
                              onClick={() => void confirmVerificationAndAnalyze()}
                            >
                              {verificationPending ? "Verifying..." : "Verify & Analyze →"}
                            </button>
                            <button
                              type="button"
                              className="xr-link-button"
                              disabled={verificationPending}
                              onClick={() => void requestVerification()}
                            >
                              Resend code
                            </button>
                          </>
                        ) : (
                          <button
                            type="submit"
                            disabled={!url.trim() || requestPending}
                            className="xr-primary-button xr-primary-button-full"
                          >
                            {verificationPending ? "Sending code..." : contactIsVerifiedForCurrentInput() ? "Analyze My Store →" : "Verify & Analyze →"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="xr-link-button"
                          onClick={() => { setContactStepOpen(false); setVerificationSent(false); }}
                        >
                          ← Back
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {appState === "idle" && !contactStepOpen && (
                  <>
                    <div className="xr-chip-label">Try with:</div>
                    <div className={`xr-chip-row ${chipsFading ? "is-fading" : ""}`}>
                      {visibleChips.map((store) => (
                        <button
                          key={store}
                          type="button"
                          className={`xr-chip ${clickedChip === store ? "is-clicked" : ""}`}
                          onClick={() => handleChipClick(store)}
                        >
                          {store}
                        </button>
                      ))}
                    </div>
                    <p className="xr-idle-footer">
                      Start with your store URL. We&apos;ll ask for contact details next.
                    </p>
                  </>
                )}

                {verificationError ? <div className="xr-error">{verificationError}</div> : null}
                {error ? <div className="xr-error">{error}</div> : null}
              </div>
            </div>
          </section>

          {appState === "idle" ? (
            <aside className="xr-idle-right">
              <RightPanelCarousel />
            </aside>
          ) : (
            <aside className="xr-analyzing-right">
              <AnalysisProgress
                key={url}
                reportReady={Boolean(pendingReport)}
                onComplete={() => setProgressDone(true)}
                reportPreview={pendingReport}
                storeUrl={url}
                streamProductCount={streamProductCount}
                streamOpportunities={streamOpportunities}
                meshyProgress={meshyProgress}
              />
            </aside>
          )}
        </div>
      )}

      {appState === "report" && report && (
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
                <span>✓ {normalizeLabel(url)}</span>
                <button type="button" onClick={handleReset}>
                  Analyze another →
                </button>
              </div>
            </div>
          </div>
          <div ref={reportStageRef} className="xr-report-shell">
            <ResultsView report={report} onReset={handleReset} />
          </div>
        </div>
      )}
    </div>
  );
}
