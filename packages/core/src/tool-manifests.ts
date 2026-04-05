import type {
  ShippedToolActivationScope,
  ShippedToolCommandSpec,
  ShippedToolInstallSpec,
  ShippedToolKind,
  ShippedToolPackageDependency,
} from "../../tools/manifest-types";
import { agentBrowserInstallSpec } from "../../tools/agent-browser/install";
import { notionInstallSpec } from "../../tools/notion/install";

export const TOOL_CACHE_DIR = ".vercel-claw-cache/tools";

export const toolKinds = ["mcp", "cli", "package", "template", "hybrid"] as const;
export type ToolKind = ShippedToolKind;

export const toolInstallTargets = ["app", "cli"] as const;
export type ToolInstallTarget = ShippedToolPackageDependency["target"];

export const toolWorkingDirectories = ["workspace", "app", "cli"] as const;
export type ToolWorkingDirectory = ShippedToolCommandSpec["cwd"];

export const toolActivationScopes = ["shared", "instance", "both"] as const;
export type ToolActivationScope = ShippedToolActivationScope;

export interface ToolPackageDependency extends ShippedToolPackageDependency {}

export interface ToolCommandSpec extends ShippedToolCommandSpec {}

export interface ToolManifest {
  id: string;
  label: string;
  description: string;
  kind: ToolKind;
  shippedToolDir: string;
  activationScope: ToolActivationScope;
  dependencies: ToolPackageDependency[];
  installCommands: ToolCommandSpec[];
  verifyCommands: ToolCommandSpec[];
  requiredEnvVars: string[];
  optionalEnvVars: string[];
  cacheSubdir: string;
}

function withShippedDir(tool: ShippedToolInstallSpec): ToolManifest {
  return {
    ...tool,
    shippedToolDir: `packages/tools/${tool.id}`,
  };
}

export const toolCatalog: ToolManifest[] = [notionInstallSpec, agentBrowserInstallSpec].map(
  withShippedDir,
);

export function listToolManifests() {
  return toolCatalog;
}

export function getToolManifest(toolId: string) {
  return toolCatalog.find((tool) => tool.id === toolId) ?? null;
}
