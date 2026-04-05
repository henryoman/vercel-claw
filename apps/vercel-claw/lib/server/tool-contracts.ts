import { z } from "zod";

export const toolExecutionArgumentSchema = z
  .object({
    key: z.string().min(1),
    type: z.enum(["string", "number", "boolean"]),
    description: z.string(),
    required: z.boolean(),
  })
  .strict();

export const toolExecutionOperationSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string(),
    arguments: z.array(toolExecutionArgumentSchema),
  })
  .strict();

export const toolExecutionSchema = z
  .object({
    runner: z.enum(["browser", "shell", "cli", "stdio-mcp", "http-mcp"]),
    sandbox: z.enum(["required", "preferred", "never"]),
    workingDirectory: z.enum(["instance", "thread"]),
    description: z.string(),
    supportsBackground: z.boolean(),
    operations: z.array(toolExecutionOperationSchema),
  })
  .strict();

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
    execution: toolExecutionSchema.nullable(),
    enabled: z.boolean(),
  })
  .strict();

export const toolCatalogResultSchema = z
  .object({
    kind: z.literal("tool-catalog"),
    tools: z.array(toolCatalogItemSchema),
  })
  .strict();

export const toolContextIndexSchema = z
  .object({
    summary: z.string(),
    startHere: z.array(z.string().min(1)),
    importantFiles: z
      .object({
        docs: z.array(z.string().min(1)),
        config: z.array(z.string().min(1)),
        knowledge: z.array(z.string().min(1)),
        skills: z.array(z.string().min(1)),
        other: z.array(z.string().min(1)),
      })
      .strict(),
    connection: z
      .object({
        runtime: z.enum(["mcp", "app", "metadata"]),
        mcpServerName: z.string().nullable(),
        recommendedTransport: z.enum(["http", "stdio"]).nullable(),
        fallbackTransport: z.enum(["http", "stdio"]).nullable(),
      })
      .strict(),
    execution: z
      .object({
        runner: z.enum(["browser", "shell", "cli", "stdio-mcp", "http-mcp"]),
        sandbox: z.enum(["required", "preferred", "never"]),
        workingDirectory: z.enum(["instance", "thread"]),
        supportsBackground: z.boolean(),
        operations: z.array(z.string().min(1)),
      })
      .nullable(),
    capabilities: z.array(z.string()),
  })
  .strict();

export const toolContextResultSchema = z
  .object({
    kind: z.literal("tool-context"),
    tool: toolCatalogItemSchema,
    index: toolContextIndexSchema,
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
export type ToolContextIndex = z.infer<typeof toolContextIndexSchema>;
export type ToolContextResult = z.infer<typeof toolContextResultSchema>;

export const executableToolResultSchema = z
  .object({
    kind: z.literal("tool-execution"),
    toolId: z.string().min(1),
    operation: z.string().min(1),
    runId: z.string().min(1),
    sandboxName: z.string(),
    workingDirectory: z.string().min(1),
    status: z.enum(["running", "completed", "failed"]),
    commandId: z.string().nullable(),
    exitCode: z.number().int().nullable(),
    stdout: z.string(),
    stderr: z.string(),
    summary: z.string(),
    data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    artifactIds: z
      .object({
        stdout: z.string().nullable(),
        stderr: z.string().nullable(),
        result: z.string().nullable(),
      })
      .strict(),
  })
  .strict();

export type ExecutableToolResult = z.infer<typeof executableToolResultSchema>;
