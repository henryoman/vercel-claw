import type { SandboxRunRecord } from "@vercel-claw/core";
import { api, getConvexClient } from "./convex";
import type { Id } from "@/convex/_generated/dataModel";

export async function startSandboxRun(input: {
  threadId: string;
  toolId: string;
  operation: string;
  runner: SandboxRunRecord["runner"];
  sandboxName: string;
  workingDirectory: string;
  commandId?: string;
}): Promise<SandboxRunRecord> {
  return await getConvexClient().mutation(api.sandboxRuns.start, {
    threadId: input.threadId as Id<"threads">,
    toolId: input.toolId,
    operation: input.operation,
    runner: input.runner,
    sandboxName: input.sandboxName,
    workingDirectory: input.workingDirectory,
    commandId: input.commandId,
  });
}

export async function finishSandboxRun(input: {
  runId: string;
  status: SandboxRunRecord["status"];
  commandId?: string;
  exitCode?: number;
  stdoutArtifactId?: string;
  stderrArtifactId?: string;
  resultArtifactId?: string;
  errorMessage?: string;
  completedAt?: number;
}): Promise<SandboxRunRecord> {
  return await getConvexClient().mutation(api.sandboxRuns.finish, {
    runId: input.runId as Id<"sandboxRuns">,
    status: input.status,
    commandId: input.commandId,
    exitCode: input.exitCode,
    stdoutArtifactId: input.stdoutArtifactId as Id<"artifacts"> | undefined,
    stderrArtifactId: input.stderrArtifactId as Id<"artifacts"> | undefined,
    resultArtifactId: input.resultArtifactId as Id<"artifacts"> | undefined,
    errorMessage: input.errorMessage,
    completedAt: input.completedAt,
  });
}
