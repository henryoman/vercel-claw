import type { Surface } from "@vercel-claw/core";
import { generateThreadReply } from "@/agent/chat";
import { deliverSurfaceReply } from "@/lib/server/surface-replies";

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

  try {
    await deliverSurfaceReply(reply.thread, reply.assistantMessage.content);
  } catch (error) {
    console.error("Failed to deliver connector reply", {
      threadId: input.threadId,
      surface: input.surface,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }

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
