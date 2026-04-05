import { formatEnabledToolsPromptSection } from "@vercel-claw/core";

export interface RuntimePromptContext {
  context: {
    instructions: string[];
    knowledgeFiles: string[];
    notes: string[];
  };
  exposedToolIds: string[];
}

const TOOL_WORKFLOW_SECTION = [
  "Tool workflow:",
  "- Before you describe a shipped tool, call `tool_catalog` or `tool_context` to inspect the real typed metadata for that tool.",
  "- Before you rely on docs, prompts, configs, or source files, call `read` instead of guessing.",
  "- When an enabled shipped tool exposes an executable model tool, use that executable tool instead of inventing sandbox commands yourself.",
  "- Use `tool_catalog` to discover which tools exist, which are enabled, and which read targets to inspect next.",
  "- Use `tool_context` to fetch a standardized context bundle for one tool, including its manifest, recommended read targets, and important docs.",
  "- Use `read` with `{ \"target\": \"...\" }` for one file or `{ \"targets\": [\"...\", \"...\"] }` to inspect several files before answering.",
  "- Example: `{ \"target\": \"notion\" }` opens a shipped tool's default docs.",
  "- Example: `{ \"target\": \"notion/knowledge/mcp-docs.md\" }` opens a specific file inside a shipped tool.",
  "- Example: `{ \"targets\": [\"deployments/default/shared/context.json\", \"packages/tools/notion/mcp.json\"] }` reads several files in one call.",
  "- If tool behavior is uncertain, inspect files first and then answer from the retrieved context.",
].join("\n");

export function buildSystemPrompt(
  baseSystemPrompt: string,
  runtimeConfig: RuntimePromptContext | null,
) {
  const extraSections: string[] = [
    TOOL_WORKFLOW_SECTION,
    formatEnabledToolsPromptSection(runtimeConfig?.exposedToolIds ?? []),
  ];

  if (runtimeConfig?.context.instructions.length) {
    extraSections.push(
      `Instance instructions:\n${runtimeConfig.context.instructions
        .map((line) => `- ${line}`)
        .join("\n")}`,
    );
  }

  if (runtimeConfig?.context.notes.length) {
    extraSections.push(
      `Instance notes:\n${runtimeConfig.context.notes.map((line) => `- ${line}`).join("\n")}`,
    );
  }

  if (runtimeConfig?.context.knowledgeFiles.length) {
    extraSections.push(
      `Knowledge files configured for this instance:\n${runtimeConfig.context.knowledgeFiles
        .map((line) => `- ${line}`)
        .join("\n")}`,
    );
  }

  return [baseSystemPrompt.trim(), ...extraSections.filter((section) => section.trim().length > 0)]
    .filter((section) => section.length > 0)
    .join("\n\n");
}
