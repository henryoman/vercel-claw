import type {
  ShippedToolActivationScope,
  ShippedToolCommandSpec,
  ShippedToolInstallSpec,
  ShippedToolKind,
  ShippedToolPackageDependency,
  ShippedToolRuntime,
  ShippedToolConnectionSpec,
} from "../../tools/manifest-types";

export const DEFAULT_TOOL_REGISTRY_URL =
  "https://github.com/henryoman/vercel-claw/releases/download/tool-bundles/tool-registry.json";

export const toolArchiveFormats = ["zip"] as const;
export type ToolArchiveFormat = (typeof toolArchiveFormats)[number];

export interface ToolPackageDependency extends ShippedToolPackageDependency {}

export interface ToolCommandSpec extends ShippedToolCommandSpec {}

export interface ToolBundleMetadata {
  rootDirectory: string;
  mcpConfigPath: string | null;
  knowledgeDirectory: string | null;
  skillsDirectory: string | null;
  readmePath: string | null;
}

export interface ToolRegistryAsset {
  url: string;
  sha256: string;
  format: ToolArchiveFormat;
  sizeBytes: number;
}

export interface ToolRuntimeMetadata {
  runtime: ShippedToolRuntime;
  docsFile: string | null;
  mcpServerName?: string;
  defaultReadTargets: string[];
  capabilities: string[];
  contextHints: string[];
  promptHints: string[];
  recommendedConnection?: ShippedToolConnectionSpec;
  fallbackConnection?: ShippedToolConnectionSpec;
}

export interface ToolSourceManifest extends ShippedToolInstallSpec, ToolRuntimeMetadata {
  shippedToolDir: string;
}

export interface ToolRegistryEntry extends ToolRuntimeMetadata {
  id: string;
  version: string;
  label: string;
  description: string;
  kind: ShippedToolKind;
  activationScope: ShippedToolActivationScope;
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  dependencies: ToolPackageDependency[];
  installCommands: ToolCommandSpec[];
  verifyCommands: ToolCommandSpec[];
  bundle: ToolRegistryAsset;
  metadata: ToolBundleMetadata;
}

export interface ToolRegistryManifest {
  version: number;
  generatedAt: string;
  sourceRepo: string;
  tools: ToolRegistryEntry[];
}

export function createEmptyToolRegistry(
  overrides: Partial<Pick<ToolRegistryManifest, "generatedAt" | "sourceRepo">> = {},
): ToolRegistryManifest {
  return {
    version: 1,
    generatedAt: overrides.generatedAt ?? new Date(0).toISOString(),
    sourceRepo: overrides.sourceRepo ?? "https://github.com/henryoman/vercel-claw",
    tools: [],
  };
}
