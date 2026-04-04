import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deployments: defineTable({
    label: v.string(),
    environment: v.union(v.literal("development"), v.literal("production")),
    convexDeployment: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_environment", ["environment"]),

  agents: defineTable({
    slug: v.string(),
    label: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  threads: defineTable({
    agentId: v.id("agents"),
    title: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("errored"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_agent", ["agentId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
    ),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  artifacts: defineTable({
    threadId: v.id("threads"),
    kind: v.union(v.literal("file"), v.literal("note"), v.literal("result")),
    label: v.string(),
    storageId: v.optional(v.id("_storage")),
    text: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
