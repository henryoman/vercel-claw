import type { Surface } from "@vercel-claw/core";
import { generateThreadReply } from "@/agent/chat";

export type ThreadReplyWorkflowInput = {
  threadId: string;
  surface: Surface;
};

export type ThreadReplyWorkflowResult = {
  threadId: string;
  surface: Surface;
  assistantMessageId: string;
  assistantText: string;
};

export async function executeThreadReplyWorkflow(
  input: ThreadReplyWorkflowInput,
): Promise<ThreadReplyWorkflowResult> {
  "use workflow";

  console.log("Starting thread reply workflow", {
    threadId: input.threadId,
    surface: input.surface,
  });

  const reply = await generateThreadReplyStep(input.threadId, input.surface);

  console.log("Completed thread reply workflow", {
    threadId: input.threadId,
    surface: input.surface,
    assistantMessageId: reply.assistantMessage.id,
  });

  return {
    threadId: input.threadId,
    surface: input.surface,
    assistantMessageId: reply.assistantMessage.id,
    assistantText: reply.assistantMessage.content,
  };
}

export async function generateThreadReplyStep(threadId: string, surface: Surface) {
  "use step";

  console.log("Generating thread reply", { threadId, surface });
  return await generateThreadReply(threadId, surface);
}
