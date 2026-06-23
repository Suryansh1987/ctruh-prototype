import { getReportById } from "@/lib/db/queries";
import type { GlbEntry } from "@/lib/db/schema";
import type { XRReport } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await getReportById(id);
    if (!row) {
      return Response.json({ error: "Report not found" }, { status: 404 });
    }

    // Merge glbUrls into reportData.products so callers get one consistent object
    const report = mergeGlbsIntoReport(row.reportData, row.glbUrls);

    return Response.json({
      id: row.id,
      status: row.status ?? "ready",
      pdfUrl: row.pdfUrl,
      glbUrls: row.glbUrls,
      report,
    });
  } catch (err) {
    console.error("[report GET] error:", err);
    return Response.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

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
      if (!glb) return p;
      return { ...p, glbUrl: glb.glbUrl, previewImageUrl: glb.previewImageUrl };
    }),
  };
}
