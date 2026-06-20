const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendVerificationEmail(params: {
  to: string;
  code: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const from = process.env.RESEND_FROM_EMAIL || "Ctruh <verify@ctruh.com>";

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: "Verify your email for Ctruh reports",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #0A0A1A; line-height: 1.6;">
          <p>Your verification code for Ctruh is:</p>
          <p style="font-size: 28px; font-weight: 700; color: #0057FF; letter-spacing: 0.08em;">${params.code}</p>
          <p>This code expires in 15 minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend request failed: ${text}`);
  }
}
