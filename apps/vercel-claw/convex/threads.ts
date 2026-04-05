import { DEFAULT_AGENT_SLUG } from "@vercel-claw/core";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  getMessageByExternalRef,
  getThreadByExternalRef,
  getThreadOrThrow,
  deriveThreadTitle,
  ensureAgent,
  mapMessage,
  mapThread,
  requireContent,
} from "./lib/threads";
import {
  messageRoleValidator,
  promptContextValidator,
  surfaceValidator,
  threadDetailValidator,
  threadMessageValidator,
  threadStatusValidator,
  threadSummaryValidator,
} from "./lib/validators";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    instanceId: v.optional(v.string()),
  },
  returns: v.array(threadSummaryValidator),
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 50));
    const threadQuery = args.instanceId
      ? ctx.db
          .query("threads")
          .withIndex("by_instance_and_updated_at", (query) => query.eq("instanceId", args.instanceId!))
      : ctx.db.query("threads").withIndex("by_updated_at");
    const threads = await threadQuery.order("desc").collect();

    return threads
      .slice(0, limit)
      .map((thread) => mapThread(thread as Parameters<typeof mapThread>[0]));
  },
});

export const get = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(threadDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
      .collect();

    return {
      thread: mapThread(thread as Parameters<typeof mapThread>[0]),
      messages: messages.map((message) => mapMessage(message as Parameters<typeof mapMessage>[0])),
    };
  },
});

export const findMessageByExternal = query({
  args: {
    surface: surfaceValidator,
    externalMessageId: v.string(),
  },
  returns: v.union(threadMessageValidator, v.null()),
  handler: async (ctx, args) => {
    const message = await getMessageByExternalRef(ctx as MutationCtx, args.surface, args.externalMessageId);

    return message ? mapMessage(message as Parameters<typeof mapMessage>[0]) : null;
  },
});

export const getPromptContext = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.union(promptContextValidator, v.null()),
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    const agent = await ctx.db.get(thread.agentId);
    if (!agent) {
      return null;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (query) => query.eq("threadId", args.threadId))
      .collect();

    return {
      thread: mapThread(thread as Parameters<typeof mapThread>[0]),
      agent: {
        id: agent._id,
        slug: agent.slug,
        label: agent.label,
        model: agent.model,
        systemPrompt: agent.systemPrompt,
      },
      messages: messages.map((message) => mapMessage(message as Parameters<typeof mapMessage>[0])),
    };
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    instanceId: v.string(),
    surface: surfaceValidator,
    agentSlug: v.optional(v.string()),
    externalThreadId: v.optional(v.string()),
    externalUserId: v.optional(v.string()),
  },
  returns: threadSummaryValidator,
  handler: async (ctx, args) => {
    return await createThread(ctx, {
      title: args.title,
      instanceId: args.instanceId,
      surface: args.surface,
      agentSlug: args.agentSlug,
      externalThreadId: args.externalThreadId,
      externalUserId: args.externalUserId,
    });
  },
});

export const createOrGetExternal = mutation({
  args: {
    instanceId: v.string(),
    surface: surfaceValidator,
    externalThreadId: v.string(),
    externalUserId: v.optional(v.string()),
    agentSlug: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  returns: threadSummaryValidator,
  handler: async (ctx, args) => {
    const existing = await getThreadByExternalRef(
      ctx,
      args.instanceId,
      args.surface,
      args.externalThreadId,
    );
    if (existing) {
      return mapThread(existing as Parameters<typeof mapThread>[0]);
    }

    return await createThread(ctx, {
      title: args.title,
      instanceId: args.instanceId,
      surface: args.surface,
      agentSlug: args.agentSlug,
      externalThreadId: args.externalThreadId,
      externalUserId: args.externalUserId,
    });
  },
});

export const appendMessage = mutation({
  args: {
    threadId: v.id("threads"),
    role: messageRoleValidator,
    surface: surfaceValidator,
    content: v.string(),
    externalMessageId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  returns: threadMessageValidator,
  handler: async (ctx, args) => {
    if (args.externalMessageId) {
      const existing = await getMessageByExternalRef(ctx, args.surface, args.externalMessageId);
      if (existing) {
        return mapMessage(existing as Parameters<typeof mapMessage>[0]);
      }
    }

    const thread = await getThreadOrThrow(ctx, args.threadId);
    const timestamp = args.createdAt ?? Date.now();
    const content = requireContent(args.content);

    const messageId = await ctx.db.insert("messages", {
      threadId: thread._id,
      instanceId: thread.instanceId,
      role: args.role,
      surface: args.surface,
      content,
      externalMessageId: args.externalMessageId,
      createdAt: timestamp,
    });

    await ctx.db.patch(args.threadId, {
      updatedAt: timestamp,
      lastMessageAt: timestamp,
    });

    const created = await ctx.db.get(messageId);
    if (!created) {
      throw new Error("Message creation failed");
    }

    return mapMessage(created as Parameters<typeof mapMessage>[0]);
  },
});

export const updateStatus = mutation({
  args: {
    threadId: v.id("threads"),
    status: threadStatusValidator,
  },
  returns: threadSummaryValidator,
  handler: async (ctx, args) => {
    const thread = await getThreadOrThrow(ctx, args.threadId);
    const updatedAt = Date.now();

    await ctx.db.patch(args.threadId, {
      status: args.status,
      updatedAt,
    });

    return mapThread({
      ...thread,
      status: args.status,
      updatedAt,
    });
  },
});

async function createThread(
  ctx: MutationCtx,
  args: {
    title?: string;
    instanceId: string;
    surface: "web" | "telegram";
    agentSlug?: string;
    externalThreadId?: string;
    externalUserId?: string;
  },
) {
  const agent = await ensureAgent(ctx, args.agentSlug ?? DEFAULT_AGENT_SLUG);
  const now = Date.now();
  const threadInput = {
    agentId: agent._id,
    instanceId: args.instanceId,
    title: deriveThreadTitle(args.title),
    status: "idle" as const,
    surface: args.surface,
    createdAt: now,
    updatedAt: now,
    ...(args.externalThreadId ? { externalThreadId: args.externalThreadId } : {}),
    ...(args.externalUserId ? { externalUserId: args.externalUserId } : {}),
  };

  const threadId = await ctx.db.insert("threads", threadInput);

  const thread = await ctx.db.get(threadId);
  if (!thread) {
    throw new Error("Thread creation failed");
  }

  return mapThread(thread as Parameters<typeof mapThread>[0]);
}
