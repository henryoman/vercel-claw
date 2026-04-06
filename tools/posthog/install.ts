import type { ShippedToolInstallSpec } from "../manifest-types";

export const posthogInstallSpec: ShippedToolInstallSpec = {
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
