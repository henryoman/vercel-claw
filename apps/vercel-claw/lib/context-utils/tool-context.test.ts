import { describe, expect, test } from "bun:test";
import type { ToolSourceManifest } from "@vercel-claw/core";
import { buildToolContextIndex } from "./tool-context";

describe("buildToolContextIndex", () => {
  test("builds a compact TOC with grouped files and startHere ordering", () => {
    const tool = createTool();
    const index = buildToolContextIndex(tool, [
      "packages/tools/notion/README.md",
      "packages/tools/notion/mcp.json",
      "packages/tools/notion/knowledge/mcp-docs.md",
      "packages/tools/notion/skills/README.md",
      "packages/tools/notion/examples/example.md",
    ]);

    expect(index.summary).toBe("Hosted Notion MCP connection metadata and docs.");
    expect(index.startHere).toEqual([
      "packages/tools/notion/knowledge/mcp-docs.md",
      "packages/tools/notion/README.md",
      "packages/tools/notion/mcp.json",
      "packages/tools/notion/skills/README.md",
    ]);
    expect(index.importantFiles.docs).toEqual(["packages/tools/notion/README.md"]);
    expect(index.importantFiles.config).toEqual(["packages/tools/notion/mcp.json"]);
    expect(index.importantFiles.knowledge).toEqual([
      "packages/tools/notion/knowledge/mcp-docs.md",
    ]);
    expect(index.importantFiles.skills).toEqual(["packages/tools/notion/skills/README.md"]);
    expect(index.importantFiles.other).toEqual(["packages/tools/notion/examples/example.md"]);
    expect(index.connection).toEqual({
      runtime: "mcp",
      mcpServerName: "notion",
      recommendedTransport: "http",
      fallbackTransport: "stdio",
    });
    expect(index.execution).toBeNull();
  });

  test("includes execution metadata when the tool declares a runtime contract", () => {
    const index = buildToolContextIndex(
      {
        ...createTool(),
        execution: {
          runner: "browser",
          sandbox: "required",
          workingDirectory: "thread",
          description: "Persistent browser automation in the instance sandbox.",
          supportsBackground: false,
          operations: [
            {
              id: "snapshot",
              label: "Snapshot",
              description: "Capture an accessibility snapshot.",
              arguments: [],
            },
          ],
        },
      },
      ["packages/tools/notion/knowledge/mcp-docs.md"],
    );

    expect(index.execution).toEqual({
      runner: "browser",
      sandbox: "required",
      workingDirectory: "thread",
      supportsBackground: false,
      operations: ["snapshot"],
    });
  });
});

function createTool(): ToolSourceManifest {
  return {
    id: "notion",
    version: "0.1.0",
    label: "Notion",
    description: "Hosted Notion MCP connection metadata and docs.",
    kind: "mcp",
    activationScope: "instance",
    dependencies: [],
    installCommands: [],
    verifyCommands: [],
    requiredEnvVars: [],
    optionalEnvVars: [],
    cacheSubdir: "notion",
    runtime: "mcp",
    docsFile: "knowledge/mcp-docs.md",
    mcpServerName: "notion",
    defaultReadTargets: [],
    capabilities: ["Workspace docs", "Database context"],
    contextHints: [],
    promptHints: [],
    recommendedConnection: {
      transport: "http",
      url: "https://mcp.notion.com/mcp",
    },
    fallbackConnection: {
      transport: "stdio",
      command: "bunx",
      args: ["mcp-remote", "https://mcp.notion.com/mcp"],
    },
    shippedToolDir: "packages/tools/notion",
  };
}
