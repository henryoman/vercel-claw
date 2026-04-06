import type { ShippedToolRuntimeSpec } from "../manifest-types";

export const posthogTool: ShippedToolRuntimeSpec = {
  id: "posthog",
  label: "PostHog",
  runtime: "mcp",
  docsFile: "knowledge/mcp-docs.md",
  description:
    "PostHog MCP access for analytics, dashboards, feature flags, experiments, logs, and docs.",
  mcpServerName: "posthog",
  defaultReadTargets: [
    "tools/posthog/README.md",
    "tools/posthog/mcp.json",
    "tools/posthog/knowledge/mcp-docs.md",
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
