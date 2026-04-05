import "server-only";

import { Buffer } from "node:buffer";
import { Sandbox } from "@vercel/sandbox";
import type {
  RuntimeExecutionConfig,
  ToolCommandSpec,
  ToolSourceManifest,
} from "@vercel-claw/core";
import { runSandboxCommand } from "./executor";

const SANDBOX_ROOT = "/workspace/vercel-claw";
const SHARED_ROOT = `${SANDBOX_ROOT}/shared`;
const THREADS_ROOT = `${SANDBOX_ROOT}/threads`;
const RUNTIME_ROOT = `${SHARED_ROOT}/runtime`;
const CACHE_ROOT = `${SHARED_ROOT}/cache`;
const BOOTSTRAP_ROOT = `${SHARED_ROOT}/bootstrap`;
const RUNTIME_PACKAGE_JSON_PATH = `${RUNTIME_ROOT}/package.json`;

export interface InstanceSandboxContext {
  sandbox: Sandbox;
  sandboxName: string;
  instanceRoot: string;
  threadWorkingDirectory: string;
  runtimeRoot: string;
}

export function getSandboxName(deploymentId: string, instanceId: string) {
  return `claw-${sanitizePathSegment(deploymentId)}-${sanitizePathSegment(instanceId)}`;
}

export function getThreadWorkingDirectory(threadId: string) {
  return `${THREADS_ROOT}/${sanitizePathSegment(threadId)}`;
}

export async function getOrCreateInstanceSandbox(input: {
  deploymentId: string;
  instanceId: string;
  threadId: string;
  execution: RuntimeExecutionConfig;
}) {
  const sandboxName = getSandboxName(input.deploymentId, input.instanceId);
  const credentials = getSandboxCredentials();
  const sandbox =
    (await tryGetSandbox(sandboxName, credentials)) ??
    (await Sandbox.create({
      ...credentials,
      name: sandboxName,
      runtime: "node24",
      persistent: true,
      timeout: input.execution.sandbox.timeoutMs,
      snapshotExpiration: input.execution.sandbox.snapshotExpirationMs ?? 0,
      resources:
        typeof input.execution.sandbox.vcpus === "number"
          ? { vcpus: input.execution.sandbox.vcpus }
          : undefined,
      env: defaultSandboxEnv(),
      tags: {
        deploymentId: sanitizeTagValue(input.deploymentId),
        instanceId: sanitizeTagValue(input.instanceId),
      },
    }));

  await sandbox.update({
    persistent: true,
    timeout: input.execution.sandbox.timeoutMs,
    snapshotExpiration: input.execution.sandbox.snapshotExpirationMs ?? 0,
    resources:
      typeof input.execution.sandbox.vcpus === "number"
        ? { vcpus: input.execution.sandbox.vcpus }
        : undefined,
  });

  await ensureSandboxLayout(sandbox);

  const threadWorkingDirectory = getThreadWorkingDirectory(input.threadId);
  await runSandboxCommand(sandbox, "mkdir", ["-p", threadWorkingDirectory], {
    env: defaultSandboxEnv(),
  });

  return {
    sandbox,
    sandboxName,
    instanceRoot: SANDBOX_ROOT,
    threadWorkingDirectory,
    runtimeRoot: RUNTIME_ROOT,
  } satisfies InstanceSandboxContext;
}

export async function ensureToolBootstrapped(
  sandboxContext: InstanceSandboxContext,
  tool: ToolSourceManifest,
) {
  await ensureSandboxLayout(sandboxContext.sandbox);

  const markerPath = `${BOOTSTRAP_ROOT}/${tool.id}-${tool.version}.json`;
  const existingMarker = await sandboxContext.sandbox.currentSession().readFileToBuffer({
    path: markerPath,
  });

  if (existingMarker) {
    return;
  }

  const installPackages = tool.dependencies
    .filter((dependency) => dependency.target === "app" || dependency.target === "cli")
    .flatMap((dependency) => dependency.packages);

  if (installPackages.length > 0) {
    await runSandboxCommand(
      sandboxContext.sandbox,
      "npm",
      ["install", "--save-exact", ...installPackages],
      {
        cwd: RUNTIME_ROOT,
        env: defaultSandboxEnv(),
      },
    );
  }

  for (const command of tool.installCommands) {
    const translated = translateInstallCommand(command);
    await runSandboxCommand(
      sandboxContext.sandbox,
      translated.command,
      translated.args,
      {
        cwd: resolveToolCommandWorkingDirectory(command),
        env: defaultSandboxEnv(),
      },
    );
  }

  await sandboxContext.sandbox.currentSession().writeFiles([
    {
      path: markerPath,
      content: Buffer.from(
        `${JSON.stringify(
          {
            toolId: tool.id,
            version: tool.version,
            installedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      ),
    },
  ]);
}

function defaultSandboxEnv() {
  return {
    npm_config_cache: `${CACHE_ROOT}/npm`,
  };
}

function translateInstallCommand(command: ToolCommandSpec) {
  const [binary = "", ...args] = command.command;

  if (binary === "bunx") {
    return {
      command: "npx",
      args,
    };
  }

  if (binary === "bun" && args[0] === "run") {
    return {
      command: "npm",
      args: ["run", ...args.slice(1)],
    };
  }

  return {
    command: binary,
    args,
  };
}

function resolveToolCommandWorkingDirectory(command: ToolCommandSpec) {
  switch (command.cwd) {
    case "workspace":
      return SANDBOX_ROOT;
    case "app":
    case "cli":
    default:
      return RUNTIME_ROOT;
  }
}

async function ensureSandboxLayout(sandbox: Sandbox) {
  await runSandboxCommand(
    sandbox,
    "mkdir",
    ["-p", SANDBOX_ROOT, SHARED_ROOT, THREADS_ROOT, RUNTIME_ROOT, CACHE_ROOT, BOOTSTRAP_ROOT],
    {
      env: defaultSandboxEnv(),
    },
  );

  const runtimePackage = await sandbox.currentSession().readFileToBuffer({
    path: RUNTIME_PACKAGE_JSON_PATH,
  });

  if (!runtimePackage) {
    await sandbox.currentSession().writeFiles([
      {
        path: RUNTIME_PACKAGE_JSON_PATH,
        content: Buffer.from(
          `${JSON.stringify(
            {
              name: "vercel-claw-sandbox-runtime",
              private: true,
            },
            null,
            2,
          )}\n`,
        ),
      },
    ]);
  }
}

async function tryGetSandbox(
  sandboxName: string,
  credentials: ReturnType<typeof getSandboxCredentials>,
): Promise<Sandbox | null> {
  try {
    return await Sandbox.get({
      ...credentials,
      name: sandboxName,
      resume: true,
    });
  } catch {
    return null;
  }
}

function getSandboxCredentials() {
  if (
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_TEAM_ID &&
    process.env.VERCEL_PROJECT_ID
  ) {
    return {
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }

  return {};
}

function sanitizePathSegment(value: string) {
  const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, "-");
  return sanitized.length > 0 ? sanitized : "default";
}

function sanitizeTagValue(value: string) {
  return sanitizePathSegment(value).slice(0, 64);
}
