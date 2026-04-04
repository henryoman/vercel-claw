#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  CLAW_CONFIG_FILE,
  cliCatalog,
  createDefaultToolsetManifest,
  createDeploymentManifest,
  createEnvTemplate,
  createInstanceManifest,
  createSharedDeploymentDefaults,
  createSharedSystemPromptFile,
  defaultClawConfig,
  formatInstanceKey,
  mergeClawConfig,
  resolveCliDefinitions,
  resolveEnvRequirements,
  resolveRecommendedCliIds,
  resolveToolkitDefinitions,
  toolkitCatalog,
  type ClawConfig,
} from "@vercel-claw/core";
import { promptForSelections } from "./checklist";

const [command = "help", ...args] = Bun.argv.slice(2);
const workspaceRoot = await findWorkspaceRoot(process.cwd());

switch (command) {
  case "help":
    printHelp();
    break;
  case "init":
  case "setup":
    await initWorkspace(workspaceRoot, args);
    break;
  case "doctor":
    await doctor(workspaceRoot);
    break;
  case "config":
    await handleConfig(workspaceRoot, args);
    break;
  case "dev":
    await dev(workspaceRoot);
    break;
  case "deploy":
    await deploy(workspaceRoot, args);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp(1);
}

function printHelp(exitCode = 0) {
  console.log(`vercel-claw

Commands:
  help                 Show this help
  init                 Interactive bootstrap with CLI/toolkit checklists
  setup                Alias for init
  doctor               Inspect CLI installs, env readiness, and toolkit requirements
  config show          Print the resolved config
  config set KEY VAL   Update a config field with dot-path syntax
  dev                  Run Convex dev and Next dev together
  deploy [--prod]      Deploy Convex first, then the Vercel app
`);

  process.exit(exitCode);
}

async function findWorkspaceRoot(startDir: string) {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, CLAW_CONFIG_FILE))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

async function loadConfig(root: string): Promise<ClawConfig> {
  const configPath = join(root, CLAW_CONFIG_FILE);

  if (!existsSync(configPath)) {
    return defaultClawConfig;
  }

  const raw = (await Bun.file(configPath).json()) as Partial<ClawConfig>;
  return mergeClawConfig(raw);
}

async function saveConfig(root: string, config: ClawConfig) {
  await Bun.write(join(root, CLAW_CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
}

async function initWorkspace(root: string, args: string[]) {
  const useDefaults = args.includes("--defaults");
  const existingConfig = await loadConfig(root);
  const configPath = join(root, CLAW_CONFIG_FILE);

  const selectedToolkitIds = useDefaults
    ? existingConfig.selectedToolkitIds
    : await promptForSelections({
        title: "Select the toolkits this personal deployment should support",
        help: "Use space to toggle a toolkit. Press Enter when the checklist is complete.",
        options: toolkitCatalog.map((toolkit) => ({
          value: toolkit.id,
          label: toolkit.label,
          hint: toolkit.description,
        })),
        initialValues: existingConfig.selectedToolkitIds,
      });

  const recommendedCliIds = resolveRecommendedCliIds(
    selectedToolkitIds,
    existingConfig.selectedCliIds,
  );

  const selectedCliIds = useDefaults
    ? recommendedCliIds
    : await promptForSelections({
        title: "Select the local CLIs this operator machine should have installed",
        help: "Use space to toggle a CLI. Press Enter when the checklist is complete.",
        options: cliCatalog.map((cli) => ({
          value: cli.id,
          label: cli.label,
          hint: cli.description,
        })),
        initialValues: recommendedCliIds,
      });

  const config = mergeClawConfig({
    ...existingConfig,
    selectedToolkitIds,
    selectedCliIds,
  });

  const appDir = resolve(root, config.appDir);
  const envPath = join(appDir, ".env.local");
  const envExamplePath = join(appDir, ".env.example");

  await mkdir(appDir, { recursive: true });

  if (!existsSync(configPath)) {
    console.log(`Created ${CLAW_CONFIG_FILE}`);
  }
  await saveConfig(root, config);

  await ensureEnvFile(envExamplePath, config);
  await ensureEnvFile(envPath, config);
  await ensureEditableDeploymentArea(root, config);

  console.log("");
  console.log("Selected toolkits:");
  console.log(
    selectedToolkitIds.length > 0
      ? `  ${selectedToolkitIds.join(", ")}`
      : "  none",
  );
  console.log("Selected CLIs:");
  console.log(selectedCliIds.length > 0 ? `  ${selectedCliIds.join(", ")}` : "  none");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run vercel-claw doctor");
  console.log("  2. Install any missing CLIs");
  console.log("  3. Fill in apps/vercel-claw/.env.local");
  console.log(`  4. Edit ${config.deploymentsDir}/${config.defaultDeploymentId}/shared for deployment-wide defaults`);
  console.log(
    `  5. Edit ${config.deploymentsDir}/${config.defaultDeploymentId}/instances/000 for per-instance overrides`,
  );
  console.log("  6. Run vercel-claw dev to start Convex and the Next.js app");
}

async function ensureEnvFile(path: string, config: ClawConfig) {
  const template = createEnvTemplate(config);

  if (!existsSync(path)) {
    await Bun.write(path, template);
    console.log(`Created ${relativeToCwd(path)}`);
    return;
  }

  const current = await Bun.file(path).text();
  const next = mergeEnvTemplate(current, template);

  if (next !== current) {
    await Bun.write(path, next);
    console.log(`Updated ${relativeToCwd(path)} with newly selected toolkit keys`);
  } else {
    console.log(`${relativeToCwd(path)} already includes the selected keys`);
  }
}

async function ensureEditableDeploymentArea(root: string, config: ClawConfig) {
  const deploymentsDir = resolve(root, config.deploymentsDir);
  const deploymentRoot = join(deploymentsDir, config.defaultDeploymentId);
  const sharedDir = join(deploymentRoot, "shared");
  const promptsDir = join(sharedDir, "prompts");
  const toolsetsDir = join(sharedDir, "toolsets");
  const instancesDir = join(deploymentRoot, "instances");
  const firstInstanceId = formatInstanceKey(0);
  const firstInstanceDir = join(instancesDir, firstInstanceId);

  await mkdir(promptsDir, { recursive: true });
  await mkdir(toolsetsDir, { recursive: true });
  await mkdir(firstInstanceDir, { recursive: true });

  await ensureTextFile(
    join(deploymentsDir, "README.md"),
    createDeploymentsReadme(config.defaultDeploymentId, firstInstanceId),
  );
  await ensureJsonFile(join(deploymentRoot, "deployment.json"), createDeploymentManifest(config));
  await ensureJsonFile(join(sharedDir, "defaults.json"), createSharedDeploymentDefaults(config));
  await ensureTextFile(join(promptsDir, "system.md"), createSharedSystemPromptFile());
  await ensureJsonFile(join(toolsetsDir, "default.json"), createDefaultToolsetManifest(config));
  await ensureJsonFile(join(firstInstanceDir, "instance.json"), createInstanceManifest(firstInstanceId));
}

async function ensureJsonFile(path: string, value: unknown) {
  if (existsSync(path)) {
    return;
  }

  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Created ${relativeToCwd(path)}`);
}

async function ensureTextFile(path: string, value: string) {
  if (existsSync(path)) {
    return;
  }

  await Bun.write(path, `${value.trimEnd()}\n`);
  console.log(`Created ${relativeToCwd(path)}`);
}

function createDeploymentsReadme(defaultDeploymentId: string, firstInstanceId: string) {
  return `# Editable Deployment Area

This directory is the human-editable control plane for generated instances.

- \`${defaultDeploymentId}/shared\` contains deployment-wide defaults shared by every instance.
- \`${defaultDeploymentId}/instances/${firstInstanceId}\` contains per-instance overrides for the first instance.
- Shared code still lives in \`apps/\`, \`packages/\`, \`tools/\`, and \`connectors/\`.

Gate mode is configured in each \`instance.json\`.

- Use \`"member"\` as the safe default for authenticated access.
- Use \`"password"\` only with a secret reference such as \`passwordSecretName\`; do not store hashes or plaintext passwords in repo files.
- Use \`"public"\` only for intentionally open instances.
`;
}

async function doctor(root: string) {
  const config = await loadConfig(root);
  const appDir = resolve(root, config.appDir);
  const convexDir = resolve(root, config.convexDir);
  const deploymentsDir = resolve(root, config.deploymentsDir);
  const deploymentRoot = join(deploymentsDir, config.defaultDeploymentId);
  const envPath = join(appDir, ".env.local");
  const lines = existsSync(envPath) ? (await Bun.file(envPath).text()).split(/\r?\n/) : [];
  const envValues = parseEnvValues(lines);
  const cliDefinitions = resolveCliDefinitions(config);
  const toolkitDefinitions = resolveToolkitDefinitions(config);
  const { requiredEnvVars, optionalEnvVars } = resolveEnvRequirements(config);

  console.log(`Workspace root: ${root}`);
  console.log(`App dir: ${relativeToCwd(appDir)} ${existsSync(appDir) ? "OK" : "MISSING"}`);
  console.log(`Convex dir: ${relativeToCwd(convexDir)} ${existsSync(convexDir) ? "OK" : "MISSING"}`);
  console.log(
    `Deployments dir: ${relativeToCwd(deploymentRoot)} ${existsSync(deploymentRoot) ? "OK" : "MISSING"}`,
  );
  console.log(`Env file: ${relativeToCwd(envPath)} ${existsSync(envPath) ? "OK" : "MISSING"}`);
  console.log("");

  console.log("Configured toolkits:");
  if (toolkitDefinitions.length === 0) {
    console.log("  none");
  } else {
    for (const toolkit of toolkitDefinitions) {
      console.log(`  ${toolkit.label}: ${toolkit.description}`);
    }
  }
  console.log("");

  console.log("CLI requirements:");
  if (cliDefinitions.length === 0) {
    console.log("  none");
  } else {
    for (const cli of cliDefinitions) {
      const detectedPath = findBinary(cli.binary);
      console.log(
        `  ${cli.label}: ${detectedPath ? `installed at ${detectedPath}` : `missing (${cli.installHint})`}`,
      );
    }
  }
  console.log("");

  console.log("Required env:");
  for (const key of requiredEnvVars) {
    console.log(`  ${key}: ${hasConfiguredValue(envValues, key) ? "present" : "missing"}`);
  }

  if (optionalEnvVars.length > 0) {
    console.log("");
    console.log("Optional env:");
    for (const key of optionalEnvVars) {
      console.log(`  ${key}: ${hasConfiguredValue(envValues, key) ? "present" : "optional"}`);
    }
  }
}

async function handleConfig(root: string, args: string[]) {
  const [action = "show", key, rawValue] = args;
  const config = await loadConfig(root);

  if (action === "show") {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (action !== "set" || !key || rawValue === undefined) {
    console.error("Usage: vercel-claw config set KEY VALUE");
    process.exit(1);
  }

  const nextConfig = structuredClone(config) as unknown as Record<string, unknown>;
  setByPath(nextConfig, key, parseValue(rawValue));
  await saveConfig(root, mergeClawConfig(nextConfig as Partial<ClawConfig>));
  console.log(`Updated ${key}`);
}

async function dev(root: string) {
  const config = await loadConfig(root);
  const appDir = resolve(root, config.appDir);
  const envPath = join(appDir, ".env.local");
  const envValues = existsSync(envPath)
    ? parseEnvValues((await Bun.file(envPath).text()).split(/\r?\n/))
    : new Map<string, string>();
  const childEnv = {
    ...process.env,
    ...Object.fromEntries(envValues.entries()),
  };

  console.log("Starting Convex and Next.js...");

  const convex = spawn(["bunx", "convex", "dev"], appDir);
  const app = spawn(["bun", "run", "dev"], appDir, childEnv);

  const stop = () => {
    convex.kill();
    app.kill();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const [convexExit, appExit] = await Promise.all([convex.exited, app.exited]);
  process.exit(convexExit !== 0 ? convexExit : appExit);
}

async function deploy(root: string, args: string[]) {
  const config = await loadConfig(root);
  const appDir = resolve(root, config.appDir);
  const prod = args.includes("--prod");

  await run(["bunx", "convex", "deploy"], appDir);

  const vercelArgs = ["bunx", "vercel", "deploy"];
  if (prod) {
    vercelArgs.push("--prod");
  }

  await run(vercelArgs, appDir);
}

function spawn(cmd: string[], cwd: string, env?: Record<string, string | undefined>) {
  return Bun.spawn(cmd, {
    cwd,
    env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
}

async function run(cmd: string[], cwd: string) {
  console.log(`$ ${cmd.join(" ")}`);
  const child = spawn(cmd, cwd);
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

function setByPath(target: Record<string, unknown>, key: string, value: unknown) {
  const path = key.split(".");
  let current: Record<string, unknown> = target;

  for (const segment of path.slice(0, -1)) {
    const existing = current[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[path[path.length - 1]!] = value;
}

function parseValue(rawValue: string) {
  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }

  if (
    (rawValue.startsWith("{") && rawValue.endsWith("}")) ||
    (rawValue.startsWith("[") && rawValue.endsWith("]"))
  ) {
    return JSON.parse(rawValue);
  }

  return rawValue;
}

function parseEnvValues(lines: string[]) {
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

function mergeEnvTemplate(current: string, template: string) {
  const currentLines = current.split(/\r?\n/);
  const existingKeys = new Set(
    currentLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => line.split("=")[0] ?? ""),
  );

  const missingLines = template
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .filter((line) => !existingKeys.has(line.split("=")[0] ?? ""));

  if (missingLines.length === 0) {
    return current;
  }

  return `${current.trimEnd()}\n\n# Added by vercel-claw setup\n${missingLines.join("\n")}\n`;
}

function hasConfiguredValue(envValues: Map<string, string>, key: string) {
  return (envValues.get(key) ?? "").length > 0;
}

function findBinary(binary: string) {
  const result = Bun.spawnSync(["which", binary], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    return null;
  }

  return result.stdout.toString().trim() || null;
}

function relativeToCwd(path: string) {
  return path.startsWith(process.cwd()) ? path.slice(process.cwd().length + 1) : path;
}
