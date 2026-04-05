export const agentBrowserTool = {
  id: "agent-browser",
  label: "Agent Browser",
  runtime: "app",
  installCommands: [
    ["bun", "add", "agent-browser"],
    ["bunx", "agent-browser", "install"],
  ],
  verifyCommands: [["bunx", "agent-browser", "--version"]],
} as const;
