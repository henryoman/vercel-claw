import {
  CLAW_CONFIG_FILE,
  getToolManifest,
  listToolManifests,
  type ToolSourceManifest,
} from "@vercel-claw/core";
import { tool } from "ai";
import { Buffer, isUtf8 } from "node:buffer";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { z } from "zod";
import {
  batchReadResultSchema,
  directoryReadResultSchema,
  fileReadResultSchema,
  readToolResultSchema,
  singleReadResultSchema,
  toolCatalogResultSchema,
  toolContextResultSchema,
} from "./tool-contracts";

const DEFAULT_LINE_WINDOW = 220;
const MAX_LINE_WINDOW = 400;
const DIRECTORY_LIST_LIMIT = 50;
const MAX_BATCH_TARGETS = 6;
const TOOL_DOC_CANDIDATES = [
  "knowledge/mcp-docs.md",
  "knowledge/README.md",
  "knowledge/about.md",
  "README.md",
  "mcp.json",
] as const;

const readInputSchema = z
  .object({
    target: z.string().trim().min(1).optional(),
    targets: z.array(z.string().trim().min(1)).max(MAX_BATCH_TARGETS).optional(),
    toolId: z.string().trim().min(1).optional(),
    path: z.string().trim().min(1).optional(),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.target || value.targets?.length || value.toolId || value.path), {
    message: "Provide target, targets, toolId, or path.",
  });

type ReadInput = z.infer<typeof readInputSchema>;

const toolCatalogInputSchema = z
  .object({
    includeDisabled: z.boolean().default(false),
  })
  .strict();

const toolContextInputSchema = z
  .object({
    toolId: z.string().trim().min(1),
    targets: z.array(z.string().trim().min(1)).max(MAX_BATCH_TARGETS).optional(),
    includeDocs: z.boolean().default(true),
    includeReadme: z.boolean().default(true),
    includeMcp: z.boolean().default(true),
    includeKnowledge: z.boolean().default(true),
    includeSkills: z.boolean().default(false),
    maxDocuments: z.number().int().min(1).max(MAX_BATCH_TARGETS).default(4),
    startLine: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
  })
  .strict();

const workspaceRoot = resolveWorkspaceRoot(process.cwd());

export function createAgentTools(options: {
  exposedToolIds?: string[];
  knowledgeFiles?: string[];
} = {}) {
  const exposedToolIds = options.exposedToolIds ?? [];
  const knowledgeFiles = options.knowledgeFiles ?? [];

  return {
    tool_catalog: tool({
      description: buildToolCatalogDescription(exposedToolIds),
      inputSchema: toolCatalogInputSchema,
      outputSchema: toolCatalogResultSchema,
      execute: async (input) => {
        return toolCatalogResultSchema.parse({
          kind: "tool-catalog",
          tools: buildToolCatalogItems(exposedToolIds, input.includeDisabled),
        });
      },
    }),
    tool_context: tool({
      description: buildToolContextDescription(),
      inputSchema: toolContextInputSchema,
      outputSchema: toolContextResultSchema,
      execute: async (input) => {
        const manifest = getRequiredToolManifest(input.toolId);
        const toolItem = toToolCatalogItem(manifest, exposedToolIds);
        const requestedTargets = resolveToolContextTargets(manifest, input);
        const documentTargets = requestedTargets.slice(0, input.maxDocuments);
        const documents = [];

        for (const target of documentTargets) {
          const resolvedPath = await resolveTargetValue(target);
          const fileStat = await stat(resolvedPath);
          if (fileStat.isDirectory()) {
            continue;
          }

          documents.push(await readTextFile(resolvedPath, input.startLine, input.endLine));
        }

        return toolContextResultSchema.parse({
          kind: "tool-context",
          tool: toolItem,
          suggestedReadTargets: requestedTargets,
          guidance: Array.from(
            new Set([
              ...toolItem.contextHints,
              ...toolItem.promptHints,
              `Use read with one of the suggested targets when you need more detail than this context bundle includes.`,
            ]),
          ),
          documents,
        });
      },
    }),
    read: tool({
      description: buildReadDescription(exposedToolIds, knowledgeFiles),
      inputSchema: readInputSchema,
      outputSchema: readToolResultSchema,
      execute: async (input) => {
        const requestedTargets = normalizeReadTargets(input);
        if (requestedTargets.length > 1) {
          const items = [];
          for (const target of requestedTargets) {
            items.push(await readSingleTarget(target, input.startLine, input.endLine));
          }

          return batchReadResultSchema.parse({
            kind: "batch",
            totalItems: items.length,
            items,
          });
        }

        return singleReadResultSchema.parse(
          await readSingleTarget(requestedTargets[0] ?? "", input.startLine, input.endLine),
        );
      },
    }),
  };
}

function buildToolCatalogDescription(exposedToolIds: string[]) {
  const parts = [
    "Return the shipped tool catalog as standardized JSON before you decide which tool docs to inspect.",
    "Use this first when you need to know which tools exist, which are enabled, and which files to read next.",
  ];

  if (exposedToolIds.length > 0) {
    parts.push(`Current exposed tool ids: ${exposedToolIds.join(", ")}.`);
  }

  return parts.join(" ");
}

function buildToolContextDescription() {
  return [
    "Build a standardized context bundle for one shipped tool before you explain or rely on that tool.",
    "Use this when you need the tool manifest, recommended read targets, docs, MCP metadata, or knowledge files.",
    "Pass a toolId and optionally custom targets to include more exact files.",
  ].join(" ");
}

function buildReadDescription(exposedToolIds: string[], knowledgeFiles: string[]) {
  const parts = [
    "Read repo docs, prompts, configs, or source files before answering instead of guessing.",
    "Use tool_catalog first to discover tools and tool_context to build a bundled context pack for one tool.",
    "Pass { target } for one file or { targets: [...] } to read several files or directories in one call.",
    "Use target='notion' to open a shipped tool's default docs.",
    "Use target='notion/knowledge/mcp-docs.md' for files inside a shipped tool folder.",
    "Use target='deployments/default/shared/context.json' for a repo-relative file or directory listing.",
    "Use startLine and endLine for a specific range.",
  ];

  if (knowledgeFiles.length > 0) {
    parts.push(`Configured knowledge files include: ${knowledgeFiles.join(", ")}.`);
  }

  if (exposedToolIds.length > 0) {
    parts.push(`Current exposed tool ids: ${exposedToolIds.join(", ")}.`);
  }

  return parts.join(" ");
}

function buildToolCatalogItems(exposedToolIds: string[], includeDisabled: boolean) {
  const items = listToolManifests().map((tool) => toToolCatalogItem(tool, exposedToolIds));

  if (includeDisabled || exposedToolIds.length === 0) {
    return items;
  }

  return items.filter((tool) => tool.enabled);
}

function toToolCatalogItem(tool: ToolSourceManifest, exposedToolIds: string[]) {
  const enabled = exposedToolIds.length === 0 || exposedToolIds.includes(tool.id);

  return {
    id: tool.id,
    label: tool.label,
    description: tool.description,
    kind: tool.kind,
    runtime: tool.runtime,
    activationScope: tool.activationScope,
    docsFile: tool.docsFile,
    mcpServerName: tool.mcpServerName,
    defaultReadTargets: tool.defaultReadTargets,
    capabilities: tool.capabilities,
    contextHints: tool.contextHints,
    promptHints: tool.promptHints,
    enabled,
  };
}

async function readSingleTarget(target: string, startLine?: number, endLine?: number) {
  const resolvedPath = await resolveTargetValue(target);
  const fileStat = await stat(resolvedPath);

  if (fileStat.isDirectory()) {
    return await readDirectory(resolvedPath);
  }

  return await readTextFile(resolvedPath, startLine, endLine);
}

function normalizeReadTargets(input: ReadInput) {
  if (input.targets?.length) {
    return input.targets.map((target) => normalizeSingleTarget(target));
  }

  const singleTarget = normalizeTarget(input);
  if (singleTarget) {
    return [singleTarget];
  }

  if (input.path) {
    if (input.toolId && !input.path.startsWith("packages/tools/")) {
      return [`packages/tools/${input.toolId}/${trimLeadingSlashes(input.path)}`];
    }

    return [trimLeadingSlashes(input.path)];
  }

  if (!input.toolId) {
    throw new Error("read requires target, targets, path, or toolId.");
  }

  return [`tool:${input.toolId}`];
}

async function resolveReadPath(input: ReadInput) {
  const target = normalizeTarget(input);

  if (target) {
    return await resolveTargetValue(target);
  }

  if (input.path) {
    if (input.toolId && !input.path.startsWith("packages/tools/")) {
      return resolveToolScopedPath(input.toolId, input.path);
    }

    return resolveWorkspacePath(input.path);
  }

  if (!input.toolId) {
    throw new Error("read requires target, path, or toolId.");
  }

  return await resolveDefaultToolDocPath(input.toolId);
}

function resolveToolContextTargets(
  tool: ToolSourceManifest,
  input: z.infer<typeof toolContextInputSchema>,
) {
  const defaults = tool.defaultReadTargets.filter((target) => {
    if (!input.includeReadme && target.endsWith("/README.md")) {
      return false;
    }
    if (!input.includeMcp && target.endsWith("/mcp.json")) {
      return false;
    }
    if (!input.includeKnowledge && target.includes("/knowledge/")) {
      return false;
    }
    if (!input.includeSkills && target.includes("/skills/")) {
      return false;
    }
    if (!input.includeDocs && tool.docsFile && target.endsWith(`/${tool.docsFile}`)) {
      return false;
    }
    return true;
  });

  const customTargets =
    input.targets?.map((target) => {
      if (target.startsWith("packages/tools/") || target.startsWith("tool:")) {
        return normalizeSingleTarget(target);
      }

      return `packages/tools/${tool.id}/${trimLeadingSlashes(target)}`;
    }) ?? [];

  return Array.from(new Set([...defaults, ...customTargets]));
}

function normalizeTarget(input: ReadInput) {
  if (!input.target) {
    return null;
  }

  const trimmed = input.target.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.startsWith("@/")) {
    return trimmed.slice(2);
  }

  return trimmed;
}

function normalizeSingleTarget(target: string) {
  if (target.startsWith("@/")) {
    return target.slice(2);
  }

  return trimLeadingSlashes(target.trim());
}

async function resolveTargetValue(target: string) {
  if (target.startsWith("tool:")) {
    const toolId = target.slice("tool:".length).trim();
    if (toolId.length === 0) {
      throw new Error("Tool target must include an id, for example tool:notion.");
    }
    return await resolveDefaultToolDocPath(toolId);
  }

  if (!target.includes("/")) {
    const toolRoot = resolve(workspaceRoot, "packages", "tools", target);
    if (existsSync(toolRoot)) {
      return await resolveDefaultToolDocPath(target);
    }
    return resolveWorkspacePath(target);
  }

  if (target.startsWith("packages/tools/")) {
    return resolveWorkspacePath(target);
  }

  const [toolId, ...rest] = target.split("/");
  const toolRoot = toolId ? resolve(workspaceRoot, "packages", "tools", toolId) : null;
  const workspacePath = resolve(workspaceRoot, target);

  if (toolRoot && existsSync(toolRoot) && !existsSync(workspacePath) && rest.length > 0) {
    return resolveToolScopedPath(toolId, rest.join("/"));
  }

  return resolveWorkspacePath(target);
}

function resolveWorkspacePath(inputPath: string) {
  if (isAbsolute(inputPath)) {
    throw new Error("read expects a repo-relative path, not an absolute path.");
  }

  const absolutePath = resolve(workspaceRoot, inputPath);
  const relativePath = toRepoPath(relative(workspaceRoot, absolutePath));

  if (relativePath === ".." || relativePath.startsWith("../")) {
    throw new Error(`Path is outside the workspace: ${inputPath}`);
  }

  if (
    relativePath === ".env" ||
    relativePath.startsWith(".env.") ||
    relativePath.includes("/.env") ||
    relativePath.startsWith(".git/") ||
    relativePath.includes("/.git/") ||
    relativePath.startsWith("node_modules/") ||
    relativePath.includes("/node_modules/") ||
    relativePath.startsWith(".next/") ||
    relativePath.includes("/.next/")
  ) {
    throw new Error(`read cannot open protected path: ${relativePath}`);
  }

  if (!existsSync(absolutePath)) {
    throw new Error(`Path does not exist: ${relativePath}`);
  }

  return absolutePath;
}

function resolveToolScopedPath(toolId: string, inputPath: string) {
  if (isAbsolute(inputPath)) {
    throw new Error("read expects a repo-relative tool path, not an absolute path.");
  }

  const toolRoot = resolveWorkspacePath(`packages/tools/${toolId}`);
  const absolutePath = resolve(toolRoot, inputPath);
  const relativePath = toRepoPath(relative(toolRoot, absolutePath));

  if (relativePath === ".." || relativePath.startsWith("../")) {
    throw new Error(`Path escapes the tool root: ${inputPath}`);
  }

  if (!existsSync(absolutePath)) {
    throw new Error(`Path does not exist in tool ${toolId}: ${inputPath}`);
  }

  return absolutePath;
}

async function resolveDefaultToolDocPath(toolId: string) {
  const toolRoot = resolveWorkspacePath(`packages/tools/${toolId}`);

  for (const candidate of TOOL_DOC_CANDIDATES) {
    const absoluteCandidate = join(toolRoot, candidate);
    if (existsSync(absoluteCandidate)) {
      return absoluteCandidate;
    }
  }

  const knowledgeEntries = await readDirectoryEntries(join(toolRoot, "knowledge"));
  const firstKnowledgeFile = knowledgeEntries.find((entry) => !entry.isDirectory());
  if (firstKnowledgeFile) {
    return join(toolRoot, "knowledge", firstKnowledgeFile.name);
  }

  const skillEntries = await readDirectoryEntries(join(toolRoot, "skills"));
  const firstSkillFile = skillEntries.find((entry) => !entry.isDirectory());
  if (firstSkillFile) {
    return join(toolRoot, "skills", firstSkillFile.name);
  }

  throw new Error(
    `Could not find default docs for tool "${toolId}". Try a repo-relative path like packages/tools/${toolId}/README.md instead.`,
  );
}

async function readTextFile(absolutePath: string, startLine?: number, endLine?: number) {
  const repoPath = toRepoPath(relative(workspaceRoot, absolutePath));
  const bytes = await readFile(absolutePath);

  if (!isUtf8(bytes)) {
    throw new Error(`read only supports UTF-8 text files: ${repoPath}`);
  }

  const text = bytes.toString("utf8");
  if (text.length === 0) {
    return fileReadResultSchema.parse({
      kind: "file" as const,
      path: repoPath,
      startLine: 1,
      endLine: 1,
      totalLines: 0,
      truncated: false,
      content: "File is empty.",
    });
  }

  const lines = text.split(/\r?\n/);
  const totalLines = lines.length;
  const firstLine = Math.min(startLine ?? 1, totalLines);
  const requestedLastLine =
    endLine ?? Math.min(totalLines, firstLine + DEFAULT_LINE_WINDOW - 1);

  if (requestedLastLine < firstLine) {
    throw new Error("endLine must be greater than or equal to startLine.");
  }

  const lastLine = Math.min(
    totalLines,
    Math.min(requestedLastLine, firstLine + MAX_LINE_WINDOW - 1),
  );
  const content = lines
    .slice(firstLine - 1, lastLine)
    .map((line, index) => `${firstLine + index}|${line}`)
    .join("\n");

  return fileReadResultSchema.parse({
    kind: "file" as const,
    path: repoPath,
    startLine: firstLine,
    endLine: lastLine,
    totalLines,
    truncated: lastLine < totalLines,
    content,
  });
}

async function readDirectory(absolutePath: string) {
  const entries = await readDirectoryEntries(absolutePath);
  const repoPath = toRepoPath(relative(workspaceRoot, absolutePath));
  const listedEntries = entries.slice(0, DIRECTORY_LIST_LIMIT).map((entry) => ({
    name: entry.isDirectory() ? `${entry.name}/` : entry.name,
    kind: entry.isDirectory() ? "directory" : "file",
  }));

  return directoryReadResultSchema.parse({
    kind: "directory" as const,
    path: repoPath.length > 0 ? repoPath : ".",
    totalEntries: entries.length,
    truncated: entries.length > DIRECTORY_LIST_LIMIT,
    entries: listedEntries,
  });
}

async function readDirectoryEntries(path: string) {
  if (!existsSync(path)) {
    return [];
  }

  const directoryStat = await stat(path);
  if (!directoryStat.isDirectory()) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function resolveWorkspaceRoot(startDir: string) {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, CLAW_CONFIG_FILE))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

function toRepoPath(path: string) {
  return path.split(sep).join("/");
}

function trimLeadingSlashes(value: string) {
  return value.replace(/^\/+/, "");
}

function getRequiredToolManifest(toolId: string) {
  const tool = getToolManifest(toolId);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  return tool;
}
