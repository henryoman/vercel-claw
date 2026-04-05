export const notionTool = {
  id: "notion",
  label: "Notion",
  runtime: "mcp",
  docsFile: "knowledge/mcp-docs.md",
  mcpServerName: "notion",
  recommendedConnection: {
    transport: "http",
    url: "https://mcp.notion.com/mcp",
  },
  fallbackConnection: {
    command: "bunx",
    args: ["mcp-remote", "https://mcp.notion.com/mcp"],
  },
} as const;
