import { agentBrowserTool } from "../../../../tools/agent-browser/activate";
import { agentBrowserInstallSpec } from "../../../../tools/agent-browser/install";
import type { ShippedToolInstallSpec } from "../../../../tools/manifest-types";
import { notionTool } from "../../../../tools/notion/activate";
import { notionInstallSpec } from "../../../../tools/notion/install";
import { weatherTool } from "../../../../tools/weather/activate";
import { weatherInstallSpec } from "../../../../tools/weather/install";
import type { ToolSourceManifest } from "./tool-registry";

export const TOOL_CACHE_DIR = ".vercel-claw-cache/tools";

type ToolRuntimeSource = Pick<
  ToolSourceManifest,
  | "runtime"
  | "docsFile"
  | "mcpServerName"
  | "defaultReadTargets"
  | "capabilities"
  | "contextHints"
  | "promptHints"
  | "recommendedConnection"
  | "fallbackConnection"
>;

function createToolManifest(
  install: ShippedToolInstallSpec,
  runtime: ToolRuntimeSource,
): ToolSourceManifest {
  return {
    ...install,
    ...runtime,
    shippedToolDir: `tools/${install.id}`,
  };
}

export const toolCatalog: ToolSourceManifest[] = [
  createToolManifest(notionInstallSpec, notionTool),
  createToolManifest(agentBrowserInstallSpec, agentBrowserTool),
  createToolManifest(weatherInstallSpec, weatherTool),
];

export function listToolManifests() {
  return toolCatalog;
}

export function getToolManifest(toolId: string) {
  return toolCatalog.find((tool) => tool.id === toolId) ?? null;
}
