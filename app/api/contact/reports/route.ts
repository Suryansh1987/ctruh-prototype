import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import { getReportsByContact } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; phone?: string };
    const email = normalizeEmail(body.email || "");
    const phone = normalizePhone(body.phone || "");

    if (!isValidEmail(email) || !isValidPhone(phone)) {
      return Response.json({ error: "Enter the same email and phone number you used when generating your reports." }, { status: 400 });
    }

    const reports = await getReportsByContact({ email, phone });
    return Response.json({ reports });
  } catch (err) {
    console.error("[contact-reports] error:", err);
    return Response.json({ error: "Could not fetch reports." }, { status: 500 });
  }
}
