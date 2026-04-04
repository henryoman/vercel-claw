import { spawn } from "bun";

export function activateAgentBrowser() {
  spawn(["bun", "add", "agent-browser"]);
}

activateAgentBrowser();