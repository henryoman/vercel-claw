import {
  DEFAULT_DEPLOYMENT_ID,
  createSharedContextConfig,
  type RuntimeExecutionConfig,
  type SharedContextConfig,
} from "@vercel-claw/core";
import { api, getConvexClient } from "./convex";

export async function getInstanceRuntimeConfig(
  instanceId: string,
  deploymentId = DEFAULT_DEPLOYMENT_ID,
) {
  const record = await getConvexClient().query(api.runtimeConfig.getForInstance, {
    deploymentId,
    instanceId,
  });

  if (!record) {
    return null;
  }

  return {
    ...record,
    context: parseSharedContext(record.resolvedContextJson),
    execution: {
      mode: record.executionMode,
      sandbox: {
        enabled: record.sandboxEnabled,
        timeoutMs: record.sandboxTimeoutMs,
        snapshotExpirationMs: record.sandboxSnapshotExpirationMs,
        vcpus: record.sandboxVcpus,
      },
    } satisfies RuntimeExecutionConfig,
  };
}

function parseSharedContext(raw: string): SharedContextConfig {
  const fallback = createSharedContextConfig();

  try {
    const parsed = JSON.parse(raw) as Partial<SharedContextConfig>;
    return {
      version: typeof parsed.version === "number" ? parsed.version : fallback.version,
      systemPrompt:
        typeof parsed.systemPrompt === "string" && parsed.systemPrompt.trim().length > 0
          ? parsed.systemPrompt
          : fallback.systemPrompt,
      instructions: Array.isArray(parsed.instructions)
        ? parsed.instructions.filter((value): value is string => typeof value === "string")
        : fallback.instructions,
      knowledgeFiles: Array.isArray(parsed.knowledgeFiles)
        ? parsed.knowledgeFiles.filter((value): value is string => typeof value === "string")
        : fallback.knowledgeFiles,
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.filter((value): value is string => typeof value === "string")
        : fallback.notes,
    };
  } catch {
    return fallback;
  }
}
