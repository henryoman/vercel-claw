import { v } from "convex/values";

export const surfaceValidator = v.union(
  v.literal("web"),
  v.literal("telegram"),
);

export const threadStatusValidator = v.union(
  v.literal("idle"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("errored"),
);

export const messageRoleValidator = v.union(
  v.literal("system"),
  v.literal("user"),
  v.literal("assistant"),
  v.literal("tool"),
);

export const artifactKindValidator = v.union(
  v.literal("file"),
  v.literal("note"),
  v.literal("result"),
);

export const settingScopeValidator = v.union(
  v.literal("global"),
  v.literal("web"),
  v.literal("telegram"),
);

export const threadSummaryValidator = v.object({
  id: v.string(),
  agentId: v.string(),
  instanceId: v.string(),
  title: v.string(),
  status: threadStatusValidator,
  surface: surfaceValidator,
  externalThreadId: v.union(v.string(), v.null()),
  externalUserId: v.union(v.string(), v.null()),
  lastMessageAt: v.union(v.number(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const threadMessageValidator = v.object({
  id: v.string(),
  threadId: v.string(),
  instanceId: v.string(),
  role: messageRoleValidator,
  surface: surfaceValidator,
  content: v.string(),
  externalMessageId: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

export const threadDetailValidator = v.object({
  thread: threadSummaryValidator,
  messages: v.array(threadMessageValidator),
});

export const settingRecordValidator = v.object({
  id: v.string(),
  scope: settingScopeValidator,
  key: v.string(),
  label: v.string(),
  value: v.string(),
  updatedAt: v.number(),
});

export const artifactRecordValidator = v.object({
  id: v.string(),
  threadId: v.string(),
  instanceId: v.string(),
  kind: artifactKindValidator,
  label: v.string(),
  surface: surfaceValidator,
  text: v.union(v.string(), v.null()),
  storageId: v.union(v.string(), v.null()),
  externalArtifactId: v.union(v.string(), v.null()),
  createdAt: v.number(),
});

export const promptContextValidator = v.object({
  thread: threadSummaryValidator,
  agent: v.object({
    id: v.string(),
    slug: v.string(),
    label: v.string(),
    model: v.string(),
    systemPrompt: v.string(),
  }),
  messages: v.array(threadMessageValidator),
});

export const runtimeConfigValidator = v.object({
  deploymentId: v.string(),
  instanceId: v.string(),
  label: v.string(),
  gateMode: v.union(v.literal("member"), v.literal("password"), v.literal("public")),
  passwordSecretName: v.union(v.string(), v.null()),
  installedToolIds: v.array(v.string()),
  exposedToolIds: v.array(v.string()),
  resolvedContextJson: v.string(),
  updatedAt: v.number(),
});
