import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { formatSlackExternalThreadId, verifySlackRequest } from "../connectors/slack-events";

describe("Slack connector helpers", () => {
  test("formats external thread ids from channel and thread ts", () => {
    expect(formatSlackExternalThreadId("C123", "1710000000.000100")).toBe("C123:1710000000.000100");
  });

  test("verifies a valid Slack signature", () => {
    const rawBody = JSON.stringify({ type: "event_callback", event: { type: "message" } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signSlackRequest("secret", timestamp, rawBody);
    const headers = new Headers({
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature,
    });

    expect(verifySlackRequest(rawBody, headers, "secret")).toBe(true);
  });

  test("rejects an invalid Slack signature", () => {
    const rawBody = JSON.stringify({ type: "event_callback", event: { type: "message" } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers = new Headers({
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signSlackRequest("wrong-secret", timestamp, rawBody),
    });

    expect(verifySlackRequest(rawBody, headers, "secret")).toBe(false);
  });
});

function signSlackRequest(signingSecret: string, timestamp: string, rawBody: string) {
  return `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest("hex")}`;
}
