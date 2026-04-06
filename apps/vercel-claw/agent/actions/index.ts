import {
  DEFAULT_DEPLOYMENT_ID,
  getToolManifest,
  listToolManifests,
  type RuntimeExecutionConfig,
  type Surface,
  type ToolSourceManifest,
} from "@vercel-claw/core";
import { tool } from "ai";
import { stat } from "node:fs/promises";
import { z } from "zod";
import { buildToolContextIndex } from "../context-utils/buildToolContextIndex";
import {
  toolCatalogResultSchema,
  toolContextResultSchema,
} from "../tool-contracts";
import { createExecutableTools } from "../tool-execution";
import { createPostHogTools } from "./posthog";
import {
  createReadFileTool,
  readTextFile,
  resolveTargetValue,
  resolveToolContextTargets,
} from "./readFile";
import { createReadPastMessagesTool } from "./readPastMessages";

const MAX_BATCH_TARGETS = 6;

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

export function createAgentTools(options: {
  exposedToolIds?: string[];
  knowledgeFiles?: string[];
  deploymentId?: string;
  instanceId?: string;
  threadId?: string;
  surface?: Surface;
  execution?: RuntimeExecutionConfig | null;
} = {}) {
  const exposedToolIds = options.exposedToolIds ?? [];
  const knowledgeFiles = options.knowledgeFiles ?? [];
  const executableTools =
    options.instanceId && options.threadId && options.surface && options.execution
      ? createExecutableTools({
          deploymentId: options.deploymentId ?? DEFAULT_DEPLOYMENT_ID,
          instanceId: options.instanceId,
          threadId: options.threadId,
          surface: options.surface,
          execution: options.execution,
          exposedToolIds,
        })
      : {};

  const helperTools = {
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
          index: buildToolContextIndex(manifest, requestedTargets),
          suggestedReadTargets: requestedTargets,
          guidance: Array.from(
            new Set([
              ...toolItem.contextHints,
              ...toolItem.promptHints,
              "Use read with one of the suggested targets when you need more detail than this context bundle includes.",
            ]),
          ),
          documents,
        });
      },
    }),
    read: createReadFileTool({
      exposedToolIds,
      knowledgeFiles,
    }),
    ...(options.threadId
      ? {
          read_past_messages: createReadPastMessagesTool({
            threadId: options.threadId,
          }),
        }
      : {}),
  };

  return {
    ...helperTools,
    ...createPostHogTools({
      exposedToolIds,
    }),
    ...executableTools,
  };
}

function buildToolCatalogDescription(exposedToolIds: string[]) {
  const parts = [
    "Return the shipped tool catalog as standardized JSON before you decide which tool docs to inspect.",
    "Use this first when you need to know which tools exist, which are enabled, and which files to read next.",
    "Some shipped tools may also expose executable sandbox-backed model tools when they are enabled for the current instance.",
  ];

  if (exposedToolIds.length > 0) {
    parts.push(`Current exposed tool ids: ${exposedToolIds.join(", ")}.`);
  }

  return parts.join(" ");
}

function buildToolContextDescription() {
  return [
    "Build a standardized context bundle for one shipped tool before you explain or rely on that tool.",
    "Use this when you need the tool manifest, compact table of contents, recommended read targets, docs, MCP metadata, or knowledge files.",
    "Pass a toolId and optionally custom targets to include more exact files.",
  ].join(" ");
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
    execution: tool.execution ?? null,
    enabled,
  };
}

function getRequiredToolManifest(toolId: string) {
  const tool = getToolManifest(toolId);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  return tool;
}
