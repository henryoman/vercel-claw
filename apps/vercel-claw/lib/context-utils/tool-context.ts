import type { ToolSourceManifest } from "@vercel-claw/core";

export interface ToolContextIndex {
  summary: string;
  startHere: string[];
  importantFiles: {
    docs: string[];
    config: string[];
    knowledge: string[];
    skills: string[];
    other: string[];
  };
  connection: {
    runtime: ToolSourceManifest["runtime"];
    mcpServerName: string | null;
    recommendedTransport: "http" | "stdio" | null;
    fallbackTransport: "http" | "stdio" | null;
  };
    execution: {
      runner: "browser" | "shell" | "cli" | "stdio-mcp" | "http-mcp";
      sandbox: "required" | "preferred" | "never";
      workingDirectory: "instance" | "thread";
      supportsBackground: boolean;
      operations: string[];
    } | null;
  capabilities: string[];
}

export function buildToolContextIndex(
  tool: ToolSourceManifest,
  suggestedReadTargets: string[],
): ToolContextIndex {
  const importantFiles = categorizeTargets(tool, suggestedReadTargets);

  return {
    summary: tool.description,
    startHere: buildStartHere(tool, importantFiles),
    importantFiles,
    connection: {
      runtime: tool.runtime,
      mcpServerName: tool.mcpServerName ?? null,
      recommendedTransport: tool.recommendedConnection?.transport ?? null,
      fallbackTransport: tool.fallbackConnection?.transport ?? null,
    },
    execution: tool.execution
      ? {
          runner: tool.execution.runner,
          sandbox: tool.execution.sandbox,
          workingDirectory: tool.execution.workingDirectory,
          supportsBackground: tool.execution.supportsBackground,
          operations: tool.execution.operations.map((operation) => operation.id),
        }
      : null,
    capabilities: tool.capabilities,
  };
}

function buildStartHere(
  tool: ToolSourceManifest,
  importantFiles: ToolContextIndex["importantFiles"],
) {
  const docsFilePath = tool.docsFile ? `${tool.shippedToolDir}/${tool.docsFile}` : null;
  const orderedCandidates = [
    docsFilePath,
    `${tool.shippedToolDir}/README.md`,
    `${tool.shippedToolDir}/mcp.json`,
    importantFiles.knowledge[0] ?? null,
    importantFiles.skills[0] ?? null,
  ].filter((value): value is string => Boolean(value));

  return unique(orderedCandidates).slice(0, 4);
}

function categorizeTargets(tool: ToolSourceManifest, suggestedReadTargets: string[]) {
  const groups: ToolContextIndex["importantFiles"] = {
    docs: [],
    config: [],
    knowledge: [],
    skills: [],
    other: [],
  };

  const docsFilePath = tool.docsFile ? `${tool.shippedToolDir}/${tool.docsFile}` : null;

  for (const target of unique(suggestedReadTargets)) {
    if (target.includes("/knowledge/")) {
      groups.knowledge.push(target);
      continue;
    }

    if (target.includes("/skills/")) {
      groups.skills.push(target);
      continue;
    }

    if (target === docsFilePath || target.endsWith("/README.md")) {
      groups.docs.push(target);
      continue;
    }

    if (target.endsWith("/mcp.json")) {
      groups.config.push(target);
      continue;
    }

    groups.other.push(target);
  }

  return groups;
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0))),
  );
}
