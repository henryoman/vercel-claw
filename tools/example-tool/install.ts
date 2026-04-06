import type { ShippedToolInstallSpec } from "../manifest-types";

export const exampleToolInstallSpec: ShippedToolInstallSpec = {
  id: "example-tool",
  label: "Example Tool",
  description: "Reference folder showing the required shipped tool contract.",
  kind: "template",
  activationScope: "instance",
  dependencies: [],
  installCommands: [],
  verifyCommands: [],
  requiredEnvVars: [],
  optionalEnvVars: [],
  cacheSubdir: "example-tool",
};
