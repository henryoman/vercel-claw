export interface GeneratedToolArgumentSchema {
  description: string;
  key: string;
  required: boolean;
  type: "boolean" | "number" | "string";
}

export interface GeneratedToolOperationSchema {
  arguments: GeneratedToolArgumentSchema[];
  description: string;
  id: string;
  label: string;
}

export interface ToolManifestLike {
  activationScope: "both" | "instance" | "shared";
  capabilities: readonly string[];
  contextHints: readonly string[];
  defaultReadTargets: readonly string[];
  description: string;
  docsFile: string | null;
  execution?: {
    description: string;
    operations: ReadonlyArray<{
      arguments: ReadonlyArray<{
        description: string;
        key: string;
        required: boolean;
        type: "boolean" | "number" | "string";
      }>;
      description: string;
      id: string;
      label: string;
    }>;
    runner: "browser" | "cli" | "http-mcp" | "shell" | "stdio-mcp";
    sandbox: "never" | "preferred" | "required";
    supportsBackground: boolean;
    workingDirectory: "instance" | "thread";
  };
  fallbackConnection?: {
    transport: "http" | "stdio";
  };
  id: string;
  kind: "cli" | "hybrid" | "mcp" | "package" | "template";
  label: string;
  mcpServerName?: string;
  promptHints: readonly string[];
  recommendedConnection?: {
    transport: "http" | "stdio";
  };
  runtime: "app" | "mcp" | "metadata";
}

export interface GeneratedToolSchema {
  activationScope: ToolManifestLike["activationScope"];
  capabilities: string[];
  connection: {
    fallbackTransport: "http" | "stdio" | null;
    mcpServerName: string | null;
    recommendedTransport: "http" | "stdio" | null;
  };
  contextHints: string[];
  defaultReadTargets: string[];
  description: string;
  docsFile: string | null;
  execution: {
    description: string;
    operations: GeneratedToolOperationSchema[];
    runner: "browser" | "cli" | "http-mcp" | "shell" | "stdio-mcp" | null;
    sandbox: "never" | "preferred" | "required" | null;
    supportsBackground: boolean;
    workingDirectory: "instance" | "thread" | null;
  } | null;
  id: string;
  kind: ToolManifestLike["kind"];
  label: string;
  promptHints: string[];
  runtime: ToolManifestLike["runtime"];
}

export function generateToolSchema(tool: ToolManifestLike): GeneratedToolSchema {
  return {
    activationScope: tool.activationScope,
    capabilities: [...tool.capabilities],
    connection: {
      fallbackTransport: tool.fallbackConnection?.transport ?? null,
      mcpServerName: tool.mcpServerName ?? null,
      recommendedTransport: tool.recommendedConnection?.transport ?? null,
    },
    contextHints: [...tool.contextHints],
    defaultReadTargets: [...tool.defaultReadTargets],
    description: tool.description,
    docsFile: tool.docsFile,
    execution: tool.execution
      ? {
          description: tool.execution.description,
          operations: tool.execution.operations.map((operation) => ({
            arguments: operation.arguments.map((argument) => ({
              description: argument.description,
              key: argument.key,
              required: argument.required,
              type: argument.type,
            })),
            description: operation.description,
            id: operation.id,
            label: operation.label,
          })),
          runner: tool.execution.runner,
          sandbox: tool.execution.sandbox,
          supportsBackground: tool.execution.supportsBackground,
          workingDirectory: tool.execution.workingDirectory,
        }
      : null,
    id: tool.id,
    kind: tool.kind,
    label: tool.label,
    promptHints: [...tool.promptHints],
    runtime: tool.runtime,
  };
}

export function generateToolSchemas(tools: readonly ToolManifestLike[]) {
  return tools.map((tool) => generateToolSchema(tool));
}

export function stringifyToolSchema(tool: ToolManifestLike, space = 2) {
  return JSON.stringify(generateToolSchema(tool), null, clampJsonSpace(space));
}

export function formatToolSchemasForPrompt(tools: readonly ToolManifestLike[]) {
  if (tools.length === 0) {
    return null;
  }

  return tools
    .map((tool) => [`Tool schema: ${tool.label} (${tool.id})`, stringifyToolSchema(tool)].join("\n"))
    .join("\n\n");
}

function clampJsonSpace(value: number) {
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.max(0, Math.min(8, Math.trunc(value)));
}
