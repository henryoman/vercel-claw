import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { ConvexHttpClient } from "convex/browser";
import {
  composeResolvedSystemPrompt,
  createDefaultInstalledToolsManifest,
  createDefaultToolsConfig,
  createInstanceContextConfig,
  createInstanceManifest,
  createSharedContextConfig,
  createSharedDeploymentDefaults,
  resolveContextConfig,
  type ClawConfig,
  type ContextConfig,
  type InstalledToolsManifest,
  type InstanceManifest,
  type SharedDeploymentDefaults,
  type SharedContextConfig,
  type ToolsConfig,
} from "@vercel-claw/core";
import { api } from "../../vercel-claw/convex/_generated/api";

export async function handleSyncCommand(root: string, config: ClawConfig) {
  const appDir = resolve(root, config.appDir);
  const convexUrl = await resolveConvexUrl(root, appDir);

  if (!convexUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. Set it in .env.local or apps/vercel-claw/.env.local before running sync.",
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  const deploymentRoot = resolve(root, config.deploymentsDir, config.defaultDeploymentId);
  const installedToolsPath = join(deploymentRoot, "installed-tools.json");
  const sharedDefaultsPath = join(deploymentRoot, "shared", "defaults.json");
  const sharedContextPath = join(deploymentRoot, "shared", "context.json");
  const instancesRoot = join(deploymentRoot, "instances");

  const [installedTools, sharedDefaults, sharedContext] = await Promise.all([
    readJsonFile<InstalledToolsManifest>(installedToolsPath, createDefaultInstalledToolsManifest()),
    readJsonFile<SharedDeploymentDefaults>(
      sharedDefaultsPath,
      createSharedDeploymentDefaults(config),
    ),
    readJsonFile<SharedContextConfig>(sharedContextPath, createSharedContextConfig()),
  ]);
  const defaultSharedPrompt = createSharedContextConfig().systemPrompt;
  const sharedPromptFileContents = await readPromptFiles(deploymentRoot, sharedDefaults.promptFiles);
  const resolvedSharedContext: SharedContextConfig = {
    ...sharedContext,
    systemPrompt: composeResolvedSystemPrompt({
      sharedBasePrompt: sharedContext.systemPrompt,
      sharedPromptFileContents,
      inheritsShared: true,
      defaultSharedPrompt,
    }),
  };

  await client.mutation(api.runtimeConfig.syncDeployment, {
    deploymentId: config.defaultDeploymentId,
    installedToolIds: installedTools.installedToolIds,
    sharedContextJson: JSON.stringify(resolvedSharedContext),
  });

  const instanceDirs = existsSync(instancesRoot)
    ? (await readdir(instancesRoot, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
    : [];

  for (const instanceId of instanceDirs) {
    const instanceRoot = join(instancesRoot, instanceId);
    const instanceManifest = await readJsonFile<InstanceManifest>(
      join(instanceRoot, "instance.json"),
      createInstanceManifest(instanceId),
    );
    const toolsConfig = await readJsonFile<ToolsConfig>(
      join(instanceRoot, "tools.json"),
      createDefaultToolsConfig(),
    );
    const instanceContext = await readJsonFile<ContextConfig>(
      join(instanceRoot, "context.json"),
      createInstanceContextConfig(),
    );
    const instancePromptFileContents = await readPromptFiles(
      deploymentRoot,
      instanceManifest.promptFiles,
    );

    const exposedToolIds = toolsConfig.exposedToolIds.filter((toolId) =>
      installedTools.installedToolIds.includes(toolId),
    );
    const resolvedContext = resolveContextConfig(resolvedSharedContext, instanceContext);
    resolvedContext.systemPrompt = composeResolvedSystemPrompt({
      sharedBasePrompt: resolvedSharedContext.systemPrompt,
      sharedPromptFileContents: [],
      instanceBasePrompt: instanceContext.systemPrompt,
      instancePromptFileContents,
      inheritsShared: instanceContext.inheritsShared,
      defaultSharedPrompt,
    });

    await client.mutation(api.runtimeConfig.syncInstance, {
      deploymentId: config.defaultDeploymentId,
      instanceId,
      label: instanceManifest.label,
      gateMode: instanceManifest.gate.mode,
      passwordSecretName: instanceManifest.gate.passwordSecretName ?? undefined,
      exposedToolIds,
      resolvedContextJson: JSON.stringify(resolvedContext),
    });

    console.log(`Synced instance ${instanceId}`);
  }

  console.log(
    `Synced deployment ${config.defaultDeploymentId} with ${installedTools.installedToolIds.length} installed tools.`,
  );
}

async function resolveConvexUrl(root: string, appDir: string) {
  const rootEnv = await readEnvFile(join(root, ".env.local"));
  const appEnv = await readEnvFile(join(appDir, ".env.local"));
  return (
    appEnv.get("NEXT_PUBLIC_CONVEX_URL") ??
    rootEnv.get("NEXT_PUBLIC_CONVEX_URL") ??
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    null
  );
}

async function readEnvFile(path: string) {
  if (!existsSync(path)) {
    return new Map<string, string>();
  }

  const lines = (await Bun.file(path).text()).split(/\r?\n/);
  return new Map(
    lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key ?? "", rest.join("=").trim()] as const;
      }),
  );
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) {
    return fallback;
  }

  return (await Bun.file(path).json()) as T;
}

async function readPromptFiles(deploymentRoot: string, promptFiles: string[]) {
  const contents: string[] = [];

  for (const promptFile of promptFiles) {
    const absolutePath = resolvePromptFilePath(deploymentRoot, promptFile);
    if (!existsSync(absolutePath)) {
      throw new Error(`Prompt file not found: ${toRepoStylePath(relative(deploymentRoot, absolutePath))}`);
    }

    const content = (await Bun.file(absolutePath).text()).trim();
    if (content.length > 0) {
      contents.push(content);
    }
  }

  return contents;
}

function resolvePromptFilePath(deploymentRoot: string, promptFile: string) {
  const trimmedPromptFile = promptFile.trim();
  if (trimmedPromptFile.length === 0) {
    throw new Error("Prompt file paths must not be empty.");
  }

  if (isAbsolute(trimmedPromptFile)) {
    throw new Error(`Prompt files must be deployment-relative, received absolute path: ${trimmedPromptFile}`);
  }

  const absolutePath = resolve(deploymentRoot, trimmedPromptFile);
  const relativePath = toRepoStylePath(relative(deploymentRoot, absolutePath));
  if (relativePath === ".." || relativePath.startsWith("../")) {
    throw new Error(`Prompt file escapes the deployment root: ${trimmedPromptFile}`);
  }

  return absolutePath;
}

function toRepoStylePath(value: string) {
  return value.split(sep).join("/");
}
