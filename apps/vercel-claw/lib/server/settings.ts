import { defaultSettings, type SettingRecord, type UpdateSettingRequest } from "@vercel-claw/core";
import { api, getConvexClient } from "./convex";

export async function ensureGlobalSettings() {
  return await getConvexClient().mutation(api.settings.seedGlobalDefaults, {});
}

export async function listGlobalSettings(): Promise<SettingRecord[]> {
  await ensureGlobalSettings();
  return await getConvexClient().query(api.settings.listForScope, {
    scope: "global",
  });
}

export async function upsertSetting(input: UpdateSettingRequest): Promise<SettingRecord> {
  return await getConvexClient().mutation(api.settings.upsert, {
    scope: input.scope,
    key: input.key,
    label: input.label,
    value: input.value,
  });
}

export function getDefaultSettings() {
  return defaultSettings;
}
