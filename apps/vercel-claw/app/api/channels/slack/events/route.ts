import type { SlackWebhookRequest } from "@vercel-claw/core";
import {
  handleSlackWebhook,
  isSlackUrlVerification,
  verifySlackRequest,
} from "@/lib/server/slack";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return Response.json({ error: "Missing SLACK_SIGNING_SECRET" }, { status: 500 });
  }

  if (!verifySlackRequest(rawBody, request.headers, signingSecret)) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as SlackWebhookRequest;

  if (isSlackUrlVerification(payload)) {
    return Response.json({ challenge: payload.challenge });
  }

  const result = await handleSlackWebhook(payload);
  return Response.json(result);
}
