import { DEFAULT_TOOL_REGISTRY_URL } from "./tool-registry";

export interface ClawConfig {
  name: string;
  appDir: string;
  convexDir: string;
  deploymentsDir: string;
  defaultModel: string;
  toolRegistryUrl: string;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  selectedCliIds: string[];
  selectedToolkitIds: string[];
}

export interface CliDefinition {
  id: string;
  label: string;
  binary: string;
  description: string;
  installHint: string;
}

export interface ToolkitDefinition {
  id: string;
  label: string;
  description: string;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  recommendedCliIds: string[];
}

export const DEFAULT_DEPLOYMENTS_DIR = "deployments";
export const DEFAULT_DEPLOYMENT_ID = "default";
export const DEFAULT_INSTANCE_ID_PADDING = 3;

export const instanceGateModes = ["member", "password", "public"] as const;
export type InstanceGateMode = (typeof instanceGateModes)[number];

export interface InstanceGateConfig {
  mode: InstanceGateMode;
  passwordSecretName: string | null;
}

export interface DeploymentManifest {
  id: string;
  label: string;
  sharedDefaultsFile: string;
  nextInstanceNumber: number;
  instanceIdPadding: number;
}

export const executionModes = ["metadata", "sandbox"] as const;
export type ExecutionMode = (typeof executionModes)[number];

export interface SandboxExecutionConfig {
  enabled: boolean;
  timeoutMs: number;
  snapshotExpirationMs: number | null;
  vcpus: number | null;
}

export interface RuntimeExecutionConfig {
  mode: ExecutionMode;
  sandbox: SandboxExecutionConfig;
}

export interface InstanceExecutionOverrides {
  mode: ExecutionMode | null;
  sandboxEnabled: boolean | null;
  timeoutMs: number | null;
  snapshotExpirationMs: number | null;
  vcpus: number | null;
}

export interface SharedDeploymentDefaults {
  defaultModel: string;
  promptFiles: string[];
  toolsetFile: string;
  integrations: string[];
  execution: RuntimeExecutionConfig;
}

export interface SharedContextConfig {
  version: number;
  systemPrompt: string;
  instructions: string[];
  knowledgeFiles: string[];
  notes: string[];
}

export interface ContextConfig {
  version: number;
  inheritsShared: boolean;
  systemPrompt: string | null;
  instructions: string[];
  knowledgeFiles: string[];
  notes: string[];
}

export interface ToolsetManifest {
  id: string;
  label: string;
  enabledToolkitIds: string[];
}

export interface ToolsConfig {
  version: number;
  mode: "allowlist";
  exposedToolIds: string[];
}

export interface InstalledToolsManifest {
  version: number;
  installedToolIds: string[];
}

export interface InstanceManifest {
  id: string;
  label: string;
  extends: "shared";
  promptFiles: string[];
  toolsetFile: string | null;
  enabledToolkitIds: string[];
  disabledToolkitIds: string[];
  gate: InstanceGateConfig;
  execution: InstanceExecutionOverrides;
}

export const CLAW_CONFIG_FILE = "vercel-claw.config.json";

export const defaultClawConfig: ClawConfig = {
  name: "personal-vercel-claw",
  appDir: "apps/vercel-claw",
  convexDir: "apps/vercel-claw/convex",
  deploymentsDir: DEFAULT_DEPLOYMENTS_DIR,
  defaultModel: "gpt-5",
  toolRegistryUrl: DEFAULT_TOOL_REGISTRY_URL,
  requiredEnvVars: [
    "OPENAI_API_KEY",
    "NEXT_PUBLIC_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
  ],
  optionalEnvVars: [
    "OPENAI_BASE_URL",
    "CLAW_AGENT_MODEL",
    "CLAW_SYSTEM_PROMPT",
    "TELEGRAM_BOT_TOKEN",
    "VERCEL_TOKEN",
    "VERCEL_TEAM_ID",
    "VERCEL_PROJECT_ID",
  ],
  selectedCliIds: ["bun", "git", "convex", "vercel"],
  selectedToolkitIds: [],
};

export const cliCatalog: CliDefinition[] = [
  {
    id: "bun",
    label: "Bun",
    binary: "bun",
    description: "Runtime and package manager for the monorepo and CLI.",
    installHint: "Install Bun from https://bun.sh",
  },
  {
    id: "git",
    label: "Git",
    binary: "git",
    description: "Version control for local edits, sync, and branching.",
    installHint: "Install Git from https://git-scm.com/downloads",
  },
  {
    id: "convex",
    label: "Convex CLI",
    binary: "convex",
    description: "Backend deploys, schema pushes, and local Convex development.",
    installHint: "Run `bunx convex --help` or install globally with your preferred package manager.",
  },
  {
    id: "vercel",
    label: "Vercel CLI",
    binary: "vercel",
    description: "Project linking and Vercel deployments.",
    installHint: "Run `bunx vercel --help` or install globally with your preferred package manager.",
  },
  {
    id: "gh",
    label: "GitHub CLI",
    binary: "gh",
    description: "Repository auth, PR workflows, and issue access.",
    installHint: "Install GitHub CLI from https://cli.github.com",
  },
  {
    id: "gcloud",
    label: "Google Cloud CLI",
    binary: "gcloud",
    description: "Google Workspace and Google API auth workflows.",
    installHint: "Install gcloud from https://cloud.google.com/sdk/docs/install",
  },
  {
    id: "slack",
    label: "Slack CLI",
    binary: "slack",
    description: "Optional Slack app development and auth tooling.",
    installHint: "Install Slack CLI from https://api.slack.com/automation/cli/install",
  },
];

export const toolkitCatalog: ToolkitDefinition[] = [
  {
    id: "github",
    label: "GitHub",
    description: "Repository access, PR actions, and issue workflows.",
    requiredEnvVars: [],
    optionalEnvVars: ["GITHUB_TOKEN"],
    recommendedCliIds: ["gh"],
  },
  {
    id: "notion",
    label: "Notion",
    description: "Workspace docs, databases, and notes as agent context.",
    requiredEnvVars: ["NOTION_API_KEY"],
    optionalEnvVars: ["NOTION_DATABASE_ID", "NOTION_PARENT_PAGE_ID"],
    recommendedCliIds: [],
  },
  {
    id: "posthog",
    label: "PostHog",
    description: "Product analytics, dashboards, flags, experiments, logs, and schema access.",
    requiredEnvVars: ["POSTHOG_API_KEY", "POSTHOG_PROJECT_ID"],
    optionalEnvVars: [
      "POSTHOG_HOST",
      "POSTHOG_REQUEST_TIMEOUT_MS",
      "POSTHOG_ENABLE_LOGS",
      "POSTHOG_ENABLE_FLAGS",
      "POSTHOG_ENABLE_EXPERIMENTS",
    ],
    recommendedCliIds: [],
  },
  {
    id: "google-workspace",
    label: "Google Workspace",
    description: "Gmail, Docs, Drive, and Calendar access.",
    requiredEnvVars: [
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_WORKSPACE_REDIRECT_URI",
    ],
    optionalEnvVars: [
      "GOOGLE_PROJECT_ID",
      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    ],
    recommendedCliIds: ["gcloud"],
  },
  {
    id: "slack",
    label: "Slack",
    description: "Slack channel automation and bot actions.",
    requiredEnvVars: ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET"],
    optionalEnvVars: ["SLACK_APP_TOKEN"],
    recommendedCliIds: ["slack"],
  },
  {
    id: "linear",
    label: "Linear",
    description: "Issue tracking and project planning workflows.",
    requiredEnvVars: ["LINEAR_API_KEY"],
    optionalEnvVars: ["LINEAR_TEAM_ID"],
    recommendedCliIds: [],
  },
  {
    id: "discord",
    label: "Discord",
    description: "Discord bot and channel automation workflows.",
    requiredEnvVars: ["DISCORD_BOT_TOKEN"],
    optionalEnvVars: ["DISCORD_APPLICATION_ID", "DISCORD_PUBLIC_KEY"],
    recommendedCliIds: [],
  },
  {
    id: "gmail",
    label: "Gmail",
    description: "Focused Gmail integration when full Workspace is not needed.",
    requiredEnvVars: [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REDIRECT_URI",
    ],
    optionalEnvVars: ["GMAIL_REFRESH_TOKEN"],
    recommendedCliIds: ["gcloud"],
  },
];

export const convexTables = [
  "deployments",
  "deploymentConfigs",
  "agents",
  "instanceConfigs",
  "sandboxRuns",
  "threads",
  "messages",
  "artifacts",
  "settings",
] as const;

export function mergeClawConfig(
  partial: Partial<ClawConfig> | null | undefined,
): ClawConfig {
  return {
    name:
      typeof partial?.name === "string" && partial.name.trim().length > 0
        ? partial.name
        : defaultClawConfig.name,
    appDir:
      typeof partial?.appDir === "string" && partial.appDir.trim().length > 0
        ? partial.appDir
        : defaultClawConfig.appDir,
    convexDir:
      typeof partial?.convexDir === "string" && partial.convexDir.trim().length > 0
        ? partial.convexDir
        : defaultClawConfig.convexDir,
    deploymentsDir:
      typeof partial?.deploymentsDir === "string" && partial.deploymentsDir.trim().length > 0
        ? partial.deploymentsDir
        : defaultClawConfig.deploymentsDir,
    defaultModel:
      typeof partial?.defaultModel === "string" && partial.defaultModel.trim().length > 0
        ? partial.defaultModel
        : defaultClawConfig.defaultModel,
    toolRegistryUrl:
      typeof partial?.toolRegistryUrl === "string" && partial.toolRegistryUrl.trim().length > 0
        ? partial.toolRegistryUrl
        : defaultClawConfig.toolRegistryUrl,
    requiredEnvVars:
      partial?.requiredEnvVars ?? defaultClawConfig.requiredEnvVars,
    optionalEnvVars:
      partial?.optionalEnvVars ?? defaultClawConfig.optionalEnvVars,
    selectedCliIds:
      partial?.selectedCliIds ?? defaultClawConfig.selectedCliIds,
    selectedToolkitIds:
      partial?.selectedToolkitIds ?? defaultClawConfig.selectedToolkitIds,
  };
}

export function createEnvTemplate(config: ClawConfig = defaultClawConfig) {
  const { requiredEnvVars, optionalEnvVars } = resolveEnvRequirements(config);
  const requiredLines = requiredEnvVars.map((key) => `${key}=`);
  const optionalLines = optionalEnvVars.map((key) => `${key}=`);

  return [
    "# Generated by vercel-claw",
    "# Fill these values before running the app or deployment commands.",
    "",
    ...requiredLines,
    "",
    ...optionalLines,
    "",
  ].join("\n");
}

export function formatInstanceKey(
  value: number,
  padding = DEFAULT_INSTANCE_ID_PADDING,
) {
  return value.toString().padStart(padding, "0");
}

export function createDeploymentManifest(
  _config: ClawConfig = defaultClawConfig,
): DeploymentManifest {
  return {
    id: DEFAULT_DEPLOYMENT_ID,
    label: "Deployment",
    sharedDefaultsFile: "shared/defaults.json",
    nextInstanceNumber: 1,
    instanceIdPadding: DEFAULT_INSTANCE_ID_PADDING,
  };
}

export function createSharedDeploymentDefaults(
  config: ClawConfig = defaultClawConfig,
): SharedDeploymentDefaults {
  return {
    defaultModel: config.defaultModel,
    promptFiles: [],
    toolsetFile: "toolsets/default.json",
    integrations: config.selectedToolkitIds,
    execution: createDefaultRuntimeExecutionConfig(),
  };
}

export function createSharedContextConfig(): SharedContextConfig {
  return {
    version: 1,
    systemPrompt: "You are vercel-claw, a concise personal AI operator.",
    instructions: [],
    knowledgeFiles: [],
    notes: [],
  };
}

export function createInstanceContextConfig(): ContextConfig {
  return {
    version: 1,
    inheritsShared: true,
    systemPrompt: null,
    instructions: [],
    knowledgeFiles: [],
    notes: [],
  };
}

export function resolveContextConfig(
  shared: SharedContextConfig,
  instance: ContextConfig,
): SharedContextConfig {
  if (!instance.inheritsShared) {
    return {
      version: Math.max(shared.version, instance.version),
      systemPrompt: instance.systemPrompt ?? shared.systemPrompt,
      instructions: uniqueStrings([...instance.instructions]),
      knowledgeFiles: uniqueStrings([...instance.knowledgeFiles]),
      notes: uniqueStrings([...instance.notes]),
    };
  }

  return {
    version: Math.max(shared.version, instance.version),
    systemPrompt: instance.systemPrompt ?? shared.systemPrompt,
    instructions: uniqueStrings([...shared.instructions, ...instance.instructions]),
    knowledgeFiles: uniqueStrings([...shared.knowledgeFiles, ...instance.knowledgeFiles]),
    notes: uniqueStrings([...shared.notes, ...instance.notes]),
  };
}

export function createDefaultToolsetManifest(
  config: ClawConfig = defaultClawConfig,
): ToolsetManifest {
  return {
    id: "default",
    label: "Default toolset",
    enabledToolkitIds: config.selectedToolkitIds,
  };
}

export function createDefaultToolsConfig(exposedToolIds: string[] = []): ToolsConfig {
  return {
    version: 1,
    mode: "allowlist",
    exposedToolIds,
  };
}

export function createDefaultInstalledToolsManifest(
  installedToolIds: string[] = [],
): InstalledToolsManifest {
  return {
    version: 1,
    installedToolIds,
  };
}

export function createInstanceManifest(
  instanceId = formatInstanceKey(0),
): InstanceManifest {
  return {
    id: instanceId,
    label: `Instance ${instanceId}`,
    extends: "shared",
    promptFiles: [],
    toolsetFile: null,
    enabledToolkitIds: [],
    disabledToolkitIds: [],
    gate: {
      mode: "member",
      passwordSecretName: null,
    },
    execution: createDefaultInstanceExecutionOverrides(),
  };
}

export function createDefaultRuntimeExecutionConfig(): RuntimeExecutionConfig {
  return {
    mode: "sandbox",
    sandbox: {
      enabled: true,
      timeoutMs: 300_000,
      snapshotExpirationMs: 7 * 24 * 60 * 60 * 1000,
      vcpus: null,
    },
  };
}

export function createDefaultInstanceExecutionOverrides(): InstanceExecutionOverrides {
  return {
    mode: null,
    sandboxEnabled: null,
    timeoutMs: null,
    snapshotExpirationMs: null,
    vcpus: null,
  };
}

export function normalizeSharedDeploymentDefaults(
  partial: Partial<SharedDeploymentDefaults> | null | undefined,
): SharedDeploymentDefaults {
  const defaults = createSharedDeploymentDefaults();
  const execution = normalizeRuntimeExecutionConfig(partial?.execution);

  return {
    defaultModel:
      typeof partial?.defaultModel === "string" && partial.defaultModel.trim().length > 0
        ? partial.defaultModel
        : defaults.defaultModel,
    promptFiles: Array.isArray(partial?.promptFiles)
      ? partial.promptFiles.filter((value): value is string => typeof value === "string")
      : defaults.promptFiles,
    toolsetFile:
      typeof partial?.toolsetFile === "string" && partial.toolsetFile.trim().length > 0
        ? partial.toolsetFile
        : defaults.toolsetFile,
    integrations: Array.isArray(partial?.integrations)
      ? partial.integrations.filter((value): value is string => typeof value === "string")
      : defaults.integrations,
    execution,
  };
}

export function normalizeInstanceManifest(
  partial: Partial<InstanceManifest> | null | undefined,
  instanceId = formatInstanceKey(0),
): InstanceManifest {
  const defaults = createInstanceManifest(instanceId);

  return {
    id:
      typeof partial?.id === "string" && partial.id.trim().length > 0
        ? partial.id
        : defaults.id,
    label:
      typeof partial?.label === "string" && partial.label.trim().length > 0
        ? partial.label
        : defaults.label,
    extends: partial?.extends === "shared" ? "shared" : defaults.extends,
    promptFiles: Array.isArray(partial?.promptFiles)
      ? partial.promptFiles.filter((value): value is string => typeof value === "string")
      : defaults.promptFiles,
    toolsetFile:
      typeof partial?.toolsetFile === "string"
        ? partial.toolsetFile
        : partial?.toolsetFile === null
          ? null
          : defaults.toolsetFile,
    enabledToolkitIds: Array.isArray(partial?.enabledToolkitIds)
      ? partial.enabledToolkitIds.filter((value): value is string => typeof value === "string")
      : defaults.enabledToolkitIds,
    disabledToolkitIds: Array.isArray(partial?.disabledToolkitIds)
      ? partial.disabledToolkitIds.filter((value): value is string => typeof value === "string")
      : defaults.disabledToolkitIds,
    gate: {
      mode:
        partial?.gate?.mode === "member" ||
        partial?.gate?.mode === "password" ||
        partial?.gate?.mode === "public"
          ? partial.gate.mode
          : defaults.gate.mode,
      passwordSecretName:
        typeof partial?.gate?.passwordSecretName === "string"
          ? partial.gate.passwordSecretName
          : partial?.gate?.passwordSecretName === null
            ? null
            : defaults.gate.passwordSecretName,
    },
    execution: normalizeInstanceExecutionOverrides(partial?.execution),
  };
}

export function normalizeRuntimeExecutionConfig(
  partial: Partial<RuntimeExecutionConfig> | null | undefined,
): RuntimeExecutionConfig {
  const defaults = createDefaultRuntimeExecutionConfig();

  return {
    mode: partial?.mode === "metadata" || partial?.mode === "sandbox" ? partial.mode : defaults.mode,
    sandbox: {
      enabled:
        typeof partial?.sandbox?.enabled === "boolean"
          ? partial.sandbox.enabled
          : defaults.sandbox.enabled,
      timeoutMs:
        typeof partial?.sandbox?.timeoutMs === "number" && Number.isFinite(partial.sandbox.timeoutMs)
          ? partial.sandbox.timeoutMs
          : defaults.sandbox.timeoutMs,
      snapshotExpirationMs:
        typeof partial?.sandbox?.snapshotExpirationMs === "number" &&
        Number.isFinite(partial.sandbox.snapshotExpirationMs)
          ? partial.sandbox.snapshotExpirationMs
          : partial?.sandbox?.snapshotExpirationMs === null
            ? null
            : defaults.sandbox.snapshotExpirationMs,
      vcpus:
        typeof partial?.sandbox?.vcpus === "number" && Number.isFinite(partial.sandbox.vcpus)
          ? partial.sandbox.vcpus
          : partial?.sandbox?.vcpus === null
            ? null
            : defaults.sandbox.vcpus,
    },
  };
}

export function normalizeInstanceExecutionOverrides(
  partial: Partial<InstanceExecutionOverrides> | null | undefined,
): InstanceExecutionOverrides {
  const defaults = createDefaultInstanceExecutionOverrides();

  return {
    mode: partial?.mode === "metadata" || partial?.mode === "sandbox" ? partial.mode : defaults.mode,
    sandboxEnabled:
      typeof partial?.sandboxEnabled === "boolean" ? partial.sandboxEnabled : defaults.sandboxEnabled,
    timeoutMs:
      typeof partial?.timeoutMs === "number" && Number.isFinite(partial.timeoutMs)
        ? partial.timeoutMs
        : partial?.timeoutMs === null
          ? null
          : defaults.timeoutMs,
    snapshotExpirationMs:
      typeof partial?.snapshotExpirationMs === "number" &&
      Number.isFinite(partial.snapshotExpirationMs)
        ? partial.snapshotExpirationMs
        : partial?.snapshotExpirationMs === null
          ? null
          : defaults.snapshotExpirationMs,
    vcpus:
      typeof partial?.vcpus === "number" && Number.isFinite(partial.vcpus)
        ? partial.vcpus
        : partial?.vcpus === null
          ? null
          : defaults.vcpus,
  };
}

export function resolveRuntimeExecutionConfig(
  shared: RuntimeExecutionConfig,
  overrides: InstanceExecutionOverrides,
): RuntimeExecutionConfig {
  return {
    mode: overrides.mode ?? shared.mode,
    sandbox: {
      enabled: overrides.sandboxEnabled ?? shared.sandbox.enabled,
      timeoutMs: overrides.timeoutMs ?? shared.sandbox.timeoutMs,
      snapshotExpirationMs:
        overrides.snapshotExpirationMs ?? shared.sandbox.snapshotExpirationMs,
      vcpus: overrides.vcpus ?? shared.sandbox.vcpus,
    },
  };
}

export function resolveCliDefinitions(config: ClawConfig = defaultClawConfig) {
  return config.selectedCliIds
    .map((id) => cliCatalog.find((entry) => entry.id === id))
    .filter((entry): entry is CliDefinition => Boolean(entry));
}

export function resolveToolkitDefinitions(config: ClawConfig = defaultClawConfig) {
  return config.selectedToolkitIds
    .map((id) => toolkitCatalog.find((entry) => entry.id === id))
    .filter((entry): entry is ToolkitDefinition => Boolean(entry));
}

export function resolveEnvRequirements(config: ClawConfig = defaultClawConfig) {
  const requiredEnvVars = new Set(config.requiredEnvVars);
  const optionalEnvVars = new Set(config.optionalEnvVars);

  for (const toolkit of resolveToolkitDefinitions(config)) {
    for (const key of toolkit.requiredEnvVars) {
      requiredEnvVars.add(key);
      optionalEnvVars.delete(key);
    }

    for (const key of toolkit.optionalEnvVars) {
      if (!requiredEnvVars.has(key)) {
        optionalEnvVars.add(key);
      }
    }
  }

  return {
    requiredEnvVars: Array.from(requiredEnvVars),
    optionalEnvVars: Array.from(optionalEnvVars),
  };
}

export function resolveRecommendedCliIds(
  toolkitIds: string[],
  baseCliIds: string[] = defaultClawConfig.selectedCliIds,
) {
  const selectedCliIds = new Set(baseCliIds);

  for (const toolkitId of toolkitIds) {
    const toolkit = toolkitCatalog.find((entry) => entry.id === toolkitId);
    if (!toolkit) {
      continue;
    }

    for (const cliId of toolkit.recommendedCliIds) {
      selectedCliIds.add(cliId);
    }
  }

  return Array.from(selectedCliIds);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

export * from "./contracts";
export * from "./prompt-composition";
export * from "./tool-manifests";
export * from "./tool-registry";
