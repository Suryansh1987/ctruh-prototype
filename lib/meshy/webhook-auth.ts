import { createHmac, timingSafeEqual } from "node:crypto";

function getWebhookSecret(): string {
  const secret = process.env.MESHY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("MESHY_WEBHOOK_SECRET is not set");
  }
  return secret;
}

export function signMeshyWebhook(reportId: string, productId: number | string): string {
  return createHmac("sha256", getWebhookSecret())
    .update(`${reportId}:${productId}`)
    .digest("hex");
}

export function isValidMeshyWebhookSignature(
  reportId: string,
  productId: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expected = signMeshyWebhook(reportId, productId);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function matchesLegacyMeshySecret(secret: string | null): boolean {
  if (!secret) return false;

  const expected = getWebhookSecret();
  const actualBuffer = Buffer.from(secret, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}
