import type { ShippedToolInstallSpec } from "../manifest-types";

export const agentBrowserInstallSpec: ShippedToolInstallSpec = {
  id: "agent-browser",
  label: "Agent Browser",
  description: "Browser automation tool powered by the agent-browser CLI.",
  kind: "hybrid",
  activationScope: "instance",
  dependencies: [
    {
      target: "app",
      packages: ["agent-browser"],
    },
  ],
  installCommands: [
    {
      label: "Download browser engine",
      command: ["bunx", "agent-browser", "install"],
      cwd: "app",
    },
  ],
  verifyCommands: [
    {
      label: "Check agent-browser CLI",
      command: ["bunx", "agent-browser", "--version"],
      cwd: "app",
    },
  ],
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "agent-browser",
};
