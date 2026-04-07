import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "posthog",
  version: "0.1.0",
  label: "PostHog",
  description:
    "PostHog MCP access for analytics, dashboards, feature flags, experiments, logs, and docs.",
  kind: "mcp",
  activationScope: "instance",
  dependencies: [],
  installCommands: [],
  verifyCommands: [],
  requiredEnvVars: ["POSTHOG_API_KEY", "POSTHOG_PROJECT_ID"],
  optionalEnvVars: [
    "POSTHOG_HOST",
    "POSTHOG_REQUEST_TIMEOUT_MS",
    "POSTHOG_ENABLE_LOGS",
    "POSTHOG_ENABLE_FLAGS",
    "POSTHOG_ENABLE_EXPERIMENTS",
  ],
  cacheSubdir: "posthog",
};

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "posthog",
  label: "PostHog",
  runtime: "mcp",
  docsFile: "knowledge/mcp-docs.md",
  description:
    "PostHog MCP access for analytics, dashboards, feature flags, experiments, logs, and docs.",
  mcpServerName: "posthog",
  defaultReadTargets: [
    "tools/add-on/posthog/README.md",
    "tools/add-on/posthog/mcp.json",
    "tools/add-on/posthog/knowledge/mcp-docs.md",
  ],
  capabilities: [
    "Project-scoped PostHog MCP access",
    "HogQL and saved insight analysis",
    "Dashboards, feature flags, experiments, logs, and docs search",
  ],
  contextHints: [
    "Use projects-get before changing project scope or assuming which project is active.",
    "Only use switch-project when the user explicitly asks to change away from the default project.",
    "Prefer query-run for custom analytics questions and docs-search for PostHog product guidance.",
  ],
  promptHints: [
    "Use feature-specific PostHog tools when they exist; fall back to query-run for custom analysis.",
    "If the exact PostHog MCP tool name is unclear, inspect the tool catalog before invoking a broad workflow.",
  ],
};

const posthogToolModule = defineToolModule({
  installSpec,
  runtimeSpec,
});

export const posthogTool = posthogToolModule;
export const posthogInstallSpec = posthogToolModule.installSpec;
export const posthogRuntimeSpec = posthogToolModule.runtimeSpec;

export default posthogToolModule;
