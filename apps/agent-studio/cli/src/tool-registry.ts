import type { ClawConfig, ToolRegistryEntry, ToolRegistryManifest } from "@vercel-claw/core";
import { createEmptyToolRegistry, DEFAULT_TOOL_REGISTRY_URL } from "@vercel-claw/core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureCliHome, getRegistryCachePath } from "./tool-state";

const TOOL_REGISTRY_ENV = "VERCEL_CLAW_TOOL_REGISTRY_URL";

export function resolveToolRegistryUrl(config: Pick<ClawConfig, "toolRegistryUrl">) {
  return process.env[TOOL_REGISTRY_ENV] || config.toolRegistryUrl || DEFAULT_TOOL_REGISTRY_URL;
}

export async function loadToolRegistry(config: Pick<ClawConfig, "toolRegistryUrl">) {
  const registryUrl = resolveToolRegistryUrl(config);
  const cachePath = getRegistryCachePath();

  try {
    const registry = await readRegistryFromUrl(registryUrl);
    await ensureCliHome();
    await Bun.write(cachePath, `${JSON.stringify(registry, null, 2)}\n`);
    return registry;
  } catch (error) {
    if (existsSync(cachePath)) {
      return normalizeToolRegistry((await Bun.file(cachePath).json()) as Partial<ToolRegistryManifest>);
    }

    throw new Error(
      `Unable to load tool registry from ${registryUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export function getToolRegistryEntry(registry: ToolRegistryManifest, toolId: string) {
  return registry.tools.find((tool) => tool.id === toolId) ?? null;
}

async function readRegistryFromUrl(url: string) {
  if (url.startsWith("file://")) {
    return normalizeToolRegistry((await Bun.file(fileURLToPath(url)).json()) as Partial<ToolRegistryManifest>);
  }

  if (!url.includes("://")) {
    return normalizeToolRegistry((await Bun.file(url).json()) as Partial<ToolRegistryManifest>);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`registry request failed with ${response.status}`);
  }

  return normalizeToolRegistry((await response.json()) as Partial<ToolRegistryManifest>);
}

function normalizeToolRegistry(raw: Partial<ToolRegistryManifest>): ToolRegistryManifest {
  const fallback = createEmptyToolRegistry();
  const tools = Array.isArray(raw.tools) ? raw.tools.map(normalizeToolEntry) : [];

  return {
    version: typeof raw.version === "number" ? raw.version : fallback.version,
    generatedAt:
      typeof raw.generatedAt === "string" && raw.generatedAt.length > 0
        ? raw.generatedAt
        : fallback.generatedAt,
    sourceRepo:
      typeof raw.sourceRepo === "string" && raw.sourceRepo.length > 0
        ? raw.sourceRepo
        : fallback.sourceRepo,
    tools,
  };
}

function normalizeToolEntry(raw: Partial<ToolRegistryEntry>): ToolRegistryEntry {
  if (!raw.id || !raw.version || !raw.bundle?.url || !raw.bundle?.sha256) {
    throw new Error("registry entry is missing required fields");
  }

  return {
    id: raw.id,
    version: raw.version,
    label: raw.label ?? raw.id,
    description: raw.description ?? "",
    kind: raw.kind ?? "hybrid",
    runtime: raw.runtime ?? "metadata",
    activationScope: raw.activationScope ?? "instance",
    memberToolIds: Array.isArray(raw.memberToolIds)
      ? raw.memberToolIds.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [],
    docsFile: raw.docsFile ?? null,
    mcpServerName: raw.mcpServerName,
    defaultReadTargets: Array.isArray(raw.defaultReadTargets) ? raw.defaultReadTargets : [],
    capabilities: Array.isArray(raw.capabilities) ? raw.capabilities : [],
    contextHints: Array.isArray(raw.contextHints) ? raw.contextHints : [],
    promptHints: Array.isArray(raw.promptHints) ? raw.promptHints : [],
    recommendedConnection: raw.recommendedConnection,
    fallbackConnection: raw.fallbackConnection,
    execution: raw.execution,
    requiredEnvVars: Array.isArray(raw.requiredEnvVars) ? raw.requiredEnvVars : [],
    optionalEnvVars: Array.isArray(raw.optionalEnvVars) ? raw.optionalEnvVars : [],
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
    installCommands: Array.isArray(raw.installCommands) ? raw.installCommands : [],
    verifyCommands: Array.isArray(raw.verifyCommands) ? raw.verifyCommands : [],
    bundle: {
      url: raw.bundle.url,
      sha256: raw.bundle.sha256,
      format: raw.bundle.format ?? "zip",
      sizeBytes: typeof raw.bundle.sizeBytes === "number" ? raw.bundle.sizeBytes : 0,
    },
    metadata: {
      rootDirectory: raw.metadata?.rootDirectory ?? raw.id,
      mcpConfigPath: raw.metadata?.mcpConfigPath ?? null,
      knowledgeDirectory: raw.metadata?.knowledgeDirectory ?? null,
      skillsDirectory: raw.metadata?.skillsDirectory ?? null,
      readmePath: raw.metadata?.readmePath ?? null,
    },
  };
}
