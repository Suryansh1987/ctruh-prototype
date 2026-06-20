import { createVerificationCode, isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from "@/lib/contact";
import { upsertVerificationCode } from "@/lib/db/queries";
import { sendVerificationEmail } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; phone?: string };
    const email = normalizeEmail(body.email || "");
    const phone = normalizePhone(body.phone || "");

    if (!isValidEmail(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!isValidPhone(phone)) {
      return Response.json({ error: "Enter a valid phone number." }, { status: 400 });
    }

    const code = createVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await upsertVerificationCode({ email, phone, code, expiresAt });
    await sendVerificationEmail({ to: email, code });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[request-verification] error:", err);
    return Response.json({ error: "Could not send verification email." }, { status: 500 });
  }
}
