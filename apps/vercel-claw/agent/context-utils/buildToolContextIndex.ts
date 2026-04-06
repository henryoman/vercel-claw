import type { ToolSourceManifest } from "@vercel-claw/core";
import type { ToolContextIndex } from "../tool-contracts";

export function buildToolContextIndex(
  manifest: ToolSourceManifest,
  requestedTargets: string[],
): ToolContextIndex {
  const importantFiles = categorizeTargets(manifest, requestedTargets);

  return {
    summary: `Inspect ${manifest.label} (${manifest.id}) metadata and docs before relying on it. ${manifest.description}`.trim(),
    startHere: buildStartHere(importantFiles, requestedTargets),
    importantFiles,
    connection: {
      runtime: manifest.runtime,
      mcpServerName: manifest.mcpServerName ?? null,
      recommendedTransport: manifest.recommendedConnection?.transport ?? null,
      fallbackTransport: manifest.fallbackConnection?.transport ?? null,
    },
    execution: manifest.execution
      ? {
          runner: manifest.execution.runner,
          sandbox: manifest.execution.sandbox,
          workingDirectory: manifest.execution.workingDirectory,
          supportsBackground: manifest.execution.supportsBackground,
          operations: manifest.execution.operations.map((operation) => operation.id),
        }
      : null,
    capabilities: manifest.capabilities,
  };
}

function categorizeTargets(manifest: ToolSourceManifest, requestedTargets: string[]) {
  const docs = new Set<string>();
  const config = new Set<string>();
  const knowledge = new Set<string>();
  const skills = new Set<string>();
  const other = new Set<string>();

  for (const target of requestedTargets) {
    if (isDocsTarget(manifest, target)) {
      docs.add(target);
      continue;
    }

    if (target.endsWith("/mcp.json") || target.endsWith(".config.json")) {
      config.add(target);
      continue;
    }

    if (target.includes("/knowledge/")) {
      knowledge.add(target);
      continue;
    }

    if (target.includes("/skills/")) {
      skills.add(target);
      continue;
    }

    other.add(target);
  }

  return {
    docs: Array.from(docs),
    config: Array.from(config),
    knowledge: Array.from(knowledge),
    skills: Array.from(skills),
    other: Array.from(other),
  };
}

function isDocsTarget(manifest: ToolSourceManifest, target: string) {
  return (
    target.endsWith("/README.md") ||
    target.endsWith("/about.md") ||
    (manifest.docsFile !== null && target.endsWith(`/${manifest.docsFile}`))
  );
}

function buildStartHere(
  importantFiles: ToolContextIndex["importantFiles"],
  requestedTargets: string[],
) {
  const orderedCandidates = [
    ...importantFiles.docs,
    ...importantFiles.config,
    ...importantFiles.knowledge,
    ...importantFiles.skills,
    ...importantFiles.other,
    ...requestedTargets,
  ];

  return Array.from(new Set(orderedCandidates)).slice(0, 4);
}
