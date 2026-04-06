import "server-only";

import { start } from "workflow/api";
import { executeThreadReplyWorkflow, type ThreadReplyWorkflowInput } from "@/workflows/thread-reply";

export async function startThreadReplyWorkflow(input: ThreadReplyWorkflowInput) {
  const run = await start(executeThreadReplyWorkflow, [input]);
  return { runId: run.runId };
}
