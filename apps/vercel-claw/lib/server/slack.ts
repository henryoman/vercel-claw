import type { SlackWebhookRequest, SlackWebhookResponse } from "@vercel-claw/core";
import { DEFAULT_INSTANCE_ID } from "@vercel-claw/core";
import { formatSlackExternalThreadId, verifySlackRequest } from "@/lib/connectors/slack-events";
import { startThreadReplyWorkflow } from "@/lib/server/thread-workflows";
import {
  appendMessage,
  createOrGetExternalThread,
  findExternalMessage,
} from "./threads";

export async function handleSlackWebhook(
  payload: SlackWebhookRequest,
): Promise<SlackWebhookResponse> {
  if (payload.type !== "event_callback") {
    return {
      ok: true,
      threadId: null,
    };
  }

  const event = payload.event;
  if (
    !event ||
    event.type !== "message" ||
    !event.text?.trim() ||
    !event.channel ||
    !event.ts ||
    event.bot_id ||
    event.subtype === "bot_message"
  ) {
    return {
      ok: true,
      threadId: null,
    };
  }

  const existingMessage = await findExternalMessage("slack", event.ts);
  if (existingMessage) {
    return {
      ok: true,
      threadId: existingMessage.threadId,
    };
  }

  const rootThreadTs = event.thread_ts || event.ts;
  const thread = await createOrGetExternalThread({
    instanceId: DEFAULT_INSTANCE_ID,
    surface: "slack",
    externalThreadId: formatSlackExternalThreadId(event.channel, rootThreadTs),
    externalUserId: event.user,
    title: `Slack ${event.channel}`,
  });

  await appendMessage({
    threadId: thread.id,
    role: "user",
    surface: "slack",
    content: event.text,
    externalMessageId: event.ts,
  });

  await startThreadReplyWorkflow({
    threadId: thread.id,
    surface: "slack",
  });

  return {
    ok: true,
    threadId: thread.id,
  };
}

export function isSlackUrlVerification(payload: SlackWebhookRequest) {
  return payload.type === "url_verification" && typeof payload.challenge === "string";
}

export { formatSlackExternalThreadId, verifySlackRequest };
