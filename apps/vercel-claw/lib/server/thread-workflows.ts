import "server-only";

import { start } from "workflow/api";
import {
  executeThreadReplyWorkflow,
  type ThreadReplyWorkflowInput,
} from "@/agent/workflows/thread-reply";

export async function startThreadReplyWorkflow(input: ThreadReplyWorkflowInput) {
  return await start(executeThreadReplyWorkflow, [input]);
}
