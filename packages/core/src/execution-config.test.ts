import { describe, expect, test } from "bun:test";
import {
  createDefaultRuntimeExecutionConfig,
  normalizeInstanceExecutionOverrides,
  normalizeSharedDeploymentDefaults,
  resolveRuntimeExecutionConfig,
} from "./index";

describe("runtime execution config", () => {
  test("normalizes shared deployment defaults with sandbox execution defaults", () => {
    const defaults = normalizeSharedDeploymentDefaults({
      defaultModel: "gpt-5",
      promptFiles: ["prompts/system.md"],
      toolsetFile: "toolsets/default.json",
      integrations: [],
    });

    expect(defaults.execution).toEqual(createDefaultRuntimeExecutionConfig());
  });

  test("merges instance execution overrides on top of the shared sandbox policy", () => {
    const shared = createDefaultRuntimeExecutionConfig();
    const overrides = normalizeInstanceExecutionOverrides({
      timeoutMs: 120_000,
      vcpus: 4,
      sandboxEnabled: true,
    });

    expect(resolveRuntimeExecutionConfig(shared, overrides)).toEqual({
      mode: "sandbox",
      sandbox: {
        enabled: true,
        timeoutMs: 120_000,
        snapshotExpirationMs: shared.sandbox.snapshotExpirationMs,
        vcpus: 4,
      },
    });
  });
});
