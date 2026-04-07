#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  CLAW_CONFIG_FILE,
  createDefaultInstalledToolsManifest,
  createDefaultToolsetManifest,
  createDefaultToolsConfig,
  createDeploymentManifest,
  createEnvTemplate,
  createInstanceContextConfig,
  createInstanceManifest,
  createSharedContextConfig,
  createSharedDeploymentDefaults,
  cliCatalog,
  defaultClawConfig,
  formatInstanceKey,
  listToolManifests,
  mergeClawConfig,
  normalizeInstanceManifest,
  normalizeRuntimeExecutionConfig,
  normalizeSharedDeploymentDefaults,
  resolveCliDefinitions,
  resolveEnvRequirements,
  resolveRecommendedCliIds,
  resolveSurfaceDefinitions,
  resolveToolkitDefinitions,
  surfaceCatalog,
  toolkitCatalog,
  type ContextConfig,
  type ClawConfig,
  type InstanceManifest,
  type SharedContextConfig,
  type SharedDeploymentDefaults,
  type ToolsConfig,
} from "@vercel-claw/core";
import { mergeEnvTemplate, parseEnvValues, readEnvMap, upsertEnvValues, hasConfiguredValue } from "./env";
import { promptForSelections } from "./checklist";
import { promptForConfirm, promptForText } from "./prompt";
import { scaffoldWorkspace } from "./scaffold";
import { handleSyncCommand } from "./sync";
import { handleToolCommand } from "./tools";
import { promptForChoice } from "./menu";

const [command = "help", ...args] = Bun.argv.slice(2);
const workspaceRoot = await findWorkspaceRoot(process.cwd());
const hasWorkspace = isWorkspaceRoot(workspaceRoot);
const config = await loadConfig(workspaceRoot);

try {
  switch (command) {
    case "help":
      printHelp();
      break;
    case "create":
      await createWorkspace(args);
      break;
    case "init":
    case "setup":
      await setupWorkspace(requireWorkspaceRoot(workspaceRoot, hasWorkspace), args);
      break;
    case "doctor":
      await doctor(requireWorkspaceRoot(workspaceRoot, hasWorkspace));
      break;
    case "config":
      await handleConfig(requireWorkspaceRoot(workspaceRoot, hasWorkspace), args);
      break;
    case "connector":
    case "connectors":
      await handleConnectorCommand(
        {
          workspaceRoot: requireWorkspaceRoot(workspaceRoot, hasWorkspace),
          config,
        },
        args,
      );
      break;
    case "setting":
    case "settings":
      await handleSettingsCommand(
        {
          workspaceRoot: requireWorkspaceRoot(workspaceRoot, hasWorkspace),
          config,
        },
        args,
      );
      break;
    case "tool":
    case "tools":
      await handleToolCommand(
        {
          workspaceRoot: hasWorkspace ? workspaceRoot : null,
          config,
        },
        args,
      );
      break;
    case "sync":
      await handleSyncCommand(requireWorkspaceRoot(workspaceRoot, hasWorkspace), config);
      break;
    case "dev":
      await dev(requireWorkspaceRoot(workspaceRoot, hasWorkspace));
      break;
    case "deploy":
      await deploy(requireWorkspaceRoot(workspaceRoot, hasWorkspace), args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unexpected CLI error");
  process.exit(1);
}

type WorkspaceCommandContext = {
  workspaceRoot: string;
  config: ClawConfig;
};

type EnvPromptDefinition = {
  label: string;
  help?: string;
  secret?: boolean;
  promptOnSetup?: boolean;
};

const autoManagedEnvKeys = new Set([
  "CONVEX_DEPLOYMENT",
  "NEXT_PUBLIC_CONVEX_URL",
  "VERCEL_PROJECT_ID",
  "VERCEL_TEAM_ID",
]);

const envPromptCatalog: Record<string, EnvPromptDefinition> = {
  OPENAI_API_KEY: {
    label: "OpenAI API key",
    help: "Paste the API key the agent should use for chat and tool reasoning.",
    secret: true,
  },
  OPENAI_BASE_URL: {
    label: "OpenAI base URL",
    help: "Optional. Set this only if you are routing requests through a proxy or alternative API host.",
  },
  TELEGRAM_BOT_TOKEN: {
    label: "Telegram BotFather token",
    help: "Paste the token from BotFather for the Telegram connector.",
    secret: true,
  },
  SLACK_BOT_TOKEN: {
    label: "Slack bot token",
    help: "Paste the bot token for Slack chat.postMessage and Events API replies.",
    secret: true,
  },
  SLACK_SIGNING_SECRET: {
    label: "Slack signing secret",
    help: "Paste the signing secret used to verify inbound Slack Events API requests.",
    secret: true,
  },
  SLACK_APP_TOKEN: {
    label: "Slack app token",
    help: "Optional. Only needed if you later add Socket Mode or Slack CLI flows.",
    secret: true,
  },
  VERCEL_TOKEN: {
    label: "Vercel token",
    help: "Optional. Paste it now if you want the deploy command to run without further auth setup.",
    secret: true,
  },
  GITHUB_TOKEN: {
    label: "GitHub token",
    help: "Optional. Needed only if you enable GitHub toolkit features that require an API token.",
    secret: true,
  },
  NOTION_API_KEY: {
    label: "Notion API key",
    help: "Paste the Notion integration secret if you enabled the Notion toolkit.",
    secret: true,
  },
  POSTHOG_API_KEY: {
    label: "PostHog API key",
    help: "Paste the PostHog personal API key if you enabled the PostHog toolkit.",
    secret: true,
  },
  GOOGLE_CLIENT_SECRET: {
    label: "Google client secret",
    help: "Paste the Google OAuth client secret for Workspace or Gmail access.",
    secret: true,
  },
  GOOGLE_CLIENT_ID: {
    label: "Google client ID",
    help: "Paste the Google OAuth client ID for Workspace or Gmail access.",
  },
  GOOGLE_WORKSPACE_REDIRECT_URI: {
    label: "Google Workspace redirect URI",
    help: "Paste the OAuth redirect URI configured in your Google app.",
  },
  GMAIL_CLIENT_ID: {
    label: "Gmail client ID",
    help: "Paste the Gmail OAuth client ID.",
  },
  GMAIL_CLIENT_SECRET: {
    label: "Gmail client secret",
    help: "Paste the Gmail OAuth client secret.",
    secret: true,
  },
  GMAIL_REDIRECT_URI: {
    label: "Gmail redirect URI",
    help: "Paste the OAuth redirect URI configured for Gmail.",
  },
  LINEAR_API_KEY: {
    label: "Linear API key",
    help: "Paste the Linear API key if you enabled the Linear toolkit.",
    secret: true,
  },
  DISCORD_BOT_TOKEN: {
    label: "Discord bot token",
    help: "Paste the Discord bot token if you enabled the Discord toolkit.",
    secret: true,
  },
};

function printHelp(exitCode = 0) {
  console.log(`vercel-claw

Commands:
  help                               Show this help
  create DIR                         Scaffold a new vercel-claw workspace and run setup
  tools list                         List remote tools from the registry
  tools info ID                      Show registry metadata for a tool
  tools install ID                   Mark a tool available and optionally cache its bundle locally
  tools update [ID]                  Refresh one tool or all locally cached tool bundles
  tools remove ID                    Remove a tool from deployment config and local cache
  tools path ID                      Print the locally cached path for a tool bundle
  tools doctor                       Inspect CLI tool state and registry cache
  connectors list                    Show configured chat connectors and required env
  connectors setup [ID|all]          Prompt for connector secrets and write them to .env.local
  connector ...                      Alias for connectors
  settings show                      Print an operator-focused settings summary
  settings edit                      Open the interactive settings editor
  tool ...                           Alias for tools, plus workspace activate/deactivate commands

Workspace-only Commands:
  init                               Alias for setup
  setup                              Guided workspace bootstrap for surfaces, tools, and env
  doctor                             Inspect CLI installs, env readiness, and toolkit requirements
  config show                        Print the resolved config
  config set KEY VAL                 Update a config field with dot-path syntax
  tool activate ID                   Expose a deployment tool to an instance
  tool deactivate ID                 Remove a tool from an instance
  sync                               Push repo-owned tool/context state into Convex
  dev                                Run Convex dev and Next dev together
  deploy [--prod]                    Deploy Convex, sync runtime config, then the Vercel app
`);

  process.exit(exitCode);
}

async function createWorkspace(args: string[]) {
  const [targetArg, ...rest] = args;
  if (!targetArg) {
    throw new Error("Usage: vercel-claw create <directory> [--defaults] [--force]");
  }

  const targetRoot = resolve(process.cwd(), targetArg);
  const useDefaults = rest.includes("--defaults");
  const force = rest.includes("--force");

  await scaffoldWorkspace(targetRoot, { force });
  await initializeWorkspacePackageName(targetRoot);
  console.log(`Scaffolded workspace at ${targetRoot}`);
  await setupWorkspace(targetRoot, useDefaults ? ["--defaults"] : []);
}

async function setupWorkspace(root: string, args: string[]) {
  const useDefaults = args.includes("--defaults");
  const existingConfig = await loadConfig(root);
  const configPath = join(root, CLAW_CONFIG_FILE);
  const defaultName = existingConfig.name === defaultClawConfig.name ? basename(root) : existingConfig.name;
  const envPath = join(resolve(root, existingConfig.appDir), ".env.local");
  const existingEnv = await readEnvMap(envPath);

  const workspaceName = useDefaults
    ? defaultName
    : await promptForText({
        label: "Workspace name",
        help: "This is the deployment name stored in vercel-claw.config.json.",
        defaultValue: defaultName,
      });

  const defaultModel = useDefaults
    ? existingConfig.defaultModel
    : await promptForText({
        label: "Default model",
        help: "Pick the default model the agent should use for new runs.",
        defaultValue: existingConfig.defaultModel,
      });

  const enabledSurfaceIds = normalizeSurfaceSelection(
    useDefaults
      ? existingConfig.enabledSurfaceIds
      : await promptForSelections({
          title: "Select the chat surfaces this deployment should expose",
          help: "Use space to toggle a surface. Press Enter when the checklist is complete.",
          options: surfaceCatalog.map((surface) => ({
            value: surface.id,
            label: surface.label,
            hint: surface.description,
          })),
          initialValues: existingConfig.enabledSurfaceIds,
        }),
  );

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

  const selectedInstalledToolIds = useDefaults
    ? await readInstalledToolIds(root, existingConfig)
    : await promptForSelections({
        title: "Select the shipped tools this deployment should install",
        help: "Use space to toggle a tool. Press Enter when the checklist is complete.",
        options: listToolManifests().map((tool) => ({
          value: tool.id,
          label: tool.label,
          hint: tool.description,
        })),
        initialValues: await readInstalledToolIds(root, existingConfig),
      });

  const config = mergeClawConfig({
    ...existingConfig,
    name: workspaceName,
    defaultModel,
    selectedToolkitIds,
    selectedCliIds,
    enabledSurfaceIds,
  });

  const appDir = resolve(root, config.appDir);
  const nextEnvPath = join(appDir, ".env.local");
  const envExamplePath = join(appDir, ".env.example");

  await mkdir(appDir, { recursive: true });

  await saveConfig(root, config);
  if (!existsSync(configPath)) {
    console.log(`Created ${CLAW_CONFIG_FILE}`);
  } else {
    console.log(`Updated ${CLAW_CONFIG_FILE}`);
  }

  await ensureEnvFile(envExamplePath, config);
  await ensureEnvFile(nextEnvPath, config);

  const promptedValues = useDefaults ? {} : await collectPromptedEnvValues(config, nextEnvPath);
  if (Object.keys(promptedValues).length > 0) {
    await writeEnvValues(nextEnvPath, promptedValues);
  }

  await syncWorkspaceDerivedFiles(root, config, selectedInstalledToolIds);
  await initializeWorkspacePackageName(root, config.name);

  printSetupSummary(root, config, selectedInstalledToolIds);
}

async function doctor(root: string) {
  const config = await loadConfig(root);
  const appDir = resolve(root, config.appDir);
  const convexDir = resolve(root, config.convexDir);
  const deploymentRoot = resolve(root, config.deploymentsDir);
  const envPath = join(appDir, ".env.local");
  const envValues = await readEnvMap(envPath);
  const cliDefinitions = resolveCliDefinitions(config);
  const toolkitDefinitions = resolveToolkitDefinitions(config);
  const surfaceDefinitions = resolveSurfaceDefinitions(config);
  const { requiredEnvVars, optionalEnvVars } = resolveEnvRequirements(config);

  console.log(`Workspace root: ${root}`);
  console.log(`App dir: ${relativeToCwd(appDir)} ${existsSync(appDir) ? "OK" : "MISSING"}`);
  console.log(`Convex dir: ${relativeToCwd(convexDir)} ${existsSync(convexDir) ? "OK" : "MISSING"}`);
  console.log(
    `Deployments dir: ${relativeToCwd(deploymentRoot)} ${existsSync(deploymentRoot) ? "OK" : "MISSING"}`,
  );
  console.log(`Env file: ${relativeToCwd(envPath)} ${existsSync(envPath) ? "OK" : "MISSING"}`);
  console.log("");

  console.log("Configured surfaces:");
  if (surfaceDefinitions.length === 0) {
    console.log("  none");
  } else {
    for (const surface of surfaceDefinitions) {
      console.log(`  ${surface.label}: ${surface.description}`);
    }
  }
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

  printConnectorInstructions(config);
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

async function handleConnectorCommand(context: WorkspaceCommandContext, args: string[]) {
  const [action = "list", connectorId] = args;

  switch (action) {
    case "list":
      printConnectorList(context.config);
      return;
    case "setup":
      await setupConnectors(context.workspaceRoot, context.config, connectorId);
      return;
    default:
      throw new Error(`Unknown connector command: ${action}`);
  }
}

async function handleSettingsCommand(context: WorkspaceCommandContext, args: string[]) {
  const [action = "edit"] = args;

  switch (action) {
    case "show":
      await showSettingsSummary(context.workspaceRoot, context.config);
      return;
    case "edit":
      await editSettings(context.workspaceRoot, context.config);
      return;
    default:
      throw new Error(`Unknown settings command: ${action}`);
  }
}

async function setupConnectors(root: string, config: ClawConfig, connectorId?: string) {
  const connectorIds =
    !connectorId || connectorId === "all"
      ? config.enabledSurfaceIds.filter((id) => id !== "web")
      : [connectorId];

  const selectedSurfaces = connectorIds
    .map((id) => surfaceCatalog.find((surface) => surface.id === id))
    .filter((surface): surface is (typeof surfaceCatalog)[number] => Boolean(surface));

  if (selectedSurfaces.length === 0) {
    console.log("No non-web connectors are enabled in this workspace.");
    return;
  }

  const envPath = join(resolve(root, config.appDir), ".env.local");
  const envValues = await collectEnvValuesForKeys(
    selectedSurfaces.flatMap((surface) => [...surface.requiredEnvVars, ...surface.optionalEnvVars]),
    envPath,
  );

  if (Object.keys(envValues).length > 0) {
    await writeEnvValues(envPath, envValues);
  }

  printConnectorInstructions(config);
}

async function showSettingsSummary(root: string, config: ClawConfig) {
  const sharedDefaults = await readSharedDefaults(root, config);
  const sharedContext = await readSharedContext(root, config);
  const instanceManifest = await readInstanceManifest(root, config, "000");
  const toolsConfig = await readInstanceToolsConfig(root, config, "000");
  const installedTools = await readInstalledToolIds(root, config);

  console.log(`Workspace: ${root}`);
  console.log(`Name: ${config.name}`);
  console.log(`Default model: ${config.defaultModel}`);
  console.log(`Surfaces: ${config.enabledSurfaceIds.join(", ")}`);
  console.log(`Toolkits: ${config.selectedToolkitIds.length > 0 ? config.selectedToolkitIds.join(", ") : "none"}`);
  console.log(`Shared runtime: ${sharedDefaults.execution.mode}`);
  console.log(`Shared timeout: ${sharedDefaults.execution.sandbox.timeoutMs}ms`);
  console.log(`Shared prompt: ${sharedContext.systemPrompt}`);
  console.log(`Instance 000 label: ${instanceManifest.label}`);
  console.log(`Instance 000 gate: ${instanceManifest.gate.mode}`);
  console.log(`Installed tools: ${installedTools.length > 0 ? installedTools.join(", ") : "none"}`);
  console.log(`Exposed tools: ${toolsConfig.exposedToolIds.length > 0 ? toolsConfig.exposedToolIds.join(", ") : "none"}`);
}

async function editSettings(root: string, initialConfig: ClawConfig) {
  let config = initialConfig;

  while (true) {
    const sharedDefaults = await readSharedDefaults(root, config);
    const sharedContext = await readSharedContext(root, config);
    const instanceManifest = await readInstanceManifest(root, config, "000");
    const toolsConfig = await readInstanceToolsConfig(root, config, "000");

    const choice = await promptForChoice({
      title: "Settings editor",
      help: "Choose a section to edit. Changes are written directly into the workspace files.",
      options: [
        {
          value: "workspace",
          label: "Workspace basics",
          hint: `${config.name} • model ${config.defaultModel}`,
        },
        {
          value: "surfaces",
          label: "Chat surfaces",
          hint: config.enabledSurfaceIds.join(", "),
        },
        {
          value: "toolkits",
          label: "Toolkits",
          hint: config.selectedToolkitIds.length > 0 ? config.selectedToolkitIds.join(", ") : "none",
        },
        {
          value: "connectors",
          label: "Connector secrets",
          hint: "Prompt for Telegram/Slack env values",
        },
        {
          value: "prompt",
          label: "Shared prompt and context",
          hint: sharedContext.systemPrompt,
        },
        {
          value: "runtime",
          label: "Runtime defaults",
          hint: `${sharedDefaults.execution.mode} • ${sharedDefaults.execution.sandbox.timeoutMs}ms`,
        },
        {
          value: "instance",
          label: "Instance 000",
          hint: `${instanceManifest.label} • gate ${instanceManifest.gate.mode}`,
        },
        {
          value: "tools",
          label: "Instance 000 tools",
          hint: toolsConfig.exposedToolIds.length > 0 ? toolsConfig.exposedToolIds.join(", ") : "none",
        },
        {
          value: "done",
          label: "Done",
          hint: "Exit the settings editor",
        },
      ],
    });

    switch (choice) {
      case "workspace":
        config = await editWorkspaceBasics(root, config);
        break;
      case "surfaces":
        config = await editSurfaces(root, config);
        break;
      case "toolkits":
        config = await editToolkits(root, config);
        break;
      case "connectors":
        await setupConnectors(root, config);
        break;
      case "prompt":
        await editSharedPrompt(root, config, sharedContext);
        break;
      case "runtime":
        await editRuntimeDefaults(root, config, sharedDefaults);
        break;
      case "instance":
        await editInstanceSettings(root, config, instanceManifest);
        break;
      case "tools":
        await editInstanceTools(root, config, toolsConfig);
        break;
      case "done":
        return;
      default:
        return;
    }
  }
}

async function editWorkspaceBasics(root: string, config: ClawConfig) {
  const name = await promptForText({
    label: "Workspace name",
    defaultValue: config.name,
  });
  const defaultModel = await promptForText({
    label: "Default model",
    defaultValue: config.defaultModel,
  });

  const nextConfig = mergeClawConfig({
    ...config,
    name,
    defaultModel,
  });
  await saveConfig(root, nextConfig);
  await initializeWorkspacePackageName(root, nextConfig.name);
  await syncWorkspaceDerivedFiles(root, nextConfig, await readInstalledToolIds(root, nextConfig));
  return nextConfig;
}

async function editSurfaces(root: string, config: ClawConfig) {
  const enabledSurfaceIds = normalizeSurfaceSelection(
    await promptForSelections({
      title: "Select chat surfaces",
      help: "Use space to toggle a surface. Press Enter when the checklist is complete.",
      options: surfaceCatalog.map((surface) => ({
        value: surface.id,
        label: surface.label,
        hint: surface.description,
      })),
      initialValues: config.enabledSurfaceIds,
    }),
  );

  const nextConfig = mergeClawConfig({
    ...config,
    enabledSurfaceIds,
  });
  await saveConfig(root, nextConfig);
  await ensureEnvFile(join(resolve(root, nextConfig.appDir), ".env.example"), nextConfig);
  await ensureEnvFile(join(resolve(root, nextConfig.appDir), ".env.local"), nextConfig);
  return nextConfig;
}

async function editToolkits(root: string, config: ClawConfig) {
  const selectedToolkitIds = await promptForSelections({
    title: "Select toolkits",
    help: "Use space to toggle a toolkit. Press Enter when the checklist is complete.",
    options: toolkitCatalog.map((toolkit) => ({
      value: toolkit.id,
      label: toolkit.label,
      hint: toolkit.description,
    })),
    initialValues: config.selectedToolkitIds,
  });

  const selectedCliIds = resolveRecommendedCliIds(selectedToolkitIds, config.selectedCliIds);
  const nextConfig = mergeClawConfig({
    ...config,
    selectedToolkitIds,
    selectedCliIds,
  });
  await saveConfig(root, nextConfig);
  await ensureEnvFile(join(resolve(root, nextConfig.appDir), ".env.example"), nextConfig);
  await ensureEnvFile(join(resolve(root, nextConfig.appDir), ".env.local"), nextConfig);
  await syncWorkspaceDerivedFiles(root, nextConfig, await readInstalledToolIds(root, nextConfig));
  return nextConfig;
}

async function editSharedPrompt(
  root: string,
  config: ClawConfig,
  sharedContext: SharedContextConfig,
) {
  const systemPrompt = await promptForText({
    label: "Shared system prompt",
    defaultValue: sharedContext.systemPrompt,
  });
  const knowledgeFiles = await promptForText({
    label: "Knowledge files (comma separated)",
    defaultValue: sharedContext.knowledgeFiles.join(", "),
  });
  const notes = await promptForText({
    label: "Notes (comma separated)",
    defaultValue: sharedContext.notes.join(", "),
  });

  await writeJsonFile(resolve(root, config.deploymentsDir, "shared", "context.json"), {
    ...sharedContext,
    systemPrompt,
    knowledgeFiles: splitCommaList(knowledgeFiles),
    notes: splitCommaList(notes),
  });
}

async function editRuntimeDefaults(
  root: string,
  config: ClawConfig,
  sharedDefaults: SharedDeploymentDefaults,
) {
  const mode = await promptForChoice({
    title: "Execution mode",
    options: [
      { value: "sandbox", label: "Sandbox", hint: "Use the sandbox runtime for execution." },
      { value: "metadata", label: "Metadata", hint: "No sandbox execution." },
    ],
    initialValue: sharedDefaults.execution.mode,
  });
  const sandboxEnabled = await promptForConfirm({
    label: "Enable sandbox execution",
    defaultValue: sharedDefaults.execution.sandbox.enabled,
  });
  const timeoutMs = await promptForText({
    label: "Sandbox timeout ms",
    defaultValue: String(sharedDefaults.execution.sandbox.timeoutMs),
  });

  const nextDefaults = normalizeSharedDeploymentDefaults({
    ...sharedDefaults,
    execution: normalizeRuntimeExecutionConfig({
      ...sharedDefaults.execution,
      mode: mode as SharedDeploymentDefaults["execution"]["mode"],
      sandbox: {
        ...sharedDefaults.execution.sandbox,
        enabled: sandboxEnabled,
        timeoutMs: Number(timeoutMs),
      },
    }),
  });

  await writeJsonFile(resolve(root, config.deploymentsDir, "shared", "defaults.json"), nextDefaults);
}

async function editInstanceSettings(
  root: string,
  config: ClawConfig,
  instanceManifest: InstanceManifest,
) {
  const label = await promptForText({
    label: "Instance label",
    defaultValue: instanceManifest.label,
  });
  const gateMode = await promptForChoice({
    title: "Gate mode",
    options: [
      { value: "member", label: "Member", hint: "Protected member-only instance." },
      { value: "password", label: "Password", hint: "Protected by password secret." },
      { value: "public", label: "Public", hint: "Publicly accessible instance." },
    ],
    initialValue: instanceManifest.gate.mode,
  });

  const nextInstance = normalizeInstanceManifest({
    ...instanceManifest,
    label,
    gate: {
      ...instanceManifest.gate,
      mode: gateMode as InstanceManifest["gate"]["mode"],
    },
  }, "000");

  await writeJsonFile(resolve(root, config.deploymentsDir, "instances", "000", "instance.json"), nextInstance);
}

async function editInstanceTools(
  root: string,
  config: ClawConfig,
  toolsConfig: ToolsConfig,
) {
  const installedToolIds = await readInstalledToolIds(root, config);
  const exposedToolIds = await promptForSelections({
    title: "Select tools exposed to instance 000",
    help: "Use space to toggle a tool. Press Enter when the checklist is complete.",
    options: installedToolIds.map((toolId) => ({
      value: toolId,
      label: toolId,
    })),
    initialValues: toolsConfig.exposedToolIds,
  });

  await writeJsonFile(resolve(root, config.deploymentsDir, "instances", "000", "tools.json"), {
    ...toolsConfig,
    exposedToolIds,
  });
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
  await handleSyncCommand(root, config);

  const vercelArgs = ["bunx", "vercel", "deploy"];
  if (prod) {
    vercelArgs.push("--prod");
  }

  await run(vercelArgs, appDir);
  printConnectorInstructions(config);
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

function isWorkspaceRoot(root: string) {
  return existsSync(join(root, CLAW_CONFIG_FILE));
}

function requireWorkspaceRoot(root: string, hasWorkspaceRoot: boolean) {
  if (!hasWorkspaceRoot) {
    throw new Error("This command only works inside a vercel-claw workspace.");
  }

  return root;
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
    console.log(`Updated ${relativeToCwd(path)} with newly selected keys`);
  } else {
    console.log(`${relativeToCwd(path)} already includes the selected keys`);
  }
}

async function writeEnvValues(path: string, values: Record<string, string>) {
  const current = existsSync(path) ? await Bun.file(path).text() : "";
  const next = upsertEnvValues(current, values);
  await Bun.write(path, next);
  console.log(`Updated ${relativeToCwd(path)} with prompted values`);
}

async function ensureEditableDeploymentArea(
  root: string,
  config: ClawConfig,
  installedToolIds: string[],
) {
  const deploymentsDir = resolve(root, config.deploymentsDir);
  const deploymentRoot = deploymentsDir;
  const sharedDir = join(deploymentRoot, "shared");
  const toolsetsDir = join(sharedDir, "toolsets");
  const instancesDir = join(deploymentRoot, "instances");
  const firstInstanceId = formatInstanceKey(0);
  const firstInstanceDir = join(instancesDir, firstInstanceId);

  await mkdir(toolsetsDir, { recursive: true });
  await mkdir(firstInstanceDir, { recursive: true });

  await ensureJsonFile(join(deploymentRoot, "deployment.json"), createDeploymentManifest(config));
  await writeJsonFile(
    join(deploymentRoot, "installed-tools.json"),
    createDefaultInstalledToolsManifest(installedToolIds),
  );
  await ensureJsonFile(join(sharedDir, "defaults.json"), createSharedDeploymentDefaults(config));
  await ensureJsonFile(join(sharedDir, "context.json"), createSharedContextConfig());
  await ensureJsonFile(join(toolsetsDir, "default.json"), createDefaultToolsetManifest(config));
  await ensureJsonFile(join(firstInstanceDir, "instance.json"), createInstanceManifest(firstInstanceId));
  await ensureJsonFile(join(firstInstanceDir, "tools.json"), createDefaultToolsConfig());
  await ensureJsonFile(join(firstInstanceDir, "context.json"), createInstanceContextConfig());
}

async function syncWorkspaceDerivedFiles(
  root: string,
  config: ClawConfig,
  installedToolIds: string[],
) {
  const deploymentsDir = resolve(root, config.deploymentsDir);
  const deploymentRoot = deploymentsDir;
  const sharedDir = join(deploymentRoot, "shared");
  const toolsetsDir = join(sharedDir, "toolsets");
  const instancesDir = join(deploymentRoot, "instances");
  const firstInstanceId = formatInstanceKey(0);
  const firstInstanceDir = join(instancesDir, firstInstanceId);

  await mkdir(toolsetsDir, { recursive: true });
  await mkdir(firstInstanceDir, { recursive: true });

  await ensureJsonFile(join(deploymentRoot, "deployment.json"), createDeploymentManifest(config));
  await writeJsonFile(
    join(deploymentRoot, "installed-tools.json"),
    createDefaultInstalledToolsManifest(installedToolIds),
  );
  await writeJsonFile(join(sharedDir, "defaults.json"), createSharedDeploymentDefaults(config));
  await ensureJsonFile(join(sharedDir, "context.json"), createSharedContextConfig());
  await writeJsonFile(join(toolsetsDir, "default.json"), createDefaultToolsetManifest(config));
  await ensureJsonFile(join(firstInstanceDir, "instance.json"), createInstanceManifest(firstInstanceId));
  await ensureJsonFile(join(firstInstanceDir, "tools.json"), createDefaultToolsConfig());
  await ensureJsonFile(join(firstInstanceDir, "context.json"), createInstanceContextConfig());
}

async function ensureJsonFile(path: string, value: unknown) {
  if (existsSync(path)) {
    return;
  }

  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Created ${relativeToCwd(path)}`);
}

async function writeJsonFile(path: string, value: unknown) {
  await Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`Updated ${relativeToCwd(path)}`);
}

async function readInstalledToolIds(root: string, config: ClawConfig) {
  const installedToolsPath = resolve(root, config.deploymentsDir, "installed-tools.json");

  if (!existsSync(installedToolsPath)) {
    return [] as string[];
  }

  const manifest = (await Bun.file(installedToolsPath).json()) as {
    installedToolIds?: string[];
  };
  return manifest.installedToolIds ?? [];
}

async function collectPromptedEnvValues(config: ClawConfig, envPath: string) {
  const { requiredEnvVars, optionalEnvVars } = resolveEnvRequirements(config);
  const promptKeys = [...requiredEnvVars, ...optionalEnvVars].filter(shouldPromptForEnvKey);
  return await collectEnvValuesForKeys(promptKeys, envPath);
}

async function collectEnvValuesForKeys(keys: string[], envPath: string) {
  const envValues = await readEnvMap(envPath);
  const uniqueKeys = Array.from(new Set(keys));
  const values: Record<string, string> = {};

  for (const key of uniqueKeys) {
    const definition = describeEnvPrompt(key);
    const value = await promptForText({
      label: definition.label,
      help: definition.help,
      initialValue: envValues.get(key),
      secret: definition.secret,
    });

    if (value.length > 0) {
      values[key] = value;
    }
  }

  return values;
}

function describeEnvPrompt(key: string): EnvPromptDefinition {
  const definition = envPromptCatalog[key];
  if (definition) {
    return definition;
  }

  return {
    label: humanizeEnvKey(key),
    secret: /(TOKEN|SECRET|KEY|PASSWORD)/.test(key),
  };
}

function shouldPromptForEnvKey(key: string) {
  if (autoManagedEnvKeys.has(key)) {
    return false;
  }

  const definition = envPromptCatalog[key];
  return definition?.promptOnSetup !== false;
}

function normalizeSurfaceSelection(ids: string[]) {
  const unique = Array.from(new Set(ids.filter((value) => surfaceCatalog.some((surface) => surface.id === value))));
  return unique.length > 0 ? unique : ["web"];
}

function printSetupSummary(root: string, config: ClawConfig, installedToolIds: string[]) {
  console.log("");
  console.log(`Workspace: ${root}`);
  console.log(`Name: ${config.name}`);
  console.log(`Default model: ${config.defaultModel}`);
  console.log(
    `Surfaces: ${config.enabledSurfaceIds.length > 0 ? config.enabledSurfaceIds.join(", ") : "none"}`,
  );
  console.log(
    `Toolkits: ${config.selectedToolkitIds.length > 0 ? config.selectedToolkitIds.join(", ") : "none"}`,
  );
  console.log(
    `CLIs: ${config.selectedCliIds.length > 0 ? config.selectedCliIds.join(", ") : "none"}`,
  );
  console.log(`Installed tools: ${installedToolIds.length > 0 ? installedToolIds.join(", ") : "none"}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run vercel-claw doctor");
  console.log("  2. Install any missing CLIs");
  console.log("  3. Review apps/vercel-claw/.env.local");
  console.log("  4. Run vercel-claw settings edit for the interactive operator UI");
  console.log(`  5. Edit ${config.deploymentsDir}/shared manually only if you want raw file control`);
  console.log("  6. Run vercel-claw sync after Convex is available");
  console.log("  7. Run vercel-claw deploy when you are ready");
  printConnectorInstructions(config);
}

function printConnectorList(config: ClawConfig) {
  const enabled = new Set(config.enabledSurfaceIds);
  for (const surface of surfaceCatalog) {
    console.log(surface.id);
    console.log(`  label: ${surface.label}`);
    console.log(`  status: ${enabled.has(surface.id) ? "enabled" : "disabled"}`);
    console.log(`  description: ${surface.description}`);
    console.log(
      `  requiredEnv: ${surface.requiredEnvVars.length > 0 ? surface.requiredEnvVars.join(", ") : "none"}`,
    );
    console.log(
      `  optionalEnv: ${surface.optionalEnvVars.length > 0 ? surface.optionalEnvVars.join(", ") : "none"}`,
    );
  }
}

function printConnectorInstructions(config: ClawConfig) {
  const enabled = new Set(config.enabledSurfaceIds);
  const lines: string[] = [];

  if (enabled.has("telegram")) {
    lines.push("  Telegram webhook: https://<your-domain>/api/channels/telegram/webhook");
  }

  if (enabled.has("slack")) {
    lines.push("  Slack Events API: https://<your-domain>/api/channels/slack/events");
  }

  if (lines.length === 0) {
    return;
  }

  console.log("");
  console.log("Connector webhooks:");
  for (const line of lines) {
    console.log(line);
  }
}

async function initializeWorkspacePackageName(root: string, workspaceName?: string) {
  const packagePath = join(root, "package.json");
  if (!existsSync(packagePath)) {
    return;
  }

  const current = (await Bun.file(packagePath).json()) as Record<string, unknown>;
  const nextName = toPackageName(workspaceName ?? basename(root));
  if (typeof current.name === "string" && current.name === nextName) {
    return;
  }

  current.name = nextName;
  await Bun.write(packagePath, `${JSON.stringify(current, null, 2)}\n`);
}

async function readSharedDefaults(root: string, config: ClawConfig) {
  const path = resolve(root, config.deploymentsDir, "shared", "defaults.json");
  if (!existsSync(path)) {
    return createSharedDeploymentDefaults(config);
  }

  return normalizeSharedDeploymentDefaults((await Bun.file(path).json()) as Partial<SharedDeploymentDefaults>);
}

async function readSharedContext(root: string, config: ClawConfig) {
  const path = resolve(root, config.deploymentsDir, "shared", "context.json");
  if (!existsSync(path)) {
    return createSharedContextConfig();
  }

  const raw = (await Bun.file(path).json()) as Partial<SharedContextConfig> & Record<string, unknown>;
  return {
    ...raw,
    version: typeof raw.version === "number" ? raw.version : 1,
    systemPrompt:
      typeof raw.systemPrompt === "string" && raw.systemPrompt.trim().length > 0
        ? raw.systemPrompt
        : createSharedContextConfig().systemPrompt,
    instructions: Array.isArray(raw.instructions) ? raw.instructions.filter(isString) : [],
    knowledgeFiles: Array.isArray(raw.knowledgeFiles) ? raw.knowledgeFiles.filter(isString) : [],
    notes: Array.isArray(raw.notes) ? raw.notes.filter(isString) : [],
  } satisfies SharedContextConfig & Record<string, unknown>;
}

async function readInstanceManifest(root: string, config: ClawConfig, instanceId: string) {
  const path = resolve(root, config.deploymentsDir, "instances", instanceId, "instance.json");
  if (!existsSync(path)) {
    return createInstanceManifest(instanceId);
  }

  return normalizeInstanceManifest((await Bun.file(path).json()) as Partial<InstanceManifest>, instanceId);
}

async function readInstanceToolsConfig(root: string, config: ClawConfig, instanceId: string) {
  const path = resolve(root, config.deploymentsDir, "instances", instanceId, "tools.json");
  if (!existsSync(path)) {
    return createDefaultToolsConfig();
  }

  const raw = (await Bun.file(path).json()) as Partial<ToolsConfig>;
  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    mode: raw.mode === "allowlist" ? "allowlist" : "allowlist",
    exposedToolIds: Array.isArray(raw.exposedToolIds) ? raw.exposedToolIds.filter(isString) : [],
  } satisfies ToolsConfig;
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

function humanizeEnvKey(key: string) {
  return key
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPackageName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "vercel-claw-app";
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
