import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "./system-prompt";

describe("buildSystemPrompt", () => {
  test("appends the tool workflow, enabled tool summary, and instance context", () => {
    const prompt = buildSystemPrompt("Base prompt", {
      exposedToolIds: ["notion"],
      context: {
        instructions: ["Stay concise"],
        notes: ["Prefer verified facts"],
        knowledgeFiles: ["deployments/default/prompts/system.md"],
      },
    });

    expect(prompt).toContain("Base prompt");
    expect(prompt).toContain("Tool workflow:");
    expect(prompt).toContain("Enabled shipped tools for this instance:");
    expect(prompt).toContain("- notion (Notion):");
    expect(prompt).toContain("Instance instructions:\n- Stay concise");
    expect(prompt).toContain("Instance notes:\n- Prefer verified facts");
    expect(prompt).toContain(
      "Knowledge files configured for this instance:\n- deployments/default/prompts/system.md",
    );
  });

  test("explains when no shipped tools are enabled", () => {
    const prompt = buildSystemPrompt("Base prompt", null);

    expect(prompt).toContain("Enabled shipped tools for this instance:");
    expect(prompt).toContain("Only the built-in prompt helper tools are available");
  });
});
