#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createEmptyToolRegistry,
  listToolManifests,
  type ToolRegistryEntry,
  type ToolSourceManifest,
} from "@vercel-claw/core";
import { zipSync } from "fflate";

const workspaceRoot = resolve(import.meta.dir, "../../../..");
const args = parseArgs(Bun.argv.slice(2));
const outputDir = resolve(workspaceRoot, args.outputDir ?? ".dist/tool-bundles");
const registryPath = resolve(workspaceRoot, args.registryPath ?? "tools/tool-registry.json");
const sourceRepo = args.sourceRepo ?? "https://github.com/henryoman/vercel-claw";
const assetBaseUrl = args.assetBaseUrl ?? pathToFileURL(outputDir).toString();

await mkdir(outputDir, { recursive: true });

const registry = createEmptyToolRegistry({
  generatedAt: new Date().toISOString(),
  sourceRepo,
});

for (const tool of listToolManifests()) {
  const entry = await buildRegistryEntry(tool);
  registry.tools.push(entry);
  console.log(`Packed ${tool.id}@${tool.version}`);
}

await Bun.write(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Wrote registry to ${relative(workspaceRoot, registryPath)}`);

async function buildRegistryEntry(tool: ToolSourceManifest): Promise<ToolRegistryEntry> {
  const sourceDir = resolve(workspaceRoot, tool.shippedToolDir);
  const archiveName = `${tool.id}-${tool.version}.zip`;
  const archivePath = join(outputDir, archiveName);
  const archiveEntries = await collectArchiveEntries(sourceDir, tool.id);
  const archiveBytes = zipSync(archiveEntries, { level: 9 });

  await Bun.write(archivePath, archiveBytes);

  return {
    id: tool.id,
    version: tool.version,
    label: tool.label,
    description: tool.description,
    kind: tool.kind,
    runtime: tool.runtime,
    activationScope: tool.activationScope,
    memberToolIds: tool.memberToolIds ?? [],
    docsFile: tool.docsFile,
    mcpServerName: tool.mcpServerName,
    defaultReadTargets: tool.defaultReadTargets,
    capabilities: tool.capabilities,
    contextHints: tool.contextHints,
    promptHints: tool.promptHints,
    recommendedConnection: tool.recommendedConnection,
    fallbackConnection: tool.fallbackConnection,
    execution: tool.execution,
    requiredEnvVars: tool.requiredEnvVars,
    optionalEnvVars: tool.optionalEnvVars,
    dependencies: tool.dependencies,
    installCommands: tool.installCommands,
    verifyCommands: tool.verifyCommands,
    bundle: {
      url: resolveAssetUrl(assetBaseUrl, archiveName),
      sha256: await sha256Hex(archiveBytes),
      format: "zip",
      sizeBytes: archiveBytes.byteLength,
    },
    metadata: {
      rootDirectory: tool.id,
      mcpConfigPath: existsSync(join(sourceDir, "mcp.json")) ? `${tool.id}/mcp.json` : null,
      knowledgeDirectory: existsSync(join(sourceDir, "knowledge")) ? `${tool.id}/knowledge` : null,
      skillsDirectory: existsSync(join(sourceDir, "skills")) ? `${tool.id}/skills` : null,
      readmePath: existsSync(join(sourceDir, "README.md")) ? `${tool.id}/README.md` : null,
    },
  };
}

async function collectArchiveEntries(sourceDir: string, rootDirectory: string) {
  const entries: Record<string, Uint8Array> = {};
  await walkDirectory(sourceDir, async (filePath) => {
    const relativePath = relative(sourceDir, filePath).replaceAll("\\", "/");
    entries[`${rootDirectory}/${relativePath}`] = new Uint8Array(await Bun.file(filePath).arrayBuffer());
  });
  return entries;
}

async function walkDirectory(dir: string, visitFile: (filePath: string) => Promise<void>) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, visitFile);
      continue;
    }

    await visitFile(fullPath);
  }
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function resolveAssetUrl(baseUrl: string, archiveName: string) {
  if (!baseUrl.endsWith("/")) {
    return `${baseUrl}/${archiveName}`;
  }

  return `${baseUrl}${archiveName}`;
}

function parseArgs(values: string[]) {
  const args: Record<string, string> = {};

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      continue;
    }

    args[value.slice(2)] = values[index + 1] ?? "";
    index += 1;
  }

  return {
    outputDir: args["output-dir"],
    registryPath: args["registry-path"],
    assetBaseUrl: args["asset-base-url"],
    sourceRepo: args["source-repo"],
  };
}
