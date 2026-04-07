import { shippedToolModules } from "../../../../tools";
import type { ToolModule } from "../../../../tools/manifest-types";
import type { ToolSourceManifest } from "./tool-registry";

export const TOOL_CACHE_DIR = ".vercel-claw-cache/tools";

function createToolManifest(toolModule: ToolModule): ToolSourceManifest {
  const install = toolModule.installSpec;
  if (!install) {
    throw new Error(`Cannot create a shipped manifest for ${toolModule.runtimeSpec.id} without install metadata.`);
  }

  const runtime = toolModule.runtimeSpec;
  return {
    ...install,
    ...runtime,
    shippedToolDir: `tools/${install.id}`,
  };
}

export const toolCatalog: ToolSourceManifest[] = [
  ...shippedToolModules.map((toolModule) => createToolManifest(toolModule)),
];

export function listToolManifests() {
  return toolCatalog;
}

export function getToolManifest(toolId: string) {
  return toolCatalog.find((tool) => tool.id === toolId) ?? null;
}
