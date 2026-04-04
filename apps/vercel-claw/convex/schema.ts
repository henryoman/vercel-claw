import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const surface = v.union(v.literal("web"), v.literal("telegram"));
const threadStatus = v.union(
  v.literal("idle"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("errored"),
);
const messageRole = v.union(
  v.literal("system"),
  v.literal("user"),
  v.literal("assistant"),
  v.literal("tool"),
);
const artifactKind = v.union(v.literal("file"), v.literal("note"), v.literal("result"));
const settingScope = v.union(v.literal("global"), v.literal("web"), v.literal("telegram"));

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
    status: threadStatus,
    surface,
    externalThreadId: v.optional(v.string()),
    externalUserId: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_surface", ["surface"])
    .index("by_surface_and_external_thread", ["surface", "externalThreadId"])
    .index("by_updated_at", ["updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: messageRole,
    surface,
    content: v.string(),
    externalMessageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_surface_and_external_message", ["surface", "externalMessageId"]),

  artifacts: defineTable({
    threadId: v.id("threads"),
    kind: artifactKind,
    label: v.string(),
    surface,
    storageId: v.optional(v.id("_storage")),
    text: v.optional(v.string()),
    externalArtifactId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_surface", ["surface"]),

  settings: defineTable({
    scope: settingScope,
    key: v.string(),
    label: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_scope", ["scope"])
    .index("by_scope_and_key", ["scope", "key"]),
});
