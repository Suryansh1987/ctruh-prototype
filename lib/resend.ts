const RESEND_API_URL = "https://api.resend.com/emails";

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.RESEND_FROM_EMAIL || "Ctruh <verify@ctruh.com>";
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [params.to], subject: params.subject, html: params.html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend request failed: ${text}`);
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  code: string;
}): Promise<void> {
  await sendEmail({
    to: params.to,
    subject: "Verify your email for Ctruh reports",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0A0A1A; line-height: 1.6;">
        <p>Your verification code for Ctruh is:</p>
        <p style="font-size: 28px; font-weight: 700; color: #0057FF; letter-spacing: 0.08em;">${params.code}</p>
        <p>This code expires in 15 minutes.</p>
      </div>
    `,
  });
}

export async function sendReportReadyEmail(params: {
  to: string;
  storeName: string;
  reportId: string;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${process.env.VERCEL_URL}`;
  const reportUrl = `${baseUrl}/report/${params.reportId}`;
  await sendEmail({
    to: params.to,
    subject: `Your 3D models are ready — ${params.storeName}`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0A0A1A; line-height: 1.6; max-width: 500px;">
        <h2 style="color: #0057FF;">Your 3D models are ready</h2>
        <p>We finished generating interactive 3D models for <strong>${params.storeName}</strong>.</p>
        <a href="${reportUrl}" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#0057FF;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          View Your Report →
        </a>
        <p style="margin-top:16px;font-size:13px;color:#666;">
          Or paste this link: ${reportUrl}
        </p>
      </div>
    `,
  });
}
