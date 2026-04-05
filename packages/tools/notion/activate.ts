import type { ShippedToolRuntimeSpec } from "../manifest-types";

export const notionTool: ShippedToolRuntimeSpec = {
  id: "notion",
  label: "Notion",
  runtime: "mcp",
  docsFile: "knowledge/mcp-docs.md",
  description: "Hosted Notion MCP connection metadata and docs for workspace access.",
  mcpServerName: "notion",
  defaultReadTargets: [
    "packages/tools/notion/README.md",
    "packages/tools/notion/mcp.json",
    "packages/tools/notion/knowledge/mcp-docs.md",
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
