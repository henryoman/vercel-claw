import type { Surface } from "@vercel-claw/core";
import { generateThreadReply } from "@/agent/chat";
import { sendTelegramMessage } from "@/lib/connectors/telegram";

export type ThreadReplyWorkflowInput = {
  threadId: string;
  surface: Surface;
  telegramChatId?: number;
};

export type ThreadReplyWorkflowResult = {
  threadId: string;
  surface: Surface;
  assistantMessageId: string;
  assistantText: string;
  delivered: boolean;
};

export async function executeThreadReplyWorkflow(
  input: ThreadReplyWorkflowInput,
): Promise<ThreadReplyWorkflowResult> {
  "use workflow";

  console.log("Starting thread reply workflow", {
    threadId: input.threadId,
    surface: input.surface,
  });

  const reply = await generateReplyStep(input.threadId, input.surface);
  const assistantText = reply.assistantMessage.content;

  let delivered = false;
  if (input.surface === "telegram") {
    delivered = await deliverTelegramReplyStep(input.telegramChatId, assistantText);
  }

  console.log("Completed thread reply workflow", {
    threadId: input.threadId,
    surface: input.surface,
    assistantMessageId: reply.assistantMessage.id,
    delivered,
  });

  return {
    threadId: input.threadId,
    surface: input.surface,
    assistantMessageId: reply.assistantMessage.id,
    assistantText,
    delivered,
  };
}

async function generateReplyStep(threadId: string, surface: Surface) {
  "use step";

  console.log("Generating thread reply", { threadId, surface });
  return await generateThreadReply(threadId, surface);
}

async function deliverTelegramReplyStep(chatId: number | undefined, text: string) {
  "use step";

  if (chatId === undefined) {
    console.log("Skipping Telegram delivery because no chat id was provided");
    return false;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("Skipping Telegram delivery because TELEGRAM_BOT_TOKEN is missing");
    return false;
  }

  console.log("Sending Telegram reply", { chatId });
  await sendTelegramMessage(process.env.TELEGRAM_BOT_TOKEN, chatId, text);
  return true;
}
