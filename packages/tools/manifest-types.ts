export type ShippedToolKind = "mcp" | "cli" | "package" | "template" | "hybrid";
export type ShippedToolActivationScope = "shared" | "instance" | "both";
export type ShippedToolInstallTarget = "app" | "cli";
export type ShippedToolWorkingDirectory = "workspace" | "app" | "cli";

export interface ShippedToolPackageDependency {
  target: ShippedToolInstallTarget;
  packages: string[];
}

export interface ShippedToolCommandSpec {
  label: string;
  command: string[];
  cwd: ShippedToolWorkingDirectory;
}

export interface ShippedToolInstallSpec {
  id: string;
  label: string;
  description: string;
  kind: ShippedToolKind;
  activationScope: ShippedToolActivationScope;
  dependencies: ShippedToolPackageDependency[];
  installCommands: ShippedToolCommandSpec[];
  verifyCommands: ShippedToolCommandSpec[];
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  cacheSubdir: string;
}
