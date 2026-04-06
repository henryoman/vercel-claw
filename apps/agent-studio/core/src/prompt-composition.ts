import { listToolManifests } from "./tool-manifests";
import type { ToolSourceManifest } from "./tool-registry";

export interface ComposeResolvedSystemPromptOptions {
  sharedBasePrompt: string;
  sharedPromptFileContents: string[];
  instanceBasePrompt?: string | null;
  instancePromptFileContents?: string[];
  inheritsShared: boolean;
  defaultSharedPrompt?: string;
}

export function composeResolvedSystemPrompt(
  options: ComposeResolvedSystemPromptOptions,
) {
  const sharedPromptFileContents = normalizePromptSections(options.sharedPromptFileContents);
  const instancePromptFileContents = normalizePromptSections(
    options.instancePromptFileContents ?? [],
  );
  const sharedBasePrompt = normalizePromptSection(options.sharedBasePrompt);
  const instanceBasePrompt = normalizePromptSection(options.instanceBasePrompt ?? null);
  const defaultSharedPrompt = normalizePromptSection(options.defaultSharedPrompt ?? null);

  const includeSharedSections =
    options.inheritsShared ||
    (instancePromptFileContents.length === 0 && instanceBasePrompt.length === 0);
  const sections: string[] = [];

  if (includeSharedSections) {
    sections.push(...sharedPromptFileContents);

    if (
      shouldIncludeSharedBasePrompt(
        sharedBasePrompt,
        sharedPromptFileContents.length > 0,
        defaultSharedPrompt,
      )
    ) {
      sections.push(sharedBasePrompt);
    }
  }

  sections.push(...instancePromptFileContents);

  if (instanceBasePrompt.length > 0) {
    sections.push(instanceBasePrompt);
  }

  const dedupedSections = dedupePromptSections(sections);
  if (dedupedSections.length > 0) {
    return dedupedSections.join("\n\n");
  }

  if (sharedBasePrompt.length > 0) {
    return sharedBasePrompt;
  }

  return defaultSharedPrompt;
}

export function formatEnabledToolsPromptSection(
  exposedToolIds: string[],
  manifests: ToolSourceManifest[] = listToolManifests(),
) {
  if (exposedToolIds.length === 0) {
    return [
      "Enabled shipped tools for this instance:",
      "- None. Only the built-in prompt helper tools are available unless more tools are enabled.",
    ].join("\n");
  }

  const manifestById = new Map(manifests.map((tool) => [tool.id, tool]));
  const toolLines = exposedToolIds
    .map((toolId) => {
      const tool = manifestById.get(toolId);
      if (!tool) {
        return `- ${toolId}: enabled in config, but no shipped manifest metadata was found.`;
      }

      const detailParts = [`runtime ${tool.runtime}`];
      if (tool.mcpServerName) {
        detailParts.push(`MCP ${tool.mcpServerName}`);
      }
      if (tool.execution) {
        detailParts.push(
          `${tool.execution.runner} via ${tool.execution.sandbox === "never" ? "direct app runtime" : "persistent sandbox"}`,
        );
      }

      const capabilitySummary = tool.capabilities
        .slice(0, 3)
        .map((capability) => capability.trim())
        .filter((capability) => capability.length > 0)
        .join("; ");

      let line = `- ${tool.id} (${tool.label}): ${tool.description}`;
      if (detailParts.length > 0) {
        line += ` ${detailParts.join(", ")}.`;
      }
      if (capabilitySummary.length > 0) {
        line += ` Capabilities: ${capabilitySummary}.`;
      }
      return line;
    })
    .filter((line) => line.length > 0);

  return ["Enabled shipped tools for this instance:", ...toolLines].join("\n");
}

function normalizePromptSections(values: string[]) {
  return values
    .map((value) => normalizePromptSection(value))
    .filter((value) => value.length > 0);
}

function normalizePromptSection(value: string | null) {
  return (value ?? "").trim();
}

function shouldIncludeSharedBasePrompt(
  sharedBasePrompt: string,
  hasSharedPromptFiles: boolean,
  defaultSharedPrompt: string,
) {
  if (sharedBasePrompt.length === 0) {
    return false;
  }

  if (!hasSharedPromptFiles) {
    return true;
  }

  return sharedBasePrompt !== defaultSharedPrompt;
}

function dedupePromptSections(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    deduped.push(value);
  }

  return deduped;
}
