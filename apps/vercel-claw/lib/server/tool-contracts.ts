import { z } from "zod";

export const fileReadResultSchema = z
  .object({
    kind: z.literal("file"),
    path: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    totalLines: z.number().int().nonnegative(),
    truncated: z.boolean(),
    content: z.string(),
  })
  .strict();

export const directoryReadEntrySchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["file", "directory"]),
  })
  .strict();

export const directoryReadResultSchema = z
  .object({
    kind: z.literal("directory"),
    path: z.string().min(1),
    totalEntries: z.number().int().nonnegative(),
    truncated: z.boolean(),
    entries: z.array(directoryReadEntrySchema),
  })
  .strict();

export const singleReadResultSchema = z.discriminatedUnion("kind", [
  fileReadResultSchema,
  directoryReadResultSchema,
]);

export const batchReadResultSchema = z
  .object({
    kind: z.literal("batch"),
    totalItems: z.number().int().nonnegative(),
    items: z.array(singleReadResultSchema),
  })
  .strict();

export const readToolResultSchema = z.discriminatedUnion("kind", [
  fileReadResultSchema,
  directoryReadResultSchema,
  batchReadResultSchema,
]);

export const toolCatalogItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string(),
    kind: z.enum(["mcp", "cli", "package", "template", "hybrid"]),
    runtime: z.enum(["mcp", "app", "metadata"]),
    activationScope: z.enum(["shared", "instance", "both"]),
    docsFile: z.string().nullable(),
    mcpServerName: z.string().optional(),
    defaultReadTargets: z.array(z.string().min(1)),
    capabilities: z.array(z.string()),
    contextHints: z.array(z.string()),
    promptHints: z.array(z.string()),
    enabled: z.boolean(),
  })
  .strict();

export const toolCatalogResultSchema = z
  .object({
    kind: z.literal("tool-catalog"),
    tools: z.array(toolCatalogItemSchema),
  })
  .strict();

export const toolContextResultSchema = z
  .object({
    kind: z.literal("tool-context"),
    tool: toolCatalogItemSchema,
    suggestedReadTargets: z.array(z.string().min(1)),
    guidance: z.array(z.string()),
    documents: z.array(fileReadResultSchema),
  })
  .strict();

export type FileReadResult = z.infer<typeof fileReadResultSchema>;
export type DirectoryReadResult = z.infer<typeof directoryReadResultSchema>;
export type SingleReadResult = z.infer<typeof singleReadResultSchema>;
export type BatchReadResult = z.infer<typeof batchReadResultSchema>;
export type ReadToolResult = z.infer<typeof readToolResultSchema>;
export type ToolCatalogItem = z.infer<typeof toolCatalogItemSchema>;
export type ToolCatalogResult = z.infer<typeof toolCatalogResultSchema>;
export type ToolContextResult = z.infer<typeof toolContextResultSchema>;
