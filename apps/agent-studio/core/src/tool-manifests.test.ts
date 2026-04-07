import { describe, expect, test } from "bun:test";
import { allToolModules, shippedToolModules } from "../../../../tools";
import { listToolManifests } from "./tool-manifests";

describe("tool modules", () => {
  test("use unique tool ids", () => {
    const ids = allToolModules.map((toolModule) => toolModule.runtimeSpec.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("export one shipped manifest per shipped tool module", () => {
    const manifests = listToolManifests();
    expect(manifests.map((manifest) => manifest.id)).toEqual(
      shippedToolModules.map((toolModule) => toolModule.runtimeSpec.id),
    );
  });

  test("use repo-relative tools paths for shipped read targets", () => {
    for (const manifest of listToolManifests()) {
      expect(manifest.shippedToolDir.endsWith(`/${manifest.id}`)).toBe(true);
      expect(manifest.shippedToolDir.startsWith("tools/")).toBe(true);
      expect(manifest.defaultReadTargets.length).toBeGreaterThan(0);
      for (const target of manifest.defaultReadTargets) {
        expect(target.startsWith(`${manifest.shippedToolDir}/`)).toBe(true);
        expect(target.includes("packages/tools/")).toBe(false);
      }
    }
  });
});
