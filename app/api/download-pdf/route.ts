import { generateReportPDF } from "@/lib/pdf/generate";
import type { XRReport } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { report }: { report: XRReport } = await request.json();
    if (!report?.storeName) {
      return Response.json({ error: "Invalid report data" }, { status: 400 });
    }

    const pdfBuffer = await generateReportPDF(report);
    const safeName = report.storeName.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ctruh-xr-report-${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[download-pdf] error:", err);
    return Response.json({ error: "Something went wrong generating your report. Click retry — it usually works on the second attempt." }, { status: 500 });
  }
}
