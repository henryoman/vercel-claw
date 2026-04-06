import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const instanceProfileRecordValidator = v.object({
  id: v.string(),
  instanceId: v.string(),
  profile: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getForInstance = query({
  args: {
    instanceId: v.string(),
  },
  returns: v.union(instanceProfileRecordValidator, v.null()),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("instanceProfile")
      .withIndex("by_instance", (query) => query.eq("instanceId", args.instanceId))
      .unique();

    if (!profile) {
      return null;
    }

    return {
      id: profile._id,
      instanceId: profile.instanceId,
      profile: profile.profile,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },
});

export const upsert = mutation({
  args: {
    instanceId: v.string(),
    profile: v.string(),
  },
  returns: instanceProfileRecordValidator,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instanceProfile")
      .withIndex("by_instance", (query) => query.eq("instanceId", args.instanceId))
      .unique();

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        profile: args.profile,
        updatedAt,
      });

      return {
        id: existing._id,
        instanceId: existing.instanceId,
        profile: args.profile,
        createdAt: existing.createdAt,
        updatedAt,
      };
    }

    const instanceProfileId = await ctx.db.insert("instanceProfile", {
      instanceId: args.instanceId,
      profile: args.profile,
      createdAt: updatedAt,
      updatedAt,
    });

    return {
      id: instanceProfileId,
      instanceId: args.instanceId,
      profile: args.profile,
      createdAt: updatedAt,
      updatedAt,
    };
  },
});
