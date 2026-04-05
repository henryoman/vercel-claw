export type ShippedToolKind = "mcp" | "cli" | "package" | "template" | "hybrid";
export type ShippedToolActivationScope = "shared" | "instance" | "both";
export type ShippedToolInstallTarget = "app" | "cli";
export type ShippedToolWorkingDirectory = "workspace" | "app" | "cli";
export type ShippedToolRuntime = "mcp" | "app" | "metadata";

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
  version: string;
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

export interface ShippedToolConnectionSpec {
  transport: "http" | "stdio";
  url?: string;
  command?: string;
  args?: string[];
}

export interface ShippedToolRuntimeSpec {
  id: string;
  label: string;
  runtime: ShippedToolRuntime;
  docsFile: string | null;
  description?: string;
  mcpServerName?: string;
  defaultReadTargets: string[];
  capabilities: string[];
  contextHints: string[];
  promptHints: string[];
  recommendedConnection?: ShippedToolConnectionSpec;
  fallbackConnection?: ShippedToolConnectionSpec;
}
