export type ShippedToolKind = "mcp" | "cli" | "package" | "template" | "hybrid";
export type ShippedToolActivationScope = "shared" | "instance" | "both";
export type ShippedToolInstallTarget = "app" | "cli";
export type ShippedToolWorkingDirectory = "workspace" | "app" | "cli";
export type ShippedToolRuntime = "mcp" | "app" | "metadata";
export type ShippedToolExecutionRunner =
  | "browser"
  | "shell"
  | "cli"
  | "stdio-mcp"
  | "http-mcp";
export type ShippedToolSandboxMode = "required" | "preferred" | "never";
export type ShippedToolExecutionWorkingDirectory = "instance" | "thread";
export type ShippedToolExecutionArgumentType = "string" | "number" | "boolean";

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
  memberToolIds?: string[];
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

export interface ShippedToolExecutionArgumentSpec {
  key: string;
  type: ShippedToolExecutionArgumentType;
  description: string;
  required: boolean;
}

export interface ShippedToolExecutionOperationSpec {
  id: string;
  label: string;
  description: string;
  arguments: ShippedToolExecutionArgumentSpec[];
}

export interface ShippedToolExecutionSpec {
  runner: ShippedToolExecutionRunner;
  sandbox: ShippedToolSandboxMode;
  workingDirectory: ShippedToolExecutionWorkingDirectory;
  description: string;
  supportsBackground: boolean;
  operations: ShippedToolExecutionOperationSpec[];
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
  execution?: ShippedToolExecutionSpec;
}
