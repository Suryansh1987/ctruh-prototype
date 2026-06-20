import { UrlInputForm, type RecentReportSummary } from "@/components/url-input-form";
import { getAllReportsWithTokens } from "@/lib/db/queries";

async function getRecentReports(): Promise<RecentReportSummary[]> {
  try {
    const reports = await getAllReportsWithTokens();
    return reports.slice(0, 6).map((report) => ({
      id: report.id,
      storeName: report.storeName || report.storeUrl.replace(/^https?:\/\//, ""),
      storeUrl: report.storeUrl,
      productCount: report.productCount || 0,
      opportunityScore: report.xrReadinessScore ? parseFloat(report.xrReadinessScore) : null,
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const recentReports = await getRecentReports();

  return (
    <main className="xr-page-shell">
      <UrlInputForm recentReports={recentReports} />
    </main>
  );
}
