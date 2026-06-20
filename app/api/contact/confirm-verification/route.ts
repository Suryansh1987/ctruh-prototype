import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import { verifyContactCode } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; phone?: string; code?: string };
    const email = normalizeEmail(body.email || "");
    const phone = normalizePhone(body.phone || "");
    const code = (body.code || "").trim();

    if (!isValidEmail(email) || !isValidPhone(phone) || code.length < 6) {
      return Response.json({ error: "Enter a valid email, phone, and verification code." }, { status: 400 });
    }

    const verified = await verifyContactCode({ email, phone, code });
    if (!verified) {
      return Response.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[confirm-verification] error:", err);
    return Response.json({ error: "Could not verify this email." }, { status: 500 });
  }
}
