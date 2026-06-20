import Link from "next/link";
import { getAllReportsWithTokens } from "@/lib/db/queries";

export const revalidate = 0;

function scoreColor(score: string | null): string {
  if (!score) return "text-white/30";
  const n = parseFloat(score);
  if (n >= 7) return "text-green-400";
  if (n >= 4) return "text-amber-400";
  return "text-red-400";
}

export default async function AdminPage() {
  let reports: Awaited<ReturnType<typeof getAllReportsWithTokens>> = [];
  let dbError: string | null = null;

  try {
    reports = await getAllReportsWithTokens();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Failed to connect to database";
  }

  const totalCost = reports.reduce(
    (sum, r) => sum + parseFloat(r.totalCostUsd || "0"),
    0
  );

  return (
    <main className="min-h-screen px-8 py-10" style={{ background: "#0F0A1E" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-white/40 hover:text-white/70 text-sm transition-colors">
              ← Analyzer
            </Link>
            <h1 className="text-2xl font-bold text-white mt-1">Reports Dashboard</h1>
            <p className="text-white/40 text-sm mt-0.5">All generated store opportunity reports</p>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{reports.length}</p>
              <p className="text-white/40 text-xs">Reports generated</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-400">${totalCost.toFixed(4)}</p>
              <p className="text-white/40 text-xs">Total AI spend</p>
            </div>
          </div>
        </div>

        {dbError && (
          <div className="mb-6 px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm font-medium">Database error</p>
            <p className="text-red-400/70 text-xs mt-1">{dbError}</p>
            <p className="text-white/40 text-xs mt-2">
              Make sure DATABASE_URL is set and you&apos;ve run{" "}
              <code className="bg-white/10 px-1 rounded">npm run db:push</code>
            </p>
          </div>
        )}

        {!dbError && reports.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <p className="text-lg mb-2">No reports yet</p>
            <p className="text-sm">Run your first analysis from the home page.</p>
          </div>
        )}

        {reports.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left px-4 py-3 text-white/50 font-medium text-xs tracking-wide">STORE</th>
                  <th className="text-center px-4 py-3 text-white/50 font-medium text-xs tracking-wide">OPPORTUNITY SCORE</th>
                  <th className="text-center px-4 py-3 text-white/50 font-medium text-xs tracking-wide">PRODUCTS</th>
                  <th className="text-right px-4 py-3 text-white/50 font-medium text-xs tracking-wide">INPUT TOKENS</th>
                  <th className="text-right px-4 py-3 text-white/50 font-medium text-xs tracking-wide">OUTPUT TOKENS</th>
                  <th className="text-right px-4 py-3 text-white/50 font-medium text-xs tracking-wide">COST (USD)</th>
                  <th className="text-right px-4 py-3 text-white/50 font-medium text-xs tracking-wide">DATE</th>
                  <th className="text-center px-4 py-3 text-white/50 font-medium text-xs tracking-wide">PDF</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => {
                  const cost = parseFloat(r.totalCostUsd || "0");
                  const inputTok = parseInt(r.totalInputTokens || "0");
                  const outputTok = parseInt(r.totalOutputTokens || "0");
                  const date = r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })
                    : "—";
                  const time = r.createdAt
                    ? new Date(r.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "";

                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-white/5 hover:bg-white/3 transition-colors ${
                        i % 2 === 1 ? "bg-white/2" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{r.storeName ?? "—"}</p>
                        <p className="text-white/40 text-xs truncate max-w-xs">{r.storeUrl}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.xrReadinessScore ? (
                          <span className={`font-bold ${scoreColor(r.xrReadinessScore)}`}>
                            {parseFloat(r.xrReadinessScore).toFixed(1)}/10
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-white/70">
                        {r.productCount ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-white/60 font-mono text-xs">
                        {inputTok.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-white/60 font-mono text-xs">
                        {outputTok.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-purple-400 font-mono text-xs">
                          ${cost.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/40 text-xs">
                        <p>{date}</p>
                        <p>{time}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.pdfUrl ? (
                          <a
                            href={r.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 text-xs transition-colors"
                          >
                            ↓ PDF
                          </a>
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-8 text-white/35 text-xs text-center">
          Powered by Ctruh · ctruh.com · Built to help brands discover their XR opportunity
        </p>
      </div>
    </main>
  );
}
