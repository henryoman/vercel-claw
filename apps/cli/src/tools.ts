import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type {
  ClawConfig,
  InstalledToolsManifest,
  InstanceManifest,
  ToolsConfig,
} from "@vercel-claw/core";
import {
  TOOL_CACHE_DIR,
  createDefaultInstalledToolsManifest,
  createDefaultToolsConfig,
  createInstanceManifest,
  getToolManifest,
  listToolManifests,
  type ToolCommandSpec,
  type ToolManifest,
} from "@vercel-claw/core";

export async function handleToolCommand(root: string, config: ClawConfig, args: string[]) {
  const [action = "list", toolId, ...rest] = args;

  switch (action) {
    case "list":
      await listTools(root, config);
      return;
    case "inspect":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool inspect <toolId>");
      }
      await inspectTool(toolId);
      return;
    case "install":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool install <toolId> [--dry-run] [--force]");
      }
      await installTool(root, config, toolId, rest);
      return;
    case "uninstall":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool uninstall <toolId> [--dry-run] [--force]");
      }
      await uninstallTool(root, config, toolId, rest);
      return;
    case "activate":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool activate <toolId> --instance <id> [--dry-run]");
      }
      await activateTool(root, config, toolId, rest);
      return;
    case "deactivate":
      if (!toolId) {
        throw new Error("Usage: vercel-claw tool deactivate <toolId> --instance <id> [--dry-run]");
      }
      await deactivateTool(root, config, toolId, rest);
      return;
    default:
      throw new Error(`Unknown tool command: ${action}`);
  }
}

async function listTools(root: string, config: ClawConfig) {
  const installedToolIds = await getInstalledToolIds(root, config);

  for (const tool of listToolManifests()) {
    const enabled = installedToolIds.has(tool.id) ? "installed" : "not installed";
    console.log(`${tool.id}`);
    console.log(`  label: ${tool.label}`);
    console.log(`  kind: ${tool.kind}`);
    console.log(`  status: ${enabled}`);
    console.log(`  description: ${tool.description}`);
  }
}

async function inspectTool(toolId: string) {
  const tool = getRequiredTool(toolId);

  console.log(`${tool.id}`);
  console.log(`  label: ${tool.label}`);
  console.log(`  kind: ${tool.kind}`);
  console.log(`  activationScope: ${tool.activationScope}`);
  console.log(`  shippedToolDir: ${tool.shippedToolDir}`);
  console.log(`  cacheDir: ${join(TOOL_CACHE_DIR, tool.cacheSubdir)}`);

  console.log("  dependencies:");
  if (tool.dependencies.length === 0) {
    console.log("    none");
  } else {
    for (const dependency of tool.dependencies) {
      console.log(`    ${dependency.target}: ${dependency.packages.join(", ")}`);
    }
  }

  printCommandGroup("  installCommands:", tool.installCommands);
  printCommandGroup("  verifyCommands:", tool.verifyCommands);
}

async function installTool(root: string, config: ClawConfig, toolId: string, args: string[]) {
  const tool = getRequiredTool(toolId);
  const options = parseActivateOptions(args);

  const appDir = resolve(root, config.appDir);
  const cliDir = resolve(root, "apps/cli");
  const cacheDir = resolve(root, TOOL_CACHE_DIR, tool.cacheSubdir);
  const summary: string[] = [];

  await ensureDir(cacheDir, options.dryRun, summary);
  await ensurePackageDependencies(appDir, cliDir, tool, options.dryRun, summary);
  await runToolCommands(root, appDir, cliDir, tool.installCommands, options.dryRun, summary);
  await updateInstalledToolsState(root, config, tool.id, true, options.dryRun, summary);
  await writeToolMetadata(cacheDir, tool, "install", options, summary);

  console.log(`Installed tool: ${tool.id}${options.dryRun ? " (dry run)" : ""}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function uninstallTool(root: string, config: ClawConfig, toolId: string, args: string[]) {
  const tool = getRequiredTool(toolId);
  const options = parseActivateOptions(args);
  const summary: string[] = [];
  const instanceUsages = await getToolInstanceUsages(root, config, tool.id);

  if (instanceUsages.length > 0 && !options.force) {
    throw new Error(
      `Tool ${tool.id} is still exposed in instances: ${instanceUsages.join(", ")}. Deactivate it first or rerun with --force.`,
    );
  }

  if (instanceUsages.length > 0 && options.force) {
    for (const instanceId of instanceUsages) {
      await updateInstanceToolsState(root, config, instanceId, tool.id, false, options.dryRun, summary);
    }
  }

  await updateInstalledToolsState(root, config, tool.id, false, options.dryRun, summary);
  await writeToolMetadata(
    resolve(root, TOOL_CACHE_DIR, tool.cacheSubdir),
    tool,
    "uninstall",
    options,
    summary,
  );

  console.log(`Uninstalled tool: ${tool.id}${options.dryRun ? " (dry run)" : ""}`);
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function activateTool(root: string, config: ClawConfig, toolId: string, args: string[]) {
  const tool = getRequiredTool(toolId);
  const options = parseActivateOptions(args);
  const summary: string[] = [];

  if (!options.instanceId) {
    throw new Error("Usage: vercel-claw tool activate <toolId> --instance <id> [--dry-run]");
  }

  const installedToolIds = await getInstalledToolIds(root, config);
  if (!installedToolIds.has(tool.id)) {
    throw new Error(`Tool ${tool.id} is not installed. Run \`vercel-claw tool install ${tool.id}\` first.`);
  }

  await updateInstanceToolsState(root, config, options.instanceId, tool.id, true, options.dryRun, summary);

  console.log(
    `Activated tool for instance ${options.instanceId}: ${tool.id}${options.dryRun ? " (dry run)" : ""}`,
  );
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

async function deactivateTool(root: string, config: ClawConfig, toolId: string, args: string[]) {
  const tool = getRequiredTool(toolId);
  const options = parseActivateOptions(args);
  const summary: string[] = [];

  if (!options.instanceId) {
    throw new Error("Usage: vercel-claw tool deactivate <toolId> --instance <id> [--dry-run]");
  }

  await updateInstanceToolsState(root, config, options.instanceId, tool.id, false, options.dryRun, summary);

  console.log(
    `Deactivated tool for instance ${options.instanceId}: ${tool.id}${options.dryRun ? " (dry run)" : ""}`,
  );
  for (const line of summary) {
    console.log(`- ${line}`);
  }
}

function parseActivateOptions(args: string[]) {
  let dryRun = false;
  let force = false;
  let instanceId: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (value === "--force") {
      force = true;
      continue;
    }

    if (value === "--instance") {
      instanceId = args[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return {
    dryRun,
    force,
    instanceId,
  };
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

function getRequiredTool(toolId: string) {
  const tool = getToolManifest(toolId);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  return tool;
}

async function getInstalledToolIds(root: string, config: ClawConfig) {
  const toolsPath = resolve(
    root,
    config.deploymentsDir,
    config.defaultDeploymentId,
    "installed-tools.json",
  );
  if (!existsSync(toolsPath)) {
    return new Set<string>();
  }

  const manifest = (await Bun.file(toolsPath).json()) as Partial<InstalledToolsManifest>;
  return new Set(manifest.installedToolIds ?? []);
}

async function ensurePackageDependencies(
  appDir: string,
  cliDir: string,
  tool: ToolManifest,
  dryRun: boolean,
  summary: string[],
) {
  for (const dependency of tool.dependencies) {
    const cwd = dependency.target === "app" ? appDir : cliDir;
    const packageJsonPath = join(cwd, "package.json");
    const manifest = (await Bun.file(packageJsonPath).json()) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const missingPackages = dependency.packages.filter(
      (pkg) => !manifest.dependencies?.[pkg] && !manifest.devDependencies?.[pkg],
    );

    if (missingPackages.length === 0) {
      summary.push(`dependencies already installed for ${dependency.target}: ${dependency.packages.join(", ")}`);
      continue;
    }

    summary.push(
      `${dryRun ? "would install" : "installed"} ${dependency.target} packages: ${missingPackages.join(", ")}`,
    );

    if (!dryRun) {
      await runCommand(["bun", "add", ...missingPackages], cwd);
    }
  }
}

async function runToolCommands(
  root: string,
  appDir: string,
  cliDir: string,
  commands: ToolCommandSpec[],
  dryRun: boolean,
  summary: string[],
) {
  for (const command of commands) {
    const cwd = resolveCommandCwd(root, appDir, cliDir, command.cwd);
    summary.push(`${dryRun ? "would run" : "ran"} ${command.label}: ${command.command.join(" ")}`);
    if (!dryRun) {
      await runCommand(command.command, cwd);
    }
  }
}

async function updateInstalledToolsState(
  root: string,
  config: ClawConfig,
  toolId: string,
  install: boolean,
  dryRun: boolean,
  summary: string[],
) {
  const installedToolsPath = resolve(
    root,
    config.deploymentsDir,
    config.defaultDeploymentId,
    "installed-tools.json",
  );
  const installedTools = existsSync(installedToolsPath)
    ? ((await Bun.file(installedToolsPath).json()) as InstalledToolsManifest)
    : createDefaultInstalledToolsManifest();

  installedTools.installedToolIds = install
    ? uniqueIds([...installedTools.installedToolIds, toolId])
    : installedTools.installedToolIds.filter((id) => id !== toolId);
  summary.push(
    `${dryRun ? "would update" : "updated"} ${relativeFromRoot(root, installedToolsPath)}`,
  );
  if (!dryRun) {
    await writeJson(installedToolsPath, installedTools);
  }
}

async function updateInstanceToolsState(
  root: string,
  config: ClawConfig,
  instanceId: string,
  toolId: string,
  activate: boolean,
  dryRun: boolean,
  summary: string[],
) {
  const instanceRoot = resolve(
    root,
    config.deploymentsDir,
    config.defaultDeploymentId,
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

  summary.push(`${dryRun ? "would update" : "updated"} ${relativeFromRoot(root, toolsPath)}`);
  if (!dryRun) {
    await writeJson(instancePath, instanceManifest);
    await writeJson(toolsPath, toolsConfig);
  }
}

async function writeToolMetadata(
  cacheDir: string,
  tool: ToolManifest,
  action: "install" | "uninstall",
  options: { dryRun: boolean; force: boolean; instanceId: string | null },
  summary: string[],
) {
  summary.push(
    `${options.dryRun ? "would write" : "wrote"} ${action} metadata in ${join(TOOL_CACHE_DIR, tool.cacheSubdir)}`,
  );

  if (options.dryRun) {
    return;
  }

  await mkdir(cacheDir, { recursive: true });
  await writeJson(join(cacheDir, `${action}.json`), {
    toolId: tool.id,
    action,
    force: options.force,
    instanceId: options.instanceId,
    updatedAt: new Date().toISOString(),
  });
}

async function ensureDir(path: string, dryRun: boolean, summary: string[]) {
  summary.push(`${dryRun ? "would prepare" : "prepared"} cache directory ${path}`);
  if (!dryRun) {
    await mkdir(path, { recursive: true });
  }
}

function resolveCommandCwd(
  root: string,
  appDir: string,
  cliDir: string,
  cwd: ToolCommandSpec["cwd"],
) {
  switch (cwd) {
    case "app":
      return appDir;
    case "cli":
      return cliDir;
    case "workspace":
    default:
      return root;
  }
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
  const instancesRoot = resolve(root, config.deploymentsDir, config.defaultDeploymentId, "instances");
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

async function runCommand(command: string[], cwd: string) {
  console.log(`$ (${cwd}) ${command.join(" ")}`);
  const child = Bun.spawn(command, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(" ")}`);
  }
}
