import type { ShippedToolInstallSpec } from "../manifest-types";

export const notionInstallSpec: ShippedToolInstallSpec = {
  id: "notion",
  label: "Notion",
  description: "Hosted Notion MCP connection metadata and docs for workspace access.",
  kind: "mcp",
  activationScope: "instance",
  dependencies: [],
  installCommands: [],
  verifyCommands: [],
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "notion",
};
