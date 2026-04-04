import type {
  CreateThreadRequest,
  Surface,
  ThreadDetail,
  ThreadMessage,
  ThreadStatus,
  ThreadSummary,
} from "@vercel-claw/core";
import { api, getConvexClient } from "./convex";

export async function listThreads(limit = 20): Promise<ThreadSummary[]> {
  return await getConvexClient().query(api.threads.list, { limit });
}

export async function getThreadDetail(threadId: string): Promise<ThreadDetail | null> {
  return await getConvexClient().query(api.threads.get, { threadId });
}

export async function createThread(input: CreateThreadRequest): Promise<ThreadSummary> {
  return await getConvexClient().mutation(api.threads.create, {
    title: input.title,
    surface: input.surface,
    agentSlug: input.agentSlug,
    externalThreadId: input.externalThreadId,
    externalUserId: input.externalUserId,
  });
}

export async function createOrGetExternalThread(input: {
  surface: Surface;
  externalThreadId: string;
  externalUserId?: string;
  title?: string;
  agentSlug?: string;
}): Promise<ThreadSummary> {
  return await getConvexClient().mutation(api.threads.createOrGetExternal, {
    surface: input.surface,
    externalThreadId: input.externalThreadId,
    externalUserId: input.externalUserId,
    title: input.title,
    agentSlug: input.agentSlug,
  });
}

export async function appendMessage(input: {
  threadId: string;
  role: ThreadMessage["role"];
  surface: Surface;
  content: string;
  externalMessageId?: string;
  createdAt?: number;
}): Promise<ThreadMessage> {
  return await getConvexClient().mutation(api.threads.appendMessage, {
    threadId: input.threadId,
    role: input.role,
    surface: input.surface,
    content: input.content,
    externalMessageId: input.externalMessageId,
    createdAt: input.createdAt,
  });
}

export async function updateThreadStatus(
  threadId: string,
  status: ThreadStatus,
): Promise<ThreadSummary> {
  return await getConvexClient().mutation(api.threads.updateStatus, {
    threadId,
    status,
  });
}

export async function findExternalMessage(
  surface: Surface,
  externalMessageId: string,
): Promise<ThreadMessage | null> {
  return await getConvexClient().query(api.threads.findMessageByExternal, {
    surface,
    externalMessageId,
  });
}

export async function getPromptContext(threadId: string) {
  return await getConvexClient().query(api.threads.getPromptContext, { threadId });
}
