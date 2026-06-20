import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import { getReportsByContact } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; phone?: string };
    const email = normalizeEmail(body.email || "");
    const phone = normalizePhone(body.phone || "");

    if (!isValidEmail(email) || !isValidPhone(phone)) {
      return Response.json({ error: "Invalid email or phone." }, { status: 400 });
    }

    const reports = await getReportsByContact({ email, phone });
    return Response.json({ reports });
  } catch (err) {
    console.error("[my-reports] error:", err);
    return Response.json({ error: "Failed to fetch reports." }, { status: 500 });
  }
}
