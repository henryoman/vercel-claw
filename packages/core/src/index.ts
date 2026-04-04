export interface ClawConfig {
  name: string;
  appDir: string;
  convexDir: string;
  deploymentsDir: string;
  defaultDeploymentId: string;
  defaultModel: string;
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

export interface SharedDeploymentDefaults {
  defaultModel: string;
  promptFiles: string[];
  toolsetFile: string;
  integrations: string[];
}

export interface ToolsetManifest {
  id: string;
  label: string;
  enabledToolkitIds: string[];
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
}

export const CLAW_CONFIG_FILE = "vercel-claw.config.json";

export const defaultClawConfig: ClawConfig = {
  name: "personal-vercel-claw",
  appDir: "apps/vercel-claw",
  convexDir: "apps/vercel-claw/convex",
  deploymentsDir: DEFAULT_DEPLOYMENTS_DIR,
  defaultDeploymentId: DEFAULT_DEPLOYMENT_ID,
  defaultModel: "gpt-5",
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
  "agents",
  "threads",
  "messages",
  "artifacts",
  "settings",
] as const;

export function mergeClawConfig(
  partial: Partial<ClawConfig> | null | undefined,
): ClawConfig {
  return {
    ...defaultClawConfig,
    ...partial,
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
  config: ClawConfig = defaultClawConfig,
): DeploymentManifest {
  return {
    id: config.defaultDeploymentId,
    label: "Default deployment",
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
    promptFiles: ["prompts/system.md"],
    toolsetFile: "toolsets/default.json",
    integrations: config.selectedToolkitIds,
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
  };
}

export function createSharedSystemPromptFile() {
  return [
    "# Shared system prompt",
    "",
    "You are vercel-claw, a concise personal AI operator.",
  ].join("\n");
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

export * from "./contracts";
