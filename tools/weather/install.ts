import type { ShippedToolInstallSpec } from "../manifest-types";

export const weatherInstallSpec: ShippedToolInstallSpec = {
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
