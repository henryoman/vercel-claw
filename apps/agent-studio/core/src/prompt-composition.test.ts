import { describe, expect, test } from "bun:test";
import {
  composeResolvedSystemPrompt,
  formatEnabledToolsPromptSection,
  type ComposeResolvedSystemPromptOptions,
} from "./prompt-composition";
import type { ToolSourceManifest } from "./tool-registry";

const defaultSharedPrompt = "You are vercel-claw, a concise personal AI operator.";

describe("composeResolvedSystemPrompt", () => {
  test("prefers prompt files over the default shared fallback", () => {
    const prompt = composePrompt({
      sharedBasePrompt: defaultSharedPrompt,
      sharedPromptFileContents: ["# system\n\nShared identity", "# default mode\n\nDefault behavior"],
      inheritsShared: true,
    });

    expect(prompt).toBe("# system\n\nShared identity\n\n# default mode\n\nDefault behavior");
  });

  test("layers instance prompt files and instance prompt after shared prompt text", () => {
    const prompt = composePrompt({
      sharedBasePrompt: "# system\n\nShared identity",
      sharedPromptFileContents: [],
      instanceBasePrompt: "Instance override",
      instancePromptFileContents: ["# focused mode\n\nInstance mode"],
      inheritsShared: true,
    });

    expect(prompt).toBe(
      "# system\n\nShared identity\n\n# focused mode\n\nInstance mode\n\nInstance override",
    );
  });

  test("uses instance-only prompt layers when shared inheritance is disabled", () => {
    const prompt = composePrompt({
      sharedBasePrompt: "# system\n\nShared identity",
      sharedPromptFileContents: ["Shared file"],
      instancePromptFileContents: ["Instance file"],
      inheritsShared: false,
    });

    expect(prompt).toBe("Instance file");
  });
});

describe("formatEnabledToolsPromptSection", () => {
  test("formats a compact summary for enabled tools", () => {
    const section = formatEnabledToolsPromptSection(["notion"], [mockTool()]);

    expect(section).toContain("Enabled shipped tools for this instance:");
    expect(section).toContain("- notion (Notion): Notion workspace access. runtime mcp, MCP notion.");
    expect(section).toContain(
      "Capabilities: Read workspace pages; Query databases; Retrieve tool docs.",
    );
  });

  test("explains when no shipped tools are enabled", () => {
    const section = formatEnabledToolsPromptSection([], []);

    expect(section).toContain("Enabled shipped tools for this instance:");
    expect(section).toContain("Only the built-in prompt helper tools are available");
  });
});

function composePrompt(overrides: Partial<ComposeResolvedSystemPromptOptions>) {
  return composeResolvedSystemPrompt({
    sharedBasePrompt: defaultSharedPrompt,
    sharedPromptFileContents: [],
    inheritsShared: true,
    defaultSharedPrompt,
    ...overrides,
  });
}

function mockTool(): ToolSourceManifest {
  return {
    id: "notion",
    version: "0.1.0",
    label: "Notion",
    description: "Notion workspace access.",
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
    defaultReadTargets: ["tools/notion/README.md"],
    capabilities: ["Read workspace pages", "Query databases", "Retrieve tool docs"],
    contextHints: [],
    promptHints: [],
    shippedToolDir: "tools/notion",
  };
}
