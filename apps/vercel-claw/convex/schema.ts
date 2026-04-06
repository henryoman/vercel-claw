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
const instanceGateMode = v.union(
  v.literal("member"),
  v.literal("password"),
  v.literal("public"),
);
const executionMode = v.union(v.literal("metadata"), v.literal("sandbox"));
const sandboxRunStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
);
const sandboxRunner = v.union(
  v.literal("browser"),
  v.literal("shell"),
  v.literal("cli"),
  v.literal("stdio-mcp"),
  v.literal("http-mcp"),
);

export default defineSchema({
  deployments: defineTable({
    label: v.string(),
    environment: v.union(v.literal("development"), v.literal("production")),
    convexDeployment: v.optional(v.string()),
    vercelProjectId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_environment", ["environment"]),

  deploymentConfigs: defineTable({
    deploymentId: v.string(),
    installedToolIds: v.array(v.string()),
    sharedContextJson: v.string(),
    executionMode,
    sandboxEnabled: v.boolean(),
    sandboxTimeoutMs: v.number(),
    sandboxSnapshotExpirationMs: v.union(v.number(), v.null()),
    sandboxVcpus: v.union(v.number(), v.null()),
    updatedAt: v.number(),
  }).index("by_deployment", ["deploymentId"]),

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
    instanceId: v.string(),
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
    .index("by_instance", ["instanceId"])
    .index("by_instance_and_updated_at", ["instanceId", "updatedAt"])
    .index("by_surface", ["surface"])
    .index("by_surface_and_external_thread", ["surface", "externalThreadId"])
    .index("by_updated_at", ["updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    instanceId: v.string(),
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
    instanceId: v.string(),
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

  instanceConfigs: defineTable({
    deploymentId: v.string(),
    instanceId: v.string(),
    label: v.string(),
    gateMode: instanceGateMode,
    passwordSecretName: v.optional(v.string()),
    exposedToolIds: v.array(v.string()),
    resolvedContextJson: v.string(),
    executionMode,
    sandboxEnabled: v.boolean(),
    sandboxTimeoutMs: v.number(),
    sandboxSnapshotExpirationMs: v.union(v.number(), v.null()),
    sandboxVcpus: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_instance", ["instanceId"])
    .index("by_deployment_and_instance", ["deploymentId", "instanceId"]),

  instanceProfile: defineTable({
    instanceId: v.string(),
    profile: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_instance", ["instanceId"]),

  sandboxRuns: defineTable({
    threadId: v.id("threads"),
    instanceId: v.string(),
    toolId: v.string(),
    operation: v.string(),
    runner: sandboxRunner,
    sandboxName: v.string(),
    workingDirectory: v.string(),
    status: sandboxRunStatus,
    commandId: v.optional(v.string()),
    exitCode: v.optional(v.number()),
    stdoutArtifactId: v.optional(v.id("artifacts")),
    stderrArtifactId: v.optional(v.id("artifacts")),
    resultArtifactId: v.optional(v.id("artifacts")),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_instance_and_updated_at", ["instanceId", "updatedAt"])
    .index("by_status_and_updated_at", ["status", "updatedAt"]),
});
