import { notFound } from "next/navigation";
import { getReportById } from "@/lib/db/queries";
import { ReportPageClient } from "./report-page-client";
import type { GlbEntry } from "@/lib/db/schema";
import type { XRReport } from "@/lib/types";

export const dynamic = "force-dynamic";

function mergeGlbsIntoReport(
  reportData: XRReport | null,
  glbUrls: GlbEntry[] | null
): XRReport | null {
  if (!reportData) return null;
  if (!glbUrls || glbUrls.length === 0) return reportData;
  const glbMap = new Map(glbUrls.map((g) => [g.productId, g]));
  return {
    ...reportData,
    products: reportData.products.map((p) => {
      const glb = glbMap.get(p.id);
      return glb ? { ...p, glbUrl: glb.glbUrl, previewImageUrl: glb.previewImageUrl } : p;
    }),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getReportById(id);
  if (!row) return { title: "Report not found" };
  return {
    title: `${row.storeName ?? "Store"} XR Report — Ctruh`,
    description: `XR readiness analysis for ${row.storeUrl}`,
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getReportById(id);
  if (!row) notFound();

  const report = mergeGlbsIntoReport(row.reportData, row.glbUrls);
  if (!report) notFound();

  return (
    <ReportPageClient
      reportId={id}
      initialReport={report}
      initialStatus={row.status ?? "ready"}
      initialPdfUrl={row.pdfUrl ?? null}
    />
  );
}
