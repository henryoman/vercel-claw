import type { ShippedToolRuntimeSpec } from "../manifest-types";

export const weatherTool: ShippedToolRuntimeSpec = {
  id: "weather",
  label: "Weather",
  runtime: "app",
  docsFile: "README.md",
  description: "Deterministic weather lookup through a fixed Bun wrapper.",
  defaultReadTargets: ["tools/weather/README.md", "tools/weather/run.ts", "tools/weather/wttr.md"],
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
