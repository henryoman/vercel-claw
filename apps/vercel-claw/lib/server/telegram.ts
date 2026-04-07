import { DEFAULT_INSTANCE_ID, type TelegramWebhookRequest, type TelegramWebhookResponse } from "@vercel-claw/core";
import { startThreadReplyWorkflow } from "@/lib/server/thread-workflows";
import {
  appendMessage,
  createOrGetExternalThread,
  findExternalMessage,
} from "./threads";

export async function handleTelegramWebhook(
  payload: TelegramWebhookRequest,
): Promise<TelegramWebhookResponse> {
  const telegramMessage = payload.message;

  if (!telegramMessage?.text?.trim()) {
    return {
      ok: true,
      threadId: null,
      reply: null,
    };
  }

  const externalMessageId = String(telegramMessage.message_id);
  const existingMessage = await findExternalMessage("telegram", externalMessageId);

  if (existingMessage) {
    return {
      ok: true,
      threadId: existingMessage.threadId,
      reply: null,
    };
  }

  const thread = await createOrGetExternalThread({
    instanceId: DEFAULT_INSTANCE_ID,
    surface: "telegram",
    externalThreadId: String(telegramMessage.chat.id),
    externalUserId: telegramMessage.from ? String(telegramMessage.from.id) : undefined,
    title:
      telegramMessage.chat.title ||
      telegramMessage.chat.username ||
      telegramMessage.from?.first_name ||
      "Telegram chat",
  });

  await appendMessage({
    threadId: thread.id,
    role: "user",
    surface: "telegram",
    content: telegramMessage.text,
    externalMessageId,
  });

  await startThreadReplyWorkflow({
    threadId: thread.id,
    surface: "telegram",
  });

  return {
    ok: true,
    threadId: thread.id,
    reply: null,
  };
}
