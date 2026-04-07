import "server-only";

import { formatEnabledToolsPromptSection } from "@vercel-claw/core";
import { readFile } from "node:fs/promises";

export interface RuntimePromptContext {
  context: {
    instructions: string[];
    knowledgeFiles: string[];
    notes: string[];
  };
  exposedToolIds: string[];
}

type PromptMode = "default" | "summarize" | "wakeup";
type PromptSectionKey = "system" | PromptMode;

const TOOL_WORKFLOW_SECTION = [
  "Tool workflow:",
  "- Before you describe a shipped tool, call `tool_catalog` or `tool_context` to inspect the real typed metadata for that tool.",
  "- Before you rely on docs, prompts, configs, or source files, call `read` instead of guessing.",
  "- Use `read_past_messages` when you need older thread history that is not included in the current prompt window.",
  "- When an enabled shipped tool exposes an executable model tool, use that executable tool instead of inventing sandbox commands yourself.",
  "- Use `tool_catalog` to discover which tools exist, which are enabled, and which read targets to inspect next.",
  "- Use `tool_context` to fetch a standardized context bundle for one tool, including its manifest, recommended read targets, and important docs.",
  "- Use `read` with `{ \"target\": \"...\" }` for one file or `{ \"targets\": [\"...\", \"...\"] }` to inspect several files before answering.",
  "- Example: `{ \"target\": \"notion\" }` opens a shipped tool's default docs.",
  "- Example: `{ \"target\": \"notion/knowledge/mcp-docs.md\" }` opens a specific file inside a shipped tool.",
  "- Example: `{ \"targets\": [\"deployments/shared/context.json\", \"tools/notion/mcp.json\"] }` reads several files in one call.",
  "- If tool behavior is uncertain, inspect files first and then answer from the retrieved context.",
].join("\n");

const PROMPT_FILES: Record<PromptSectionKey, URL> = {
  system: new URL("./brain/prompts/system.md", import.meta.url),
  default: new URL("./brain/prompts/modes/default.md", import.meta.url),
  summarize: new URL("./brain/prompts/summarize.md", import.meta.url),
  wakeup: new URL("./brain/prompts/wakeup.md", import.meta.url),
};

const promptSectionCache = new Map<PromptSectionKey, Promise<string>>();

export async function buildSystemPrompt(
  baseSystemPrompt: string,
  runtimeConfig: RuntimePromptContext | null,
  mode: PromptMode = "default",
) {
  const promptSections = await loadPromptSections(mode);
  const extraSections = [
    ...promptSections,
    normalizePromptSection(baseSystemPrompt),
    TOOL_WORKFLOW_SECTION,
    formatEnabledToolsPromptSection(runtimeConfig?.exposedToolIds ?? []),
    formatBulletSection("Instance instructions", runtimeConfig?.context.instructions ?? []),
    formatBulletSection("Instance notes", runtimeConfig?.context.notes ?? []),
    formatBulletSection(
      "Knowledge files configured for this instance",
      runtimeConfig?.context.knowledgeFiles ?? [],
    ),
  ];

  return dedupePromptSections(extraSections)
    .filter((section) => section.length > 0)
    .join("\n\n");
}

async function loadPromptSections(mode: PromptMode) {
  const sections = await Promise.all([loadPromptSection("system"), loadPromptSection(mode)]);
  return sections.map((section) => normalizePromptSection(section)).filter((section) => section.length > 0);
}

async function loadPromptSection(key: PromptSectionKey) {
  const cached = promptSectionCache.get(key);
  if (cached) {
    return await cached;
  }

  const pending = readFile(PROMPT_FILES[key], "utf8");
  promptSectionCache.set(key, pending);
  return await pending;
}

function formatBulletSection(title: string, values: string[]) {
  if (values.length === 0) {
    return "";
  }

  return `${title}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

function normalizePromptSection(value: string | null | undefined) {
  return (value ?? "").trim();
}

function dedupePromptSections(values: string[]) {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const trimmed = normalizePromptSection(value);
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    deduped.push(trimmed);
  }

  return deduped;
}
