import { describe, expect, test } from "bun:test";
import { defaultSettings, surfaces } from "./contracts";

describe("default settings", () => {
  test("keep connector secrets out of persisted app settings", () => {
    expect(defaultSettings.some((setting) => setting.key.includes("telegram"))).toBe(false);
    expect(defaultSettings.some((setting) => setting.key.includes("slack"))).toBe(false);
  });

  test("include Slack as a supported chat surface", () => {
    expect(surfaces).toEqual(["web", "telegram", "slack"]);
  });
});
