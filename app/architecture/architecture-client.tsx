"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Intersection-observer hook ──────────────────────────────────────────── */
function useVisible(threshold = 0.18) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Animated counter ────────────────────────────────────────────────────── */
function Counter({ to, prefix = "", suffix = "", duration = 1400 }: {
  to: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const { ref, visible } = useVisible(0.5);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * to));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, to, duration]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

/* ─── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ label, title, sub }: { label: string; title: string; sub: string }) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      textAlign: "center", marginBottom: 48,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 500ms ease, transform 500ms ease",
    }}>
      <div style={{
        display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
        textTransform: "uppercase", color: "rgba(0,87,255,0.65)",
        background: "rgba(0,87,255,0.1)", borderRadius: 999, padding: "5px 16px", marginBottom: 16,
      }}>{label}</div>
      <h2 style={{ margin: "0 auto 14px", fontSize: "clamp(24px,3.5vw,40px)", fontWeight: 800, color: "#fff", maxWidth: 640 }}>{title}</h2>
      <p style={{ margin: "0 auto", fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 560, lineHeight: 1.7 }}>{sub}</p>
    </div>
  );
}

/* ─── Stage card ──────────────────────────────────────────────────────────── */
function StageCard({ num, icon, title, desc, detail, delay = 0 }: {
  num: string; icon: string; title: string; desc: string; detail: string; delay?: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 12,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(28px)",
      transition: `opacity 550ms ${delay}ms ease, transform 550ms ${delay}ms ease`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: "rgba(0,87,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(0,87,255,0.6)", textTransform: "uppercase" }}>Stage {num}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 2 }}>{title}</div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.55)", flex: 1 }}>{desc}</p>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#6ba3ff", background: "rgba(0,87,255,0.12)", borderRadius: 8, padding: "6px 10px" }}>{detail}</div>
    </div>
  );
}

/* ─── Dimension card ──────────────────────────────────────────────────────── */
function DimCard({ icon, name, desc, weight, delay = 0 }: {
  icon: string; name: string; desc: string; weight: string; delay?: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: 20,
      display: "flex", flexDirection: "column",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 500ms ${delay}ms ease, transform 500ms ${delay}ms ease`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{name}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, flex: 1 }}>{desc}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg Weight</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#6ba3ff" }}>{weight}</div>
      </div>
    </div>
  );
}

/* ─── Category weight row ─────────────────────────────────────────────────── */
function WeightRow({ cat, v3d, vto, cfg, imm, delay = 0 }: {
  cat: string; v3d: number; vto: number; cfg: number; imm: number; delay?: number;
}) {
  const { ref, visible } = useVisible(0.1);
  const w = (n: number) => `${Math.round(n * 100)}%`;
  const bar = (n: number, color: string) => (
    <div style={{ flex: 1 }}>
      <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 999, background: color,
          width: visible ? w(n) : "0%",
          transition: `width 800ms ${delay + 100}ms cubic-bezier(0.4,0,0.2,1)`,
        }} />
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3, textAlign: "center" }}>{w(n)}</div>
    </div>
  );
  return (
    <div ref={ref} style={{
      display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 1fr",
      alignItems: "center", gap: 12, padding: "12px 0",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      opacity: visible ? 1 : 0,
      transition: `opacity 400ms ${delay}ms ease`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{cat}</div>
      {bar(v3d, "#6ba3ff")}
      {bar(vto, "#a78bfa")}
      {bar(cfg, "#34d399")}
      {bar(imm, "#fb923c")}
    </div>
  );
}

/* ─── Fallback step ───────────────────────────────────────────────────────── */
function FallbackStep({ level, title, desc, badge, color, delay = 0 }: {
  level: string; title: string; desc: string; badge: string; color: string; delay?: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      display: "flex", gap: 16, alignItems: "flex-start",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-24px)",
      transition: `opacity 500ms ${delay}ms ease, transform 500ms ${delay}ms ease`,
    }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
        }}>{level}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</div>
          <span style={{
            fontSize: 10, fontWeight: 700, background: color + "33", color,
            borderRadius: 6, padding: "2px 8px", letterSpacing: "0.08em",
          }}>{badge}</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

/* ─── Cost card (proper component so hook isn't called in .map) ───────────── */
function CostCard({ icon, title, cost, detail, note, color, delay }: {
  icon: string; title: string; cost: string; detail: string; note: string; color: string; delay: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: 24,
      display: "flex", flexDirection: "column",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 500ms ${delay}ms ease, transform 500ms ${delay}ms ease`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 8 }}>{cost}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", flex: 1 }}>{detail}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.5, marginTop: 8 }}>{note}</div>
    </div>
  );
}

/* ─── Timeline item (3D roadmap) ──────────────────────────────────────────── */
function TimelineItem({ phase, icon, name, color, badge, points, delay }: {
  phase: string; icon: string; name: string; color: string; badge: string; points: string[]; delay: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      display: "flex", gap: 32, paddingBottom: 48, paddingLeft: 56,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-20px)",
      transition: `opacity 500ms ${delay}ms ease, transform 500ms ${delay}ms ease`,
    }}>
      <div style={{
        position: "absolute", left: 10, width: 22, height: 22, borderRadius: "50%",
        background: color, border: "3px solid #060d22",
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{phase}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{icon} {name}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color, background: color + "22", borderRadius: 6, padding: "2px 8px" }}>{badge}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 20 }}>
          <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
            {points.map((p) => (
              <li key={p} style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─── Infra card ──────────────────────────────────────────────────────────── */
function InfraCard({ icon, title, status, statusColor, desc, detail, delay }: {
  icon: string; title: string; status: string; statusColor: string;
  desc: string; detail: string; delay: number;
}) {
  const { ref, visible } = useVisible();
  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, padding: 24,
      display: "flex", flexDirection: "column",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 500ms ${delay}ms ease, transform 500ms ${delay}ms ease`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 26 }}>{icon}</div>
        <span style={{
          fontSize: 9, fontWeight: 700, color: statusColor, background: statusColor + "22",
          borderRadius: 6, padding: "3px 8px", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{status}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, flex: 1 }}>{desc}</div>
      <div style={{ fontSize: 11, color: "rgba(0,87,255,0.7)", background: "rgba(0,87,255,0.1)", borderRadius: 8, padding: "6px 10px", marginTop: 12 }}>{detail}</div>
    </div>
  );
}

/* ─── Stack chip ──────────────────────────────────────────────────────────── */
function StackChip({ name, role, color, delay }: {
  name: string; role: string; color: string; delay: number;
}) {
  const { ref, visible } = useVisible(0.05);
  return (
    <div ref={ref} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "14px 16px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 400ms ${delay}ms ease, transform 400ms ${delay}ms ease`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{role}</div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function ArchitectureClient() {
  return (
    <div style={{
      minHeight: "100vh", background: "#060d22", color: "#fff",
      fontFamily: "Inter, sans-serif", overflowX: "hidden",
    }}>
      <style>{`
        @keyframes floatA {
          0%,100% { transform: translateY(0) rotate(8deg); }
          50%      { transform: translateY(-14px) rotate(8deg); }
        }
        @keyframes floatB {
          0%,100% { transform: translateY(0) rotate(-6deg); }
          50%      { transform: translateY(-10px) rotate(-6deg); }
        }
        @keyframes floatC {
          0%,100% { transform: translateY(0) rotate(12deg); }
          50%      { transform: translateY(-8px) rotate(12deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .arch-hero-word {
          display: inline-block;
          opacity: 0;
          animation: fadeUp 600ms ease forwards;
        }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,13,34,0.85)", backdropFilter: "blur(12px)",
      }}>
        <Link href="/" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.06em", color: "#fff", textDecoration: "none" }}>
          CTRUH
        </Link>
        <Link href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>← Back to Analyzer</Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", padding: "100px 32px 80px", textAlign: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,-50%)",
          width: 700, height: 400,
          background: "radial-gradient(ellipse, rgba(0,87,255,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Floating stat cards */}
        <div style={{
          position: "absolute", top: "18%", left: "8%", width: 148,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "14px 16px",
          animation: "floatA 7s ease-in-out infinite",
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.4 }}>Cost / Report</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 6, lineHeight: 1 }}>₹45</div>
          <div style={{ fontSize: 9, color: "#34d399", marginTop: 6, lineHeight: 1.3 }}>↓ uses gpt-4o-mini</div>
        </div>
        <div style={{
          position: "absolute", top: "28%", right: "7%", width: 138,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "14px 16px",
          animation: "floatB 8.5s ease-in-out infinite -2s",
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.4 }}>AI Models</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 6, lineHeight: 1 }}>2</div>
          <div style={{ fontSize: 9, color: "#6ba3ff", marginTop: 6, lineHeight: 1.3 }}>≈ ₹14 only</div>
        </div>
        <div style={{
          position: "absolute", bottom: "22%", left: "12%", width: 128,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: "12px 14px",
          animation: "floatC 9s ease-in-out infinite -4s",
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1.4 }}>Fallbacks</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginTop: 6, lineHeight: 1 }}>3×</div>
          <div style={{ fontSize: 9, color: "#fb923c", marginTop: 6, lineHeight: 1.3 }}>Zero data loss</div>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "rgba(0,87,255,0.7)",
            background: "rgba(0,87,255,0.12)", borderRadius: 999, padding: "6px 18px", marginBottom: 24,
          }}>System Architecture</div>

          <h1 style={{ margin: "0 auto 24px", maxWidth: 760, fontSize: "clamp(40px,6vw,72px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {"Under the Hood".split(" ").map((word, i) => (
              <span key={i} className="arch-hero-word" style={{ animationDelay: `${i * 140}ms`, marginRight: "0.28em" }}>{word}</span>
            ))}
          </h1>

          <p style={{ margin: "0 auto 48px", maxWidth: 580, fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>
            From a Shopify URL to a full XR readiness report in under 60 seconds — here&apos;s exactly how we do it, what it costs, and where we&apos;re headed.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {[
              { val: 45, prefix: "₹", suffix: "", label: "per full report" },
              { val: 14, prefix: "₹", suffix: "", label: "for 2 AI calls only" },
              { val: 5, prefix: "", suffix: " stages", label: "in the pipeline" },
              { val: 3, prefix: "", suffix: " layers", label: "of fallback" },
            ].map(({ val, prefix, suffix, label }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14, padding: "16px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>
                  <Counter to={val} prefix={prefix} suffix={suffix} />
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", maxWidth: 1080, margin: "0 auto" }}>
        <SectionHeader
          label="Pipeline"
          title="5-Stage Analysis Engine"
          sub="Each request flows through a deterministic pipeline — streaming progress back to the client via NDJSON at every stage."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          <StageCard num="1" icon="🔗" title="URL Scraping" delay={0}
            desc="4-strategy cascade: products.json → sitemap.xml → JSON-LD HTML → Firecrawl JS render. First success wins."
            detail="Up to 10 products · 4 fallback strategies" />
          <StageCard num="2" icon="🤖" title="AI Scoring" delay={80}
            desc="gpt-4o-mini scores each product on 4 XR dimensions via structured JSON. Token usage logged per batch for cost auditing."
            detail="gpt-4o-mini · batches of 5 · 600 max tokens" />
          <StageCard num="3" icon="🎲" title="3D Generation" delay={160}
            desc="Top-scoring products get a Meshy image-to-3D task. GLB + thumbnail streamed back when SUCCEEDED."
            detail="Meshy API · PBR enabled · 240s timeout" />
          <StageCard num="4" icon="📊" title="Report Assembly" delay={240}
            desc="Category-weighted XR Readiness Score, ROI scenarios at 5K/25K/100K traffic, top opportunities ranked."
            detail="Weighted scoring · ROI at 3 traffic tiers" />
          <StageCard num="5" icon="💾" title="Persist in BG" delay={320}
            desc="After streaming the report, PDF is generated → S3, report + token logs saved to Postgres — all off the critical path."
            detail="S3 · Drizzle ORM · token cost ledger" />
        </div>

        <div style={{
          marginTop: 32, background: "rgba(0,87,255,0.08)",
          border: "1px solid rgba(0,87,255,0.25)", borderRadius: 14, padding: "20px 24px",
          display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Streaming via NDJSON</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
              The API route returns a <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>ReadableStream</code> of newline-delimited JSON events.
              The UI receives <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>phase</code>, <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>scraped</code>, <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>scored</code>, and <code style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, padding: "1px 6px", fontSize: 12 }}>meshy_progress</code> events in real time — no polling needed.
              The heavy PDF + DB work fires <strong style={{ color: "#fff" }}>after</strong> the stream closes so the user never waits for it.
            </div>
          </div>
        </div>
      </section>

      {/* ── Scoring engine ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <SectionHeader
            label="Scoring Engine"
            title="4 XR Dimensions × Category Weights"
            sub="Every product is scored on four axes. The overall XR Readiness Score is a weighted sum — weights shift per category so wearables aren't penalised for low 3D Visualization."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 16, marginBottom: 48 }}>
            <DimCard icon="🎲" name="3D Visualization" desc="Shape complexity, surface detail, physical depth — how much does seeing it in 3D help?" weight="~28%" delay={0} />
            <DimCard icon="👗" name="Virtual Try-On" desc="Can the user try it? Wearables, footwear, jewellery, eyewear score highest." weight="~25%" delay={80} />
            <DimCard icon="🎛️" name="Configurator" desc="How many meaningful variants exist — color, material, size? More = higher score." weight="~25%" delay={160} />
            <DimCard icon="✨" name="Immersive Commerce" desc="Premium feel, discovery value, overall wow factor in an AR/VR context." weight="~25%" delay={240} />
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 28px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Category Weight Matrix
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 1fr",
              gap: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div />
              {[{ label: "3D Vis", color: "#6ba3ff" }, { label: "Try-On", color: "#a78bfa" }, { label: "Config", color: "#34d399" }, { label: "Immersive", color: "#fb923c" }]
                .map(({ label, color }) => (
                  <div key={label} style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.08em", textAlign: "center" }}>{label}</div>
                ))}
            </div>
            <WeightRow cat="Wearables"       v3d={0.20} vto={0.40} cfg={0.20} imm={0.20} delay={0} />
            <WeightRow cat="Footwear"         v3d={0.20} vto={0.40} cfg={0.20} imm={0.20} delay={60} />
            <WeightRow cat="Jewellery"        v3d={0.35} vto={0.30} cfg={0.15} imm={0.20} delay={120} />
            <WeightRow cat="Home & Furniture" v3d={0.40} vto={0.05} cfg={0.35} imm={0.20} delay={180} />
            <WeightRow cat="Beauty"           v3d={0.30} vto={0.25} cfg={0.10} imm={0.35} delay={240} />
            <WeightRow cat="Electronics"      v3d={0.40} vto={0.05} cfg={0.35} imm={0.20} delay={300} />
            <WeightRow cat="Accessories"      v3d={0.25} vto={0.30} cfg={0.20} imm={0.25} delay={360} />
          </div>
        </div>
      </section>

      {/* ── Fallback chain ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", maxWidth: 1080, margin: "0 auto" }}>
        <SectionHeader
          label="Resilience"
          title="3-Layer Fallback Chain"
          sub="No data loss from a flaky model response. Every scoring call has three tries before we touch any heuristics."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
              Scraping Strategy
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <FallbackStep level="1" title="Shopify JSON API" badge="Primary" color="#0057ff" delay={0}
                desc="/products.json and /collections/all/products.json — multiple URL variants attempted. Fastest path, works on ~85% of stores." />
              <FallbackStep level="2" title="Sitemap XML" badge="Fallback" color="#a78bfa" delay={100}
                desc="Parse sitemap.xml → nested sitemap_products_1.xml → fetch individual product .json pages. Handles custom domain routing." />
              <FallbackStep level="3" title="JSON-LD Extraction" badge="Fallback" color="#34d399" delay={200}
                desc="Scrape /collections/all HTML, extract application/ld+json blocks, parse Product schema. Works on headless stores." />
              <FallbackStep level="4" title="Firecrawl AI Render" badge="Last Resort" color="#fb923c" delay={300}
                desc="Full JS rendering + LLM extraction via Firecrawl. Handles bot-protected, SPA, and Shopify Plus custom storefronts." />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 24 }}>
              AI Scoring Fallback
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <FallbackStep level="1" title="Structured JSON Output" badge="Primary" color="#0057ff" delay={0}
                desc="GPT-4o mini with response_format: json_object and a Zod schema. Strict parse succeeds on >95% of calls." />
              <FallbackStep level="2" title="Normalizer Recovery" badge="Auto-repair" color="#a78bfa" delay={100}
                desc="If strict parse fails, a field-by-field normalizer handles aliased keys (scoreBreakdown, 3dVisualization, etc.), out-of-range scores, and confidence typos." />
              <FallbackStep level="3" title="Simplified Retry" badge="Fallback" color="#34d399" delay={200}
                desc="If normalizer still fails, a second GPT call fires with a minimal prompt — just title, price, variant count. Lower fidelity but never silent." />
              <FallbackStep level="4" title="Rule-Based Heuristics" badge="Last Resort" color="#fb923c" delay={300}
                desc="If both AI calls fail, heuristic scoring kicks in: category → try-on score, variant count → configurator score, price tier → immersive score. No crash, no null." />
            </div>
          </div>
        </div>
      </section>

      {/* ── Cost breakdown ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <SectionHeader
            label="Cost Engineering"
            title="₹45 per Full Report"
            sub="We chose gpt-4o-mini deliberately — it's 10× cheaper than GPT-4o with near-identical structured output quality for classification tasks."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
            <CostCard icon="🧠" title="AI Scoring" cost="~₹28" detail="gpt-4o-mini · up to 10 products · vision"
              note="Azure OpenAI · cost computed via calcGPTCost() per batch" color="#6ba3ff" delay={0} />
            <CostCard icon="🎲" title="3D Generation" cost="~₹12" detail="Meshy image-to-3D · top 2 products"
              note="Per-task pricing · PBR enabled · GLB + thumbnail output" color="#a78bfa" delay={80} />
            <CostCard icon="📄" title="PDF + Storage" cost="~₹3" detail="React-PDF render · S3 upload"
              note="PDF render is free · S3 egress minimal · runs off critical path" color="#34d399" delay={160} />
            <CostCard icon="🔍" title="Scraping" cost="~₹2" detail="Shopify JSON API (free, primary)"
              note="Firecrawl billing only triggers as last-resort fallback" color="#fb923c" delay={240} />
          </div>

          <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "rgba(0,87,255,0.08)", border: "1px solid rgba(0,87,255,0.25)", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,87,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Just 2 AI calls</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 6 }}>₹14</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                If only the scoring step runs (no 3D generation, no PDF), the full pipeline costs just ₹14 in AI tokens — making it viable for bulk catalog pre-screening.
              </div>
            </div>
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(52,211,153,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Lead magnet economics</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 6 }}>₹45</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                A full report with 3D previews and a downloadable PDF costs ₹45 to generate — far below what a human consultant charges for a single slide, and it lands a qualified XR lead.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3D generation roadmap ────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", maxWidth: 1080, margin: "0 auto" }}>
        <SectionHeader
          label="3D Generation"
          title="Meshy Today → Local GPU Tomorrow"
          sub="We picked Meshy because it's the fastest path to usable GLBs from a product image. The architecture is designed to swap providers without touching the pipeline."
        />
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 20, top: 0, bottom: 0, width: 2,
            background: "linear-gradient(180deg, #0057ff 0%, #a78bfa 50%, #34d399 100%)",
          }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <TimelineItem phase="Now" icon="🎲" name="Meshy AI" color="#6ba3ff" badge="Active" delay={0} points={[
              "image-to-3D via REST API — no GPU required",
              "PBR material extraction, GLB + thumbnail output",
              "240s timeout with progress polling every 10s",
              "Constraint: API rate limits, per-task cost, external dependency",
            ]} />
            <TimelineItem phase="Near-term" icon="🤖" name="Hunyuan 3D" color="#a78bfa" badge="Tested" delay={120} points={[
              "Tencent open-source model, state-of-the-art quality",
              "Requires GPU — didn't have one available at prototype stage",
              "Would reduce per-model cost to near zero at scale",
              "Can self-host on any A100/H100 cloud instance",
            ]} />
            <TimelineItem phase="Scale" icon="⚡" name="VersaAI / Ctruh GPU" color="#34d399" badge="Roadmap" delay={240} points={[
              "Ctruh's own VersaAI pipeline for 3D generation",
              "Single API, zero external billing, full control over quality",
              "Or any local model deployed on a GPU cluster",
              "At 1000+ reports/day, self-hosted cost approaches ₹0/model",
            ]} />
          </div>
        </div>
      </section>

      {/* ── Infrastructure ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <SectionHeader
            label="Infrastructure"
            title="Caching, Queuing & Scale"
            sub="The current system is fast enough for a prototype. Here's what's already wired and what plugs in for production scale."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            <InfraCard icon="⚡" title="Redis Cache" status="Implemented" statusColor="#34d399" delay={0}
              desc="Analysis results are cached by store URL hash. Identical store analyses skip the AI pipeline entirely — instant results, zero token spend."
              detail="TTL-based invalidation · Redis hash by normalized URL" />
            <InfraCard icon="📋" title="Queue System" status="Planned" statusColor="#fb923c" delay={60}
              desc="For high concurrency, a job queue (BullMQ / Vercel Queues) absorbs bursts and prevents hitting Meshy or OpenAI rate limits under load."
              detail="BullMQ or Vercel Queues · rate-limit shield · retry backoff" />
            <InfraCard icon="🗄️" title="PostgreSQL + Drizzle" status="Implemented" statusColor="#34d399" delay={120}
              desc="All reports, contacts, token usage, and GLB URLs are persisted. Token ledger tracks cost per operation — easy to audit spend per report."
              detail="Drizzle ORM · token_logs table · cost audit trail" />
            <InfraCard icon="☁️" title="S3 Storage" status="Implemented" statusColor="#34d399" delay={180}
              desc="Generated PDFs and 3D model previews uploaded to S3. Public URLs served in report cards and download links."
              detail="AWS S3 · pre-signed URLs · PDF + GLB assets" />
            <InfraCard icon="📧" title="Resend Email" status="Implemented" statusColor="#34d399" delay={240}
              desc="OTP verification sent via Resend. Keeps bot traffic off the analysis endpoint — only email-verified contacts can generate reports."
              detail="Resend API · OTP gate · contact verification flow" />
            <InfraCard icon="🔢" title="Batch Processing" status="Implemented" statusColor="#34d399" delay={300}
              desc="Products scored in parallel batches of 5 with Promise.all. Saturates the rate limit window without hitting it — deterministic throughput."
              detail="Batch size 5 · Promise.all · sequential batches" />
          </div>
        </div>
      </section>

      {/* ── Tech stack ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px", maxWidth: 1080, margin: "0 auto" }}>
        <SectionHeader
          label="Stack"
          title="What We Built With"
          sub="Every dependency was chosen for speed of iteration and production readiness."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
          <StackChip name="Next.js 15"    role="App framework · App Router"    color="#fff"     delay={0} />
          <StackChip name="Azure OpenAI"  role="GPT-4o mini · scoring"          color="#6ba3ff"  delay={40} />
          <StackChip name="Meshy AI"      role="Image → 3D (GLB)"              color="#a78bfa"  delay={80} />
          <StackChip name="Firecrawl"     role="JS render + LLM scraping"      color="#fb923c"  delay={120} />
          <StackChip name="Drizzle ORM"   role="PostgreSQL type-safe ORM"      color="#34d399"  delay={160} />
          <StackChip name="AWS S3"        role="PDF + 3D asset storage"        color="#f59e0b"  delay={200} />
          <StackChip name="Redis"         role="Result cache layer"            color="#ef4444"  delay={240} />
          <StackChip name="Resend"        role="Email OTP verification"        color="#6ba3ff"  delay={280} />
          <StackChip name="React-PDF"     role="Server-side PDF render"        color="#a78bfa"  delay={320} />
          <StackChip name="Zod"           role="Schema validation + AI output" color="#34d399"  delay={360} />
          <StackChip name="TypeScript"    role="End-to-end type safety"        color="#6ba3ff"  delay={400} />
          <StackChip name="Vercel"        role="Hosting · 300s max duration"   color="#fff"     delay={440} />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 32px 100px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(0,87,255,0.6)", marginBottom: 16 }}>
          See it in action
        </div>
        <h2 style={{ margin: "0 auto 16px", fontSize: "clamp(28px,4vw,48px)", fontWeight: 800, color: "#fff", maxWidth: 600 }}>
          Analyze your store now
        </h2>
        <p style={{ margin: "0 auto 40px", fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 480, lineHeight: 1.7 }}>
          Drop your Shopify URL and get a full XR readiness report — with 3D previews, ROI projections, and a downloadable PDF — in under 60 seconds.
        </p>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "#0057ff", color: "#fff", borderRadius: 12, padding: "16px 32px",
          fontSize: 15, fontWeight: 700, textDecoration: "none",
        }}>
          Start Free Analysis →
        </Link>
        <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          ₹45 per full report · No signup required · Results in &lt;60s
        </div>
      </section>

      <footer style={{ padding: "24px 32px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>CTRUH</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>XR Commerce Intelligence</div>
      </footer>
    </div>
  );
}
