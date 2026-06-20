import { getAllReportsWithTokens } from "@/lib/db/queries";

export async function GET() {
  try {
    const reports = await getAllReportsWithTokens();
    return Response.json({ reports });
  } catch (err) {
    console.error("[reports] fetch error:", err);
    return Response.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
