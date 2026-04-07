import "server-only";

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import {
  listToolManifests,
  type RuntimeExecutionConfig,
  type Surface,
  type ToolSourceManifest,
} from "@vercel-claw/core";
import { tool } from "ai";
import { z } from "zod";
import { createTextArtifact } from "@/lib/server/artifacts";
import { runSandboxCommand } from "@/lib/server/sandbox/executor";
import {
  ensureToolBootstrapped,
  getOrCreateInstanceSandbox,
} from "@/lib/server/sandbox/manager";
import { finishSandboxRun, startSandboxRun } from "@/lib/server/sandbox-runs";
import { executableToolResultSchema, type ExecutableToolResult } from "./tool-contracts";

const toolArgumentScalarSchema = z.union([z.string(), z.number(), z.boolean()]);

type ToolArgumentScalar = z.infer<typeof toolArgumentScalarSchema>;

export function createExecutableTools(options: {
  deploymentId: string;
  instanceId: string;
  threadId: string;
  surface: Surface;
  execution: RuntimeExecutionConfig;
  exposedToolIds: string[];
}) {
  if (options.execution.mode !== "sandbox" || !options.execution.sandbox.enabled) {
    return {};
  }

  const executableTools = listToolManifests()
    .filter(
      (manifest) =>
        options.exposedToolIds.includes(manifest.id) &&
        manifest.execution !== undefined &&
        manifest.execution.sandbox !== "never",
    )
    .map((manifest) => [toExecutableToolName(manifest.id), createExecutableTool(manifest, options)]);

  return Object.fromEntries(executableTools);
}

function createExecutableTool(
  manifest: ToolSourceManifest,
  context: {
    deploymentId: string;
    instanceId: string;
    threadId: string;
    surface: Surface;
    execution: RuntimeExecutionConfig;
  },
) {
  const execution = manifest.execution;
  if (!execution) {
    throw new Error(`Tool ${manifest.id} does not define execution metadata.`);
  }

  return tool({
    description: buildExecutableToolDescription(manifest),
    inputSchema: createExecutableToolInputSchema(manifest),
    outputSchema: executableToolResultSchema,
    execute: async (input) => {
      return await executeManifestTool(manifest, {
        deploymentId: context.deploymentId,
        instanceId: context.instanceId,
        threadId: context.threadId,
        surface: context.surface,
        execution: context.execution,
        input: input as ExecutableToolInput,
      });
    },
  });
}

type ExecutableToolInput = {
  operation: string;
  arguments: Record<string, ToolArgumentScalar>;
  background?: boolean;
};

async function executeManifestTool(
  manifest: ToolSourceManifest,
  context: {
    deploymentId: string;
    instanceId: string;
    threadId: string;
    surface: Surface;
    execution: RuntimeExecutionConfig;
    input: ExecutableToolInput;
  },
): Promise<ExecutableToolResult> {
  const execution = manifest.execution;
  if (!execution) {
    throw new Error(`Tool ${manifest.id} does not define execution metadata.`);
  }

  if (context.input.background && !execution.supportsBackground) {
    throw new Error(`Tool ${manifest.id} does not support background execution.`);
  }

  const operation = execution.operations.find((candidate) => candidate.id === context.input.operation);
  if (!operation) {
    throw new Error(`Unsupported operation "${context.input.operation}" for tool ${manifest.id}.`);
  }

  const normalizedArguments = normalizeToolArguments(
    manifest,
    context.input.operation,
    context.input.arguments,
  );
  const sandboxContext = await getOrCreateInstanceSandbox({
    deploymentId: context.deploymentId,
    instanceId: context.instanceId,
    threadId: context.threadId,
    execution: context.execution,
  });
  await ensureToolBootstrapped(sandboxContext, manifest);

  const run = await startSandboxRun({
    threadId: context.threadId,
    toolId: manifest.id,
    operation: operation.id,
    runner: execution.runner,
    sandboxName: sandboxContext.sandboxName,
    workingDirectory: sandboxContext.threadWorkingDirectory,
  });

  try {
    const result = await executeRunnerOperation({
      manifest,
      sandboxContext,
      operation: operation.id,
      args: normalizedArguments,
      background: context.input.background ?? false,
    });

    const [stdoutArtifactId, stderrArtifactId, resultArtifactId] = await Promise.all([
      createExecutionArtifactIfNeeded({
        threadId: context.threadId,
        surface: context.surface,
        label: `${manifest.label} ${operation.label} stdout`,
        text: result.stdout,
        kind: "note",
      }),
      createExecutionArtifactIfNeeded({
        threadId: context.threadId,
        surface: context.surface,
        label: `${manifest.label} ${operation.label} stderr`,
        text: result.stderr,
        kind: "note",
      }),
      createExecutionArtifactIfNeeded({
        threadId: context.threadId,
        surface: context.surface,
        label: `${manifest.label} ${operation.label} result`,
        text: result.resultArtifactText,
        kind: "result",
      }),
    ]);

    const status =
      result.status === "running"
        ? "running"
        : result.exitCode === 0 || result.exitCode === null
          ? "completed"
          : "failed";

    await finishSandboxRun({
      runId: run.id,
      status,
      commandId: result.commandId ?? undefined,
      exitCode: result.exitCode ?? undefined,
      stdoutArtifactId: stdoutArtifactId ?? undefined,
      stderrArtifactId: stderrArtifactId ?? undefined,
      resultArtifactId: resultArtifactId ?? undefined,
      errorMessage: status === "failed" ? result.summary : undefined,
      completedAt: status === "running" ? undefined : Date.now(),
    });

    return {
      kind: "tool-execution",
      toolId: manifest.id,
      operation: operation.id,
      runId: run.id,
      sandboxName: sandboxContext.sandboxName,
      workingDirectory: sandboxContext.threadWorkingDirectory,
      status,
      commandId: result.commandId,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: result.summary,
      data: result.data,
      artifactIds: {
        stdout: stdoutArtifactId,
        stderr: stderrArtifactId,
        result: resultArtifactId,
      },
    };
  } catch (error) {
    await finishSandboxRun({
      runId: run.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Tool execution failed",
      completedAt: Date.now(),
    });
    throw error;
  }
}

async function executeRunnerOperation(input: {
  manifest: ToolSourceManifest;
  sandboxContext: Awaited<ReturnType<typeof getOrCreateInstanceSandbox>>;
  operation: string;
  args: Record<string, ToolArgumentScalar>;
  background: boolean;
}) {
  switch (input.manifest.id) {
    case "agent-browser":
      return await executeAgentBrowserOperation(input);
    case "weather":
      return await executeWeatherOperation(input);
    default:
      throw new Error(`No executor is registered for tool ${input.manifest.id}.`);
  }
}

async function executeWeatherOperation(input: {
  manifest: ToolSourceManifest;
  sandboxContext: Awaited<ReturnType<typeof getOrCreateInstanceSandbox>>;
  operation: string;
  args: Record<string, ToolArgumentScalar>;
  background: boolean;
}) {
  switch (input.operation) {
    case "current": {
      const location = requireStringArgument(input.args, "location");
      const scriptPath = resolve(process.cwd(), "tools/weather/run.ts");
      const result = await runHostCommand("bun", [scriptPath, location]);
      const payload = result.exitCode === 0 ? parseJsonObject(result.stdout) : {};
      const resolvedLocation = readNestedString(payload, ["resolvedLocation"]);
      const condition = readNestedString(payload, ["condition"]);
      const temperatureC = readNestedNumber(payload, ["temperatureC"]);

      return {
        status: "completed" as const,
        commandId: null,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary:
          result.exitCode === 0
            ? buildWeatherSummary({
                requestedLocation: location,
                resolvedLocation,
                condition,
                temperatureC,
              })
            : `Weather lookup failed for ${location}.`,
        data: compactData({
          requestedLocation: location,
          resolvedLocation: resolvedLocation || null,
          condition: condition || null,
          temperatureC,
        }),
        resultArtifactText: result.stdout.trim() || result.stderr.trim() || null,
      };
    }
    default:
      throw new Error(`Unsupported weather operation "${input.operation}".`);
  }
}

async function executeAgentBrowserOperation(input: {
  manifest: ToolSourceManifest;
  sandboxContext: Awaited<ReturnType<typeof getOrCreateInstanceSandbox>>;
  operation: string;
  args: Record<string, ToolArgumentScalar>;
  background: boolean;
}) {
  const commandPath = `${input.sandboxContext.runtimeRoot}/node_modules/.bin/agent-browser`;

  switch (input.operation) {
    case "open": {
      const url = requireStringArgument(input.args, "url");
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["open", url],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
          detached: input.background,
        },
      );

      return {
        status: input.background ? ("running" as const) : ("completed" as const),
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: input.background ? `Opening ${url} in the background.` : `Opened ${url}.`,
        data: compactData({
          url,
        }),
        resultArtifactText: `Opened ${url}.`,
      };
    }
    case "title": {
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["get", "title", "--json"],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );
      const payload = parseJsonObject(result.stdout);
      const title = readNestedString(payload, ["data", "title"]);

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: title ? `Current page title: ${title}` : "Read the current page title.",
        data: compactData({
          title,
        }),
        resultArtifactText: title ? `Title: ${title}` : null,
      };
    }
    case "snapshot": {
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["snapshot", "-i", "-c"],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: "Captured an accessibility snapshot of the current page.",
        data: compactData({
          snapshot: result.stdout.trim(),
        }),
        resultArtifactText: result.stdout.trim() || null,
      };
    }
    case "screenshot": {
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["screenshot", "--json"],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );
      const payload = parseJsonObject(result.stdout);
      const path = readNestedString(payload, ["data", "path"]);

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: path
          ? `Captured a screenshot at ${path}.`
          : "Captured a screenshot in the sandbox workspace.",
        data: compactData({
          path,
        }),
        resultArtifactText: path ? `Screenshot path: ${path}` : result.stdout.trim() || null,
      };
    }
    case "click": {
      const ref = requireStringArgument(input.args, "ref");
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["click", ref],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: `Clicked ${ref}.`,
        data: compactData({
          ref,
        }),
        resultArtifactText: `Clicked ${ref}.`,
      };
    }
    case "fill": {
      const ref = requireStringArgument(input.args, "ref");
      const value = requireStringArgument(input.args, "value");
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["fill", ref, value],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: `Filled ${ref}.`,
        data: compactData({
          ref,
          value,
        }),
        resultArtifactText: `Filled ${ref} with ${value}.`,
      };
    }
    case "wait": {
      const loadState =
        typeof input.args.loadState === "string" ? input.args.loadState : "networkidle";
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["wait", "--load", loadState],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: `Waited for page state ${loadState}.`,
        data: compactData({
          loadState,
        }),
        resultArtifactText: `Waited for ${loadState}.`,
      };
    }
    case "close": {
      const result = await runSandboxCommand(
        input.sandboxContext.sandbox,
        commandPath,
        ["close"],
        {
          cwd: input.sandboxContext.threadWorkingDirectory,
        },
      );

      return {
        status: "completed" as const,
        commandId: result.commandId,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: "Closed the browser session.",
        data: {},
        resultArtifactText: "Closed the browser session.",
      };
    }
    default:
      throw new Error(`Unsupported agent-browser operation "${input.operation}".`);
  }
}

async function createExecutionArtifactIfNeeded(input: {
  threadId: string;
  surface: Surface;
  kind: "note" | "result";
  label: string;
  text: string | null;
}) {
  const value = input.text?.trim();
  if (!value) {
    return null;
  }

  const artifact = await createTextArtifact({
    threadId: input.threadId,
    kind: input.kind,
    label: input.label,
    surface: input.surface,
    text: value,
  });

  return artifact.id;
}

function createExecutableToolInputSchema(manifest: ToolSourceManifest) {
  const execution = manifest.execution;
  if (!execution || execution.operations.length === 0) {
    throw new Error(`Tool ${manifest.id} does not define executable operations.`);
  }

  return z
    .object({
      operation: z.enum(
        execution.operations.map((operation) => operation.id) as [string, ...string[]],
      ),
      arguments: z.record(z.string(), toolArgumentScalarSchema).default({}),
      background: z.boolean().optional().default(false),
    })
    .strict();
}

function normalizeToolArguments(
  manifest: ToolSourceManifest,
  operationId: string,
  rawArguments: Record<string, ToolArgumentScalar>,
) {
  const operation = manifest.execution?.operations.find((candidate) => candidate.id === operationId);
  if (!operation) {
    throw new Error(`Unsupported operation "${operationId}" for tool ${manifest.id}.`);
  }

  const normalized: Record<string, ToolArgumentScalar> = {};

  for (const argument of operation.arguments) {
    const value = rawArguments[argument.key];
    if (value === undefined) {
      if (argument.required) {
        throw new Error(`Missing required argument "${argument.key}" for ${manifest.id}.${operationId}.`);
      }
      continue;
    }

    switch (argument.type) {
      case "number":
        if (typeof value !== "number") {
          throw new Error(`Argument "${argument.key}" for ${manifest.id}.${operationId} must be a number.`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(`Argument "${argument.key}" for ${manifest.id}.${operationId} must be a boolean.`);
        }
        break;
      case "string":
      default:
        if (typeof value !== "string") {
          throw new Error(`Argument "${argument.key}" for ${manifest.id}.${operationId} must be a string.`);
        }
        break;
    }

    normalized[argument.key] = value;
  }

  return normalized;
}

function buildExecutableToolDescription(manifest: ToolSourceManifest) {
  const execution = manifest.execution;
  if (!execution) {
    return manifest.description;
  }

  const operationSummary = execution.operations
    .map((operation) => `${operation.id}: ${operation.description}`)
    .join(" ");

  return [
    manifest.description,
    execution.description,
    `Runner: ${execution.runner}.`,
    `Operations: ${operationSummary}`,
  ].join(" ");
}

function toExecutableToolName(toolId: string) {
  return `tool_${toolId.replaceAll("-", "_")}`;
}

function requireStringArgument(args: Record<string, ToolArgumentScalar>, key: string) {
  const value = args[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Argument "${key}" must be a non-empty string.`);
  }

  return value;
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readNestedNumber(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "number" && Number.isFinite(current) ? current : null;
}

function readNestedString(value: Record<string, unknown>, path: string[]) {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return "";
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : "";
}

function buildWeatherSummary(input: {
  requestedLocation: string;
  resolvedLocation: string;
  condition: string;
  temperatureC: number | null;
}) {
  const location = input.resolvedLocation || input.requestedLocation;

  if (input.condition && input.temperatureC !== null) {
    return `${location}: ${input.condition}, ${input.temperatureC} C.`;
  }

  if (input.condition) {
    return `${location}: ${input.condition}.`;
  }

  return `Fetched weather for ${location}.`;
}

// The current sandbox runtime is Node-only, so the weather tool runs the
// checked-in Bun wrapper on the app host and returns the normalized JSON output.
function runHostCommand(command: string, args: string[]) {
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolveCommand, rejectCommand) => {
    execFile(
      command,
      args,
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 15_000,
        maxBuffer: 1_024 * 1_024,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolveCommand({
            exitCode: 0,
            stdout,
            stderr,
          });
          return;
        }

        const commandError = error as NodeJS.ErrnoException & { code?: number | string };

        if (commandError.code === "ENOENT") {
          rejectCommand(new Error(`Required binary "${command}" is not available on PATH.`));
          return;
        }

        resolveCommand({
          exitCode: typeof commandError.code === "number" ? commandError.code : 1,
          stdout,
          stderr: stderr || commandError.message,
        });
      },
    );
  });
}

function compactData(values: Record<string, ToolArgumentScalar | null | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, ToolArgumentScalar | null] => {
      return entry[1] !== undefined;
    }),
  ) as Record<string, ToolArgumentScalar | null>;
}
