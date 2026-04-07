import { createHmac, timingSafeEqual } from "node:crypto";

const SLACK_SIGNATURE_VERSION = "v0";
const SLACK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

export function verifySlackRequest(rawBody: string, headers: Headers, signingSecret: string) {
  if (!signingSecret) {
    return false;
  }

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");
  if (!timestamp || !signature) {
    return false;
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return false;
  }

  if (Math.abs(Date.now() - timestampMs) > SLACK_TIMESTAMP_TOLERANCE_MS) {
    return false;
  }

  const base = `${SLACK_SIGNATURE_VERSION}:${timestamp}:${rawBody}`;
  const expectedSignature = `${SLACK_SIGNATURE_VERSION}=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  const providedBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (providedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(providedBytes, expectedBytes);
}

export function formatSlackExternalThreadId(channel: string, threadTs: string) {
  return `${channel}:${threadTs}`;
}
