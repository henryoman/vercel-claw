import {
  defineToolModule,
  type ShippedToolInstallSpec,
  type ShippedToolRuntimeSpec,
} from "../../manifest-types";

const installSpec: ShippedToolInstallSpec = {
  id: "weather",
  version: "0.1.0",
  label: "Weather",
  description: "Deterministic weather lookup through a fixed Bun wrapper.",
  kind: "cli",
  activationScope: "instance",
  dependencies: [],
  installCommands: [],
  verifyCommands: [],
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "weather",
};

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "weather",
  label: "Weather",
  runtime: "app",
  docsFile: "README.md",
  description: "Deterministic weather lookup through a fixed Bun wrapper.",
  defaultReadTargets: [
    "tools/add-on/weather/README.md",
    "tools/add-on/weather/run.ts",
    "tools/add-on/weather/wttr.md",
  ],
  capabilities: [
    "Deterministic weather lookup for an explicit location",
    "Fixed metric JSON output",
    "No direct model access to curl",
  ],
  contextHints: [
    "Use this tool when the user asks for weather at a named location.",
    "Do not ask the model to construct raw curl commands for wttr.in.",
  ],
  promptHints: [
    "Always provide a location string.",
    "Expect normalized JSON instead of free-form terminal weather output.",
  ],
  execution: {
    runner: "cli",
    sandbox: "required",
    workingDirectory: "thread",
    description: "Runs a checked-in Bun wrapper that performs a fixed wttr.in curl request.",
    supportsBackground: false,
    operations: [
      {
        id: "current",
        label: "Current weather",
        description: "Fetch current weather and today's forecast for a specific location.",
        arguments: [
          {
            key: "location",
            type: "string",
            description: "Human-readable location name, for example London or Paris, France.",
            required: true,
          },
        ],
      },
    ],
  },
};

const weatherToolModule = defineToolModule({
  installSpec,
  runtimeSpec,
});

export const weatherTool = weatherToolModule;
export const weatherInstallSpec = weatherToolModule.installSpec;
export const weatherRuntimeSpec = weatherToolModule.runtimeSpec;

export default weatherToolModule;
