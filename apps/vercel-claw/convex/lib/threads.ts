import { DEFAULT_AGENT_SLUG } from "@vercel-claw/core";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { NotFoundError, ValidationError } from "./errors";

type DatabaseCtx = QueryCtx | MutationCtx;
type DatabaseId = Parameters<QueryCtx["db"]["get"]>[0];
type ThreadDoc = {
  _id: string;
  agentId: string;
  title: string;
  status: "idle" | "running" | "completed" | "errored";
  surface: "web" | "telegram";
  externalThreadId?: string;
  externalUserId?: string;
  lastMessageAt?: number;
  createdAt: number;
  updatedAt: number;
};
type MessageDoc = {
  _id: string;
  threadId: string;
  role: "system" | "user" | "assistant" | "tool";
  surface: "web" | "telegram";
  content: string;
  externalMessageId?: string;
  createdAt: number;
};
type SettingDoc = {
  _id: string;
  scope: "global" | "web" | "telegram";
  key: string;
  label: string;
  value: string;
  updatedAt: number;
};
type ArtifactDoc = {
  _id: string;
  threadId: string;
  kind: "file" | "note" | "result";
  label: string;
  surface: "web" | "telegram";
  storageId?: string;
  text?: string;
  externalArtifactId?: string;
  createdAt: number;
};
type AgentDoc = {
  _id: string;
  slug: string;
  label: string;
  model: string;
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
};

export function mapThread(thread: ThreadDoc) {
  return {
    id: thread._id,
    agentId: thread.agentId,
    title: thread.title,
    status: thread.status,
    surface: thread.surface,
    externalThreadId: thread.externalThreadId ?? null,
    externalUserId: thread.externalUserId ?? null,
    lastMessageAt: thread.lastMessageAt ?? null,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

export function mapMessage(message: MessageDoc) {
  return {
    id: message._id,
    threadId: message.threadId,
    role: message.role,
    surface: message.surface,
    content: message.content,
    externalMessageId: message.externalMessageId ?? null,
    createdAt: message.createdAt,
  };
}

export function mapSetting(setting: SettingDoc) {
  return {
    id: setting._id,
    scope: setting.scope,
    key: setting.key,
    label: setting.label,
    value: setting.value,
    updatedAt: setting.updatedAt,
  };
}

export function mapArtifact(artifact: ArtifactDoc) {
  return {
    id: artifact._id,
    threadId: artifact.threadId,
    kind: artifact.kind,
    label: artifact.label,
    surface: artifact.surface,
    text: artifact.text ?? null,
    storageId: artifact.storageId ?? null,
    externalArtifactId: artifact.externalArtifactId ?? null,
    createdAt: artifact.createdAt,
  };
}

export function deriveThreadTitle(input?: string) {
  const trimmed = (input ?? "").trim();
  if (!trimmed) {
    return "New thread";
  }

  if (trimmed.length <= 72) {
    return trimmed;
  }

  return `${trimmed.slice(0, 69).trimEnd()}...`;
}

export async function ensureAgent(ctx: MutationCtx, slug = DEFAULT_AGENT_SLUG) {
  const existing = await ctx.db
    .query("agents")
    .withIndex("by_slug", (query) => query.eq("slug", slug))
    .unique();

  if (existing) {
    return existing as AgentDoc;
  }

  const now = Date.now();
  const agentId = await ctx.db.insert("agents", {
    slug,
    label: slug === DEFAULT_AGENT_SLUG ? "Default agent" : slug,
    model: process.env.CLAW_AGENT_MODEL || "gpt-5-mini",
    systemPrompt:
      process.env.CLAW_SYSTEM_PROMPT ||
      "You are vercel-claw, a concise personal AI operator deployed with shared state stored in Convex.",
    createdAt: now,
    updatedAt: now,
  });

  const created = await ctx.db.get(agentId);
  if (!created) {
    throw new NotFoundError("Agent");
  }

  return created as AgentDoc;
}

export async function getThreadOrThrow(ctx: DatabaseCtx, threadId: DatabaseId) {
  const thread = await ctx.db.get(threadId);
  if (!thread) {
    throw new NotFoundError("Thread");
  }

  return thread as ThreadDoc;
}

export async function getAgentOrThrow(ctx: DatabaseCtx, agentId: DatabaseId) {
  const agent = await ctx.db.get(agentId);
  if (!agent) {
    throw new NotFoundError("Agent");
  }

  return agent as AgentDoc;
}

export async function getThreadByExternalRef(
  ctx: DatabaseCtx,
  surface: ThreadDoc["surface"],
  externalThreadId: string,
) {
  return await ctx.db
    .query("threads")
    .withIndex("by_surface", (query) => query.eq("surface", surface))
    .collect()
    .then((threads) => threads.find((thread) => thread.externalThreadId === externalThreadId));
}

export async function getMessageByExternalRef(
  ctx: MutationCtx,
  surface: MessageDoc["surface"],
  externalMessageId: string,
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_surface_and_external_message")
    .collect()
    .then(
      (messages) =>
        messages.find(
          (message) =>
            message.surface === surface && message.externalMessageId === externalMessageId,
        ),
    );
}

export function requireContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new ValidationError("Message content cannot be empty");
  }

  return trimmed;
}
