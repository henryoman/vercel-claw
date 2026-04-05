import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { runtimeConfigValidator } from "./lib/validators";

const gateModeValidator = v.union(
  v.literal("member"),
  v.literal("password"),
  v.literal("public"),
);

export const syncDeployment = mutation({
  args: {
    deploymentId: v.string(),
    installedToolIds: v.array(v.string()),
    sharedContextJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("deploymentConfigs")
      .withIndex("by_deployment", (query) => query.eq("deploymentId", args.deploymentId))
      .unique();

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        installedToolIds: args.installedToolIds,
        sharedContextJson: args.sharedContextJson,
        updatedAt,
      });
      return null;
    }

    await ctx.db.insert("deploymentConfigs", {
      deploymentId: args.deploymentId,
      installedToolIds: args.installedToolIds,
      sharedContextJson: args.sharedContextJson,
      updatedAt,
    });
    return null;
  },
});

export const syncInstance = mutation({
  args: {
    deploymentId: v.string(),
    instanceId: v.string(),
    label: v.string(),
    gateMode: gateModeValidator,
    passwordSecretName: v.optional(v.string()),
    exposedToolIds: v.array(v.string()),
    resolvedContextJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("instanceConfigs")
      .withIndex("by_deployment_and_instance", (query) => query.eq("deploymentId", args.deploymentId))
      .collect()
      .then((configs) => configs.find((config) => config.instanceId === args.instanceId) ?? null);

    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        gateMode: args.gateMode,
        passwordSecretName: args.passwordSecretName,
        exposedToolIds: args.exposedToolIds,
        resolvedContextJson: args.resolvedContextJson,
        updatedAt,
      });
      return null;
    }

    await ctx.db.insert("instanceConfigs", {
      deploymentId: args.deploymentId,
      instanceId: args.instanceId,
      label: args.label,
      gateMode: args.gateMode,
      passwordSecretName: args.passwordSecretName,
      exposedToolIds: args.exposedToolIds,
      resolvedContextJson: args.resolvedContextJson,
      createdAt: updatedAt,
      updatedAt,
    });
    return null;
  },
});

export const getForInstance = query({
  args: {
    deploymentId: v.string(),
    instanceId: v.string(),
  },
  returns: v.union(runtimeConfigValidator, v.null()),
  handler: async (ctx, args) => {
    const [deploymentConfig, instanceConfig] = await Promise.all([
      ctx.db
        .query("deploymentConfigs")
        .withIndex("by_deployment", (query) => query.eq("deploymentId", args.deploymentId))
        .unique(),
      ctx.db
        .query("instanceConfigs")
        .withIndex("by_deployment_and_instance", (query) => query.eq("deploymentId", args.deploymentId))
        .collect()
        .then((configs) => configs.find((config) => config.instanceId === args.instanceId) ?? null),
    ]);

    if (!deploymentConfig || !instanceConfig) {
      return null;
    }

    return {
      deploymentId: args.deploymentId,
      instanceId: args.instanceId,
      label: instanceConfig.label,
      gateMode: instanceConfig.gateMode,
      passwordSecretName: instanceConfig.passwordSecretName ?? null,
      installedToolIds: deploymentConfig.installedToolIds,
      exposedToolIds: instanceConfig.exposedToolIds,
      resolvedContextJson: instanceConfig.resolvedContextJson,
      updatedAt: Math.max(deploymentConfig.updatedAt, instanceConfig.updatedAt),
    };
  },
});
