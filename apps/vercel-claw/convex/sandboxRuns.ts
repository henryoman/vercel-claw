import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getThreadOrThrow } from "./lib/threads";
import {
  sandboxRunRecordValidator,
  sandboxRunStatusValidator,
  sandboxRunnerValidator,
} from "./lib/validators";

export const listByThread = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(sandboxRunRecordValidator),
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("sandboxRuns")
      .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
      .collect();

    return runs
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .map((run) => mapSandboxRun(run));
  },
});

export const start = mutation({
  args: {
    threadId: v.id("threads"),
    toolId: v.string(),
    operation: v.string(),
    runner: sandboxRunnerValidator,
    sandboxName: v.string(),
    workingDirectory: v.string(),
    commandId: v.optional(v.string()),
  },
  returns: sandboxRunRecordValidator,
  handler: async (ctx, args) => {
    const thread = await getThreadOrThrow(ctx, args.threadId);
    const now = Date.now();
    const runId = await ctx.db.insert("sandboxRuns", {
      threadId: args.threadId,
      instanceId: thread.instanceId,
      toolId: args.toolId,
      operation: args.operation,
      runner: args.runner,
      sandboxName: args.sandboxName,
      workingDirectory: args.workingDirectory,
      status: "running",
      commandId: args.commandId,
      startedAt: now,
      updatedAt: now,
    });

    const run = await ctx.db.get(runId);
    if (!run) {
      throw new Error("Sandbox run creation failed");
    }

    return mapSandboxRun(run);
  },
});

export const finish = mutation({
  args: {
    runId: v.id("sandboxRuns"),
    status: sandboxRunStatusValidator,
    commandId: v.optional(v.string()),
    exitCode: v.optional(v.number()),
    stdoutArtifactId: v.optional(v.id("artifacts")),
    stderrArtifactId: v.optional(v.id("artifacts")),
    resultArtifactId: v.optional(v.id("artifacts")),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  returns: sandboxRunRecordValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.runId);
    if (!existing) {
      throw new Error("Sandbox run not found");
    }

    const updatedAt = Date.now();
    const completedAt =
      args.completedAt ??
      (args.status === "completed" || args.status === "failed" ? updatedAt : undefined);

    await ctx.db.patch(args.runId, {
      status: args.status,
      commandId: args.commandId ?? existing.commandId,
      exitCode: args.exitCode,
      stdoutArtifactId: args.stdoutArtifactId,
      stderrArtifactId: args.stderrArtifactId,
      resultArtifactId: args.resultArtifactId,
      errorMessage: args.errorMessage,
      completedAt,
      updatedAt,
    });

    const run = await ctx.db.get(args.runId);
    if (!run) {
      throw new Error("Sandbox run update failed");
    }

    return mapSandboxRun(run);
  },
});

function mapSandboxRun(run: {
  _id: string;
  threadId: string;
  instanceId: string;
  toolId: string;
  operation: string;
  runner: "browser" | "shell" | "cli" | "stdio-mcp" | "http-mcp";
  sandboxName: string;
  workingDirectory: string;
  status: "queued" | "running" | "completed" | "failed";
  commandId?: string;
  exitCode?: number;
  stdoutArtifactId?: string;
  stderrArtifactId?: string;
  resultArtifactId?: string;
  errorMessage?: string;
  startedAt: number;
  completedAt?: number;
  updatedAt: number;
}) {
  return {
    id: run._id,
    threadId: run.threadId,
    instanceId: run.instanceId,
    toolId: run.toolId,
    operation: run.operation,
    runner: run.runner,
    sandboxName: run.sandboxName,
    workingDirectory: run.workingDirectory,
    status: run.status,
    commandId: run.commandId ?? null,
    exitCode: run.exitCode ?? null,
    stdoutArtifactId: run.stdoutArtifactId ?? null,
    stderrArtifactId: run.stderrArtifactId ?? null,
    resultArtifactId: run.resultArtifactId ?? null,
    errorMessage: run.errorMessage ?? null,
    startedAt: run.startedAt,
    completedAt: run.completedAt ?? null,
    updatedAt: run.updatedAt,
  };
}
