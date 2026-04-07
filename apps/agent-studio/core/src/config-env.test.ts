import { describe, expect, test } from "bun:test";
import { defaultClawConfig, mergeClawConfig, resolveEnvRequirements } from "./index";

describe("env requirements", () => {
  test("do not require connector secrets when only web is enabled", () => {
    const requirements = resolveEnvRequirements(defaultClawConfig);

    expect(requirements.requiredEnvVars).not.toContain("TELEGRAM_BOT_TOKEN");
    expect(requirements.requiredEnvVars).not.toContain("SLACK_BOT_TOKEN");
    expect(requirements.requiredEnvVars).not.toContain("SLACK_SIGNING_SECRET");
  });

  test("require connector secrets for enabled chat surfaces", () => {
    const config = mergeClawConfig({
      ...defaultClawConfig,
      enabledSurfaceIds: ["web", "telegram", "slack"],
    });

    const requirements = resolveEnvRequirements(config);
    expect(requirements.requiredEnvVars).toContain("TELEGRAM_BOT_TOKEN");
    expect(requirements.requiredEnvVars).toContain("SLACK_BOT_TOKEN");
    expect(requirements.requiredEnvVars).toContain("SLACK_SIGNING_SECRET");
    expect(requirements.optionalEnvVars).toContain("SLACK_APP_TOKEN");
  });
});
