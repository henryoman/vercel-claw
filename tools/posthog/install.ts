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
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "posthog",
};
