import { defaultSettings } from "@vercel-claw/core";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { mapSetting } from "./lib/threads";
import { settingRecordValidator, settingScopeValidator } from "./lib/validators";

const defaultSettingInputValidator = v.object({
  key: v.string(),
  label: v.string(),
  value: v.string(),
});

export const listForScope = query({
  args: {
    scope: settingScopeValidator,
  },
  returns: v.array(settingRecordValidator),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_scope", (query) => query.eq("scope", args.scope))
      .collect();

    return settings.map((setting) => mapSetting(setting as Parameters<typeof mapSetting>[0]));
  },
});

export const ensureDefaults = mutation({
  args: {
    scope: settingScopeValidator,
    defaults: v.array(defaultSettingInputValidator),
  },
  returns: v.array(settingRecordValidator),
  handler: async (ctx, args) => {
    return await ensureScopeDefaults(ctx, args.scope, args.defaults);
  },
});

export const seedGlobalDefaults = mutation({
  args: {},
  returns: v.array(settingRecordValidator),
  handler: async (ctx) => {
    const seeded = await ensureScopeDefaults(ctx, "global", defaultSettings);

    return seeded;
  },
});

export const upsert = mutation({
  args: {
    scope: settingScopeValidator,
    key: v.string(),
    label: v.string(),
    value: v.string(),
  },
  returns: settingRecordValidator,
  handler: async (ctx, args) => {
    const scopedSettings = await ctx.db
      .query("settings")
      .withIndex("by_scope", (query) => query.eq("scope", args.scope))
      .collect();
    const existing = scopedSettings.find((setting) => setting.key === args.key);

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        value: args.value,
        updatedAt,
      });

      return mapSetting({
        ...existing,
        label: args.label,
        value: args.value,
        updatedAt,
      });
    }

    const settingId = await ctx.db.insert("settings", {
      scope: args.scope,
      key: args.key,
      label: args.label,
      value: args.value,
      updatedAt,
    });

    const created = await ctx.db.get(settingId);
    if (!created) {
      throw new Error("Setting creation failed");
    }

    return mapSetting(created);
  },
});

async function ensureScopeDefaults(
  ctx: MutationCtx,
  scope: "global" | "web" | "telegram" | "slack",
  defaults: Array<{ key: string; label: string; value: string }>,
) {
  const now = Date.now();

  for (const setting of defaults) {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_scope", (query) => query.eq("scope", scope))
      .collect()
      .then((settings) => settings.find((item) => item.key === setting.key));

    if (existing) {
      continue;
    }

    await ctx.db.insert("settings", {
      scope,
      key: setting.key,
      label: setting.label,
      value: setting.value,
      updatedAt: now,
    });
  }

  const settings = await ctx.db
    .query("settings")
    .withIndex("by_scope", (query) => query.eq("scope", scope))
    .collect();

  return settings.map((setting) => mapSetting(setting as Parameters<typeof mapSetting>[0]));
}
