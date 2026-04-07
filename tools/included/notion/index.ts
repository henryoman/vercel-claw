import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "notion",
  version: "0.1.0",
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

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "notion",
  label: "Notion",
  runtime: "mcp",
  docsFile: "mcp-docs.md",
  description: "Hosted Notion MCP connection metadata and docs for workspace access.",
  mcpServerName: "notion",
  defaultReadTargets: [
    "tools/included/notion/README.md",
    "tools/included/notion/mcp.json",
    "tools/included/notion/mcp-docs.md",
  ],
  capabilities: [
    "Hosted MCP server metadata",
    "Workspace docs and database context",
    "Connection instructions and fallback transport",
  ],
  contextHints: [
    "Read the MCP docs before telling the model how to connect to Notion.",
    "Use the mcp.json config when the model needs the exact server metadata shape.",
  ],
  promptHints: [
    "Prefer the hosted HTTP MCP connection when describing setup.",
    "If transport setup is unclear, read the tool docs instead of guessing fields.",
  ],
  recommendedConnection: {
    transport: "http",
    url: "https://mcp.notion.com/mcp",
  },
  fallbackConnection: {
    transport: "stdio",
    command: "bunx",
    args: ["mcp-remote", "https://mcp.notion.com/mcp"],
  },
};

const notionToolModule = defineToolModule({
  installSpec,
  runtimeSpec,
});

export const notionTool = notionToolModule;
export const notionInstallSpec = notionToolModule.installSpec;
export const notionRuntimeSpec = notionToolModule.runtimeSpec;

export default notionToolModule;
