import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/pdf/report-document";
import type { XRReport } from "@/lib/types";

export async function generateReportPDF(report: XRReport): Promise<Buffer> {
  const element = React.createElement(
    ReportDocument,
    { report }
  ) as React.ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
