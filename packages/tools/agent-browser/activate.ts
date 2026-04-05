import type { ShippedToolRuntimeSpec } from "../manifest-types";

export const agentBrowserTool: ShippedToolRuntimeSpec = {
  id: "agent-browser",
  label: "Agent Browser",
  runtime: "app",
  docsFile: "knowledge/about.md",
  description: "Browser automation tool powered by the agent-browser CLI.",
  defaultReadTargets: [
    "packages/tools/agent-browser/README.md",
    "packages/tools/agent-browser/mcp.json",
    "packages/tools/agent-browser/knowledge/about.md",
  ],
  capabilities: [
    "Browser automation and page interaction",
    "Install-time browser engine download",
    "CLI and app-level browser workflows",
  ],
  contextHints: [
    "Read the tool docs before promising browser capabilities or setup steps.",
    "Use the install commands from the manifest when describing local setup.",
  ],
  promptHints: [
    "When browser behavior matters, inspect the tool docs and metadata first.",
    "Do not guess whether the engine is already installed.",
  ],
};
