import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "agent-browser",
  version: "0.1.0",
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

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "agent-browser",
  label: "Agent Browser",
  runtime: "app",
  docsFile: "knowledge/about.md",
  description: "Browser automation tool powered by the agent-browser CLI.",
  defaultReadTargets: [
    "tools/included/agent-browser/README.md",
    "tools/included/agent-browser/mcp.json",
    "tools/included/agent-browser/knowledge/about.md",
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
  execution: {
    runner: "browser",
    sandbox: "required",
    workingDirectory: "thread",
    description: "Persistent browser automation inside the instance sandbox.",
    supportsBackground: false,
    operations: [
      {
        id: "open",
        label: "Open page",
        description: "Open a URL in the persistent browser session.",
        arguments: [
          {
            key: "url",
            type: "string",
            description: "Absolute URL to open in the browser.",
            required: true,
          },
        ],
      },
      {
        id: "title",
        label: "Read page title",
        description: "Read the title of the currently open page.",
        arguments: [],
      },
      {
        id: "snapshot",
        label: "Accessibility snapshot",
        description: "Capture the current accessibility tree for the open page.",
        arguments: [],
      },
      {
        id: "screenshot",
        label: "Take screenshot",
        description: "Capture a screenshot and save it in the sandbox workspace.",
        arguments: [],
      },
      {
        id: "click",
        label: "Click element",
        description: "Click an element using its agent-browser reference id.",
        arguments: [
          {
            key: "ref",
            type: "string",
            description: "The element reference id, for example @e5.",
            required: true,
          },
        ],
      },
      {
        id: "fill",
        label: "Fill field",
        description: "Fill an input or editable field using its reference id.",
        arguments: [
          {
            key: "ref",
            type: "string",
            description: "The element reference id to fill.",
            required: true,
          },
          {
            key: "value",
            type: "string",
            description: "The text value to enter into the field.",
            required: true,
          },
        ],
      },
      {
        id: "wait",
        label: "Wait for load",
        description: "Wait for the page to settle before the next action.",
        arguments: [
          {
            key: "loadState",
            type: "string",
            description:
              "Load state to wait for, such as load, domcontentloaded, or networkidle.",
            required: false,
          },
        ],
      },
      {
        id: "close",
        label: "Close browser",
        description: "Close the current browser session inside the sandbox.",
        arguments: [],
      },
    ],
  },
};

const agentBrowserToolModule = defineToolModule({
  installSpec,
  runtimeSpec,
});

export const agentBrowserTool = agentBrowserToolModule;
export const agentBrowserInstallSpec = agentBrowserToolModule.installSpec;
export const agentBrowserRuntimeSpec = agentBrowserToolModule.runtimeSpec;

export default agentBrowserToolModule;
