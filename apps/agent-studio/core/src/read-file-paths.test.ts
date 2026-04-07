import { describe, expect, test } from "bun:test";
import { getToolManifest } from "./tool-manifests";
import {
  readRequestedTargets,
  resolveTargetValue,
  resolveToolContextTargets,
} from "../../../vercel-claw/agent/actions/readFile";

describe("read tool path resolution", () => {
  test("resolves shipped tool paths under tools/", async () => {
    const resolved = await resolveTargetValue("notion/mcp.json");
    expect(resolved.endsWith("/tools/included/notion/mcp.json")).toBe(true);
  });

  test("resolves toolId plus relative path under shipped tool dir", () => {
    const notion = getRequiredManifest("notion");
    const targets = resolveToolContextTargets(notion, {
      targets: ["mcp.json"],
      includeDocs: true,
      includeReadme: true,
      includeMcp: true,
      includeKnowledge: true,
      includeSkills: true,
    });

    expect(targets).toContain("tools/included/notion/mcp.json");
    expect(targets.some((target) => target.includes("packages/tools/"))).toBe(false);
  });

  test("reads tool-scoped paths from toolId plus path", async () => {
    const result = await readRequestedTargets({
      toolId: "notion",
      path: "mcp.json",
    });

    expect(result.kind).toBe("file");
    if (result.kind !== "file") {
      throw new Error("Expected a file result.");
    }
    expect(result.path).toBe("tools/included/notion/mcp.json");
  });
});

function getRequiredManifest(toolId: string) {
  const manifest = getToolManifest(toolId);
  if (!manifest) {
    throw new Error(`Missing test manifest for ${toolId}.`);
  }

  return manifest;
}
