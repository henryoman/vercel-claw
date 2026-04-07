import "server-only";

import type { Surface, ThreadSummary } from "@vercel-claw/core";
import { sendSlackMessage } from "@/lib/connectors/slack";
import { sendTelegramMessage } from "@/lib/connectors/telegram";

export async function deliverSurfaceReply(thread: ThreadSummary, text: string) {
  if (!text.trim()) {
    return;
  }

  switch (thread.surface) {
    case "web":
      return;
    case "telegram":
      await deliverTelegramReply(thread.externalThreadId, text);
      return;
    case "slack":
      await deliverSlackReply(thread.externalThreadId, text);
      return;
    default:
      return assertNever(thread.surface);
  }
}

async function deliverTelegramReply(externalThreadId: string | null, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !externalThreadId) {
    return;
  }

  await sendTelegramMessage(botToken, externalThreadId, text);
}

async function deliverSlackReply(externalThreadId: string | null, text: string) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken || !externalThreadId) {
    return;
  }

  const parsed = parseSlackExternalThreadId(externalThreadId);
  if (!parsed) {
    console.error("Invalid Slack external thread id", { externalThreadId });
    return;
  }

  await sendSlackMessage(botToken, parsed.channel, text, parsed.threadTs);
}

function parseSlackExternalThreadId(value: string) {
  const separatorIndex = value.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return null;
  }

  return {
    channel: value.slice(0, separatorIndex),
    threadTs: value.slice(separatorIndex + 1),
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported surface: ${String(value)}`);
}
