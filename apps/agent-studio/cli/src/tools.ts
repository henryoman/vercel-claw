import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type {
  ClawConfig,
  InstalledToolsManifest,
  InstanceManifest,
  ToolCommandSpec,
  ToolRegistryEntry,
  ToolRegistryManifest,
  ToolsConfig,
} from "@vercel-claw/core";
import {
  createDefaultInstalledToolsManifest,
  createDefaultToolsConfig,
  createInstanceManifest,
} from "@vercel-claw/core";
import { coerce, gt } from "semver";
import { installToolArchive, removeInstalledToolDirectory } from "./tool-archive";
import { getToolRegistryEntry, loadToolRegistry, resolveToolRegistryUrl } from "./tool-registry";
import {
  ensureCliHome,
  getCliHome,
  getInstalledToolStatePath,
  getRegistryCachePath,
  getToolVersionDir,
  readInstalledToolState,
  writeInstalledToolState,
} from "./tool-state";

export interface ToolCommandContext {
  workspaceRoot: string | null;
  config: ClawConfig;
}

export async function handleToolCommand(context: ToolCommandContext, args: string[]) {
  const [rawAction = "list", toolId, ...rest] = args;
  const action = normalizeAction(rawAction);

  switch (action) {
    case "list":
      await listTools(context);
      return;
    case "info":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tools info <toolId>");
      }
      await printToolInfo(context, toolId);
      return;
    case "install":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tools install <toolId> [--force]");
      }
      await installTool(context, toolId, rest);
      return;
    case "update":
      await updateTools(context, toolId, rest);
      return;
    case "remove":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tools remove <toolId> [--force]");
      }
      await removeTool(context, toolId, rest);
      return;
    case "path":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tools path <toolId>");
      }
      await printToolPath(context, toolId);
      return;
    case "doctor":
      await printToolsDoctor(context);
      return;
    case "activate":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool activate <toolId> --instance <id>");
      }
      await activateTool(context, toolId, rest);
      return;
    case "deactivate":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool deactivate <toolId> --instance <id>");
      }
      await deactivateTool(context, toolId, rest);
      return;
    default:
      throw new Error(`Unknown tool command: ${rawAction}`);
  }
}

async function listTools(context: ToolCommandContext) {
  const [registry, state, workspaceInstalledToolIds] = await Promise.all([
    loadToolRegistry(context.config),
    readInstalledToolState(),
    context.workspaceRoot ? getWorkspaceInstalledToolIds(context.workspaceRoot, context.config) : Promise.resolve(null),
  ]);

  for (const tool of [...registry.tools].sort((left, right) => left.id.localeCompare(right.id))) {
    const installed = state.installedTools[tool.id];
    const status = describeInstalledStatus(installed?.version, tool.version);
    console.log(tool.id);
    console.log(`  label: ${tool.label}`);
    console.log(`  kind: ${tool.kind}`);
    console.log(`  version: ${tool.version}`);
    console.log(`  status: ${status}`);
    if (workspaceInstalledToolIds) {
      console.log(
        `  workspace: ${workspaceInstalledToolIds.has(tool.id) ? "enabled in deployment" : "not enabled in deployment"}`,
      );
    }
    console.log(`  description: ${tool.description}`);
  }
}

async function printToolInfo(context: ToolCommandContext, toolId: string) {
  const [registry, state] = await Promise.all([loadToolRegistry(context.config), readInstalledToolState()]);
  const tool = getRequiredRegistryTool(registry, toolId);
  const installed = state.installedTools[tool.id];

  console.log(tool.id);
  console.log(`  label: ${tool.label}`);
  console.log(`  kind: ${tool.kind}`);
  console.log(`  version: ${tool.version}`);
  console.log(`  activationScope: ${tool.activationScope}`);
  console.log(`  installedVersion: ${installed?.version ?? "not installed"}`);
  console.log(`  installedPath: ${installed?.installDir ?? "n/a"}`);
  console.log(`  bundleUrl: ${tool.bundle.url}`);
  console.log(`  checksum: ${tool.bundle.sha256}`);
  console.log(`  bundleFormat: ${tool.bundle.format}`);
  console.log(`  knowledgeDirectory: ${tool.metadata.knowledgeDirectory ?? "none"}`);
  console.log(`  skillsDirectory: ${tool.metadata.skillsDirectory ?? "none"}`);
  printCommandGroup("  installCommands:", tool.installCommands);
  printCommandGroup("  verifyCommands:", tool.verifyCommands);
}

async function installTool(context: ToolCommandContext, toolId: string, args: string[]) {
  const options = parseToolOptions(args);
  const registry = await loadToolRegistry(context.config);
  const tool = getRequiredRegistryTool(registry, toolId);
  const state = await readInstalledToolState();
  const existing = state.installedTools[tool.id];
  const installDir = getToolVersionDir(tool.id, tool.version);
  const summary: string[] = [];

  await ensureCliHome();

  if (existing?.version === tool.version && existsSync(existing.installDir) && !options.force) {
    summary.push(`tool ${tool.id} is already cached locally at ${existing.installDir}`);
  } else {
    if (existing && existing.installDir !== installDir) {
      await removeInstalledToolDirectory(existing.installDir);
      summary.push(`removed previous local cache ${existing.version}`);
    }

    await installToolArchive(tool, installDir);
    state.installedTools[tool.id] = {
      id: tool.id,
      version: tool.version,
      installedAt: new Date().toISOString(),
      installDir,
      bundleUrl: tool.bundle.url,
    };
    await writeInstalledToolState(state);
    summary.push(`cached ${tool.id}@${tool.version} locally at ${installDir}`);
  }

  if (context.workspaceRoot) {
    await updateWorkspaceInstalledToolsState(context.workspaceRoot, context.config, tool.id, true, summary);
  }

  console.log(`Installed tool: ${tool.id}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function updateTools(context: ToolCommandContext, toolId: string | undefined, args: string[]) {
  const options = parseToolOptions(args);
  const registry = await loadToolRegistry(context.config);
  const state = await readInstalledToolState();
  const requestedIds = toolId ? [toolId] : Object.keys(state.installedTools);

  if (requestedIds.length === 0) {
    console.log("No installed tools to update.");
    return;
  }

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const id of requestedIds) {
    const installed = state.installedTools[id];
    const tool = getToolRegistryEntry(registry, id);

    if (!tool) {
      skipped.push(`${id} is not present in the registry`);
      continue;
    }

    if (installed && !options.force && !isVersionNewer(installed.version, tool.version)) {
      skipped.push(`${id} is already at ${installed.version}`);
      continue;
    }

    await installTool(context, id, options.force ? ["--force"] : []);
    updated.push(`${id} -> ${tool.version}`);
  }

  if (updated.length > 0) {
    console.log("Updated tools:");
    for (const line of updated) {
      console.log(`- ${line}`);
    }
  }

  if (skipped.length > 0) {
    console.log("Skipped:");
    for (const line of skipped) {
      console.log(`- ${line}`);
    }
  }
}

async function removeTool(context: ToolCommandContext, toolId: string, args: string[]) {
  const options = parseToolOptions(args);
  const state = await readInstalledToolState();
  const installed = state.installedTools[toolId];
  const summary: string[] = [];

  if (!installed) {
    throw new Error(`Tool ${toolId} is not installed.`);
  }

  if (context.workspaceRoot) {
    const instanceUsages = await getToolInstanceUsages(context.workspaceRoot, context.config, toolId);
    if (instanceUsages.length > 0 && !options.force) {
      throw new Error(
        `Tool ${toolId} is still exposed in instances: ${instanceUsages.join(", ")}. Deactivate it first or rerun with --force.`,
      );
    }

    if (instanceUsages.length > 0) {
      for (const instanceId of instanceUsages) {
        await updateInstanceToolsState(
          context.workspaceRoot,
          context.config,
          instanceId,
          toolId,
          false,
          summary,
        );
      }
    }
  }

  await removeInstalledToolDirectory(installed.installDir);
  delete state.installedTools[toolId];
  await writeInstalledToolState(state);
  summary.push(`removed local bundle at ${installed.installDir}`);

  if (context.workspaceRoot) {
    await updateWorkspaceInstalledToolsState(context.workspaceRoot, context.config, toolId, false, summary);
  }

  console.log(`Removed tool: ${toolId}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function printToolPath(context: ToolCommandContext, toolId: string) {
  const [registry, state] = await Promise.all([loadToolRegistry(context.config), readInstalledToolState()]);
  const installed = state.installedTools[toolId];
  if (!installed) {
    throw new Error(`Tool ${toolId} is not installed.`);
  }

  const registryTool = getToolRegistryEntry(registry, toolId);
  const rootPath = registryTool
    ? join(installed.installDir, registryTool.metadata.rootDirectory)
    : installed.installDir;
  console.log(rootPath);
}

async function printToolsDoctor(context: ToolCommandContext) {
  const [registry, state] = await Promise.all([loadToolRegistry(context.config), readInstalledToolState()]);
  const registryUrl = resolveToolRegistryUrl(context.config);

  console.log(`CLI home: ${getCliHome()}`);
  console.log(`Registry URL: ${registryUrl}`);
  console.log(`Registry cache: ${getRegistryCachePath()} ${existsSync(getRegistryCachePath()) ? "OK" : "MISSING"}`);
  console.log(
    `Installed state: ${getInstalledToolStatePath()} ${existsSync(getInstalledToolStatePath()) ? "OK" : "MISSING"}`,
  );
  console.log(`Registry tools: ${registry.tools.length}`);
  console.log(`Installed tools: ${Object.keys(state.installedTools).length}`);
  if (context.workspaceRoot) {
    console.log(`Workspace: ${context.workspaceRoot}`);
  }
}

async function activateTool(context: ToolCommandContext, toolId: string, args: string[]) {
  const root = requireWorkspaceRoot(context);
  const options = parseToolOptions(args);
  const summary: string[] = [];
  const registry = await loadToolRegistry(context.config);

  if (!options.instanceId) {
    throw new Error("Usage: vercel-claw tool activate <toolId> --instance <id>");
  }

  getRequiredRegistryTool(registry, toolId);

  await updateWorkspaceInstalledToolsState(root, context.config, toolId, true, summary);
  await updateInstanceToolsState(root, context.config, options.instanceId, toolId, true, summary);
  summary.push(`tool ${toolId} will execute in the deployed app sandbox runtime when enabled`);

  console.log(`Activated tool for instance ${options.instanceId}: ${toolId}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function deactivateTool(context: ToolCommandContext, toolId: string, args: string[]) {
  const root = requireWorkspaceRoot(context);
  const options = parseToolOptions(args);
  const summary: string[] = [];

  if (!options.instanceId) {
    throw new Error("Usage: vercel-claw tool deactivate <toolId> --instance <id>");
  }

  await updateInstanceToolsState(root, context.config, options.instanceId, toolId, false, summary);

  console.log(`Deactivated tool for instance ${options.instanceId}: ${toolId}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

function parseToolOptions(args: string[]) {
  let force = false;
  let instanceId: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--force") {
      force = true;
      continue;
    }

    if (value === "--instance") {
      instanceId = args[index + 1] ?? null;
      index += 1;
    }
  }

  return {
    force,
    instanceId,
  };
}

function normalizeAction(action: string) {
  switch (action) {
    case "inspect":
      return "info";
    case "uninstall":
      return "remove";
    default:
      return action;
  }
}

function printCommandGroup(label: string, commands: ToolCommandSpec[]) {
  console.log(label);
  if (commands.length === 0) {
    console.log("    none");
    return;
  }

  for (const command of commands) {
    console.log(`    ${command.label}: (${command.cwd}) ${command.command.join(" ")}`);
  }
}

function getRequiredRegistryTool(registry: ToolRegistryManifest, toolId: string) {
  const tool = getToolRegistryEntry(registry, toolId);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  return tool;
}

function describeInstalledStatus(installedVersion: string | undefined, registryVersion: string) {
  if (!installedVersion) {
    return "not installed";
  }

  if (isVersionNewer(installedVersion, registryVersion)) {
    return `update available (${installedVersion} -> ${registryVersion})`;
  }

  if (installedVersion !== registryVersion) {
    return `installed (${installedVersion})`;
  }

  return `installed (${installedVersion})`;
}

function isVersionNewer(installedVersion: string, registryVersion: string) {
  const installed = coerce(installedVersion);
  const available = coerce(registryVersion);
  if (!installed || !available) {
    return installedVersion !== registryVersion;
  }

  return gt(available, installed);
}

function requireWorkspaceRoot(context: ToolCommandContext) {
  if (!context.workspaceRoot) {
    throw new Error("This command only works inside a vercel-claw workspace.");
  }

  return context.workspaceRoot;
}

async function getWorkspaceInstalledToolIds(root: string, config: ClawConfig) {
  const toolsPath = resolve(
    root,
    config.deploymentsDir,
    "installed-tools.json",
  );
  if (!existsSync(toolsPath)) {
    return new Set<string>();
  }

  const manifest = (await Bun.file(toolsPath).json()) as Partial<InstalledToolsManifest>;
  return new Set(manifest.installedToolIds ?? []);
}

async function updateWorkspaceInstalledToolsState(
  root: string,
  config: ClawConfig,
  toolId: string,
  install: boolean,
  summary: string[],
) {
  const installedToolsPath = resolve(
    root,
    config.deploymentsDir,
    "installed-tools.json",
  );
  const installedTools = existsSync(installedToolsPath)
    ? ((await Bun.file(installedToolsPath).json()) as InstalledToolsManifest)
    : createDefaultInstalledToolsManifest();

  installedTools.installedToolIds = install
    ? uniqueIds([...installedTools.installedToolIds, toolId])
    : installedTools.installedToolIds.filter((id) => id !== toolId);
  await writeJson(installedToolsPath, installedTools);
  summary.push(`updated ${relativeFromRoot(root, installedToolsPath)}`);
}

async function updateInstanceToolsState(
  root: string,
  config: ClawConfig,
  instanceId: string,
  toolId: string,
  activate: boolean,
  summary: string[],
) {
  const instanceRoot = resolve(
    root,
    config.deploymentsDir,
    "instances",
    instanceId,
  );
  const instancePath = join(instanceRoot, "instance.json");
  const toolsPath = join(instanceRoot, "tools.json");

  const instanceManifest = existsSync(instancePath)
    ? ((await Bun.file(instancePath).json()) as InstanceManifest)
    : createInstanceManifest(instanceId);
  const toolsConfig = existsSync(toolsPath)
    ? ((await Bun.file(toolsPath).json()) as ToolsConfig)
    : createDefaultToolsConfig();

  toolsConfig.exposedToolIds = activate
    ? uniqueIds([...toolsConfig.exposedToolIds, toolId])
    : toolsConfig.exposedToolIds.filter((id) => id !== toolId);

  await writeJson(instancePath, instanceManifest);
  await writeJson(toolsPath, toolsConfig);
  summary.push(`updated ${relativeFromRoot(root, toolsPath)}`);
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeFromRoot(root: string, path: string) {
  const value = relative(root, path);
  return value.length > 0 ? value : ".";
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

async function getToolInstanceUsages(root: string, config: ClawConfig, toolId: string) {
  const instancesRoot = resolve(root, config.deploymentsDir, "instances");
  if (!existsSync(instancesRoot)) {
    return [] as string[];
  }

  const entries = await readdir(instancesRoot, { withFileTypes: true });
  const instanceIds: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const toolsPath = join(instancesRoot, entry.name, "tools.json");
    if (!existsSync(toolsPath)) {
      continue;
    }

    const toolsConfig = (await Bun.file(toolsPath).json()) as ToolsConfig;
    if (toolsConfig.exposedToolIds.includes(toolId)) {
      instanceIds.push(entry.name);
    }
  }

  return instanceIds.sort();
}
