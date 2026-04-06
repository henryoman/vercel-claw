import "server-only";

import { openai } from "@ai-sdk/openai";
import { DEFAULT_DEPLOYMENT_ID } from "@vercel-claw/core";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import type { ChatSendRequest, Surface, ThreadMessage } from "@vercel-claw/core";
import { getInstanceRuntimeConfig } from "@/lib/server/runtime-config";
import { ensureGlobalSettings, listGlobalSettings } from "@/lib/server/settings";
import {
  appendMessage,
  getPromptContext,
  updateThreadStatus,
} from "@/lib/server/threads";
import { createAgentTools } from "./actions";
import { getRecentMessages } from "./context-utils/getRecentMessages";
import { buildSystemPrompt } from "./system-prompt";

export async function streamChatResponse(payload: ChatSendRequest): Promise<Response> {
  const lastUserMessage = [...payload.messages]
    .reverse()
    .find((message) => message.role === "user" && message.text.trim().length > 0);

  if (!payload.threadId || !lastUserMessage) {
    return Response.json(
      { error: "threadId and a user message are required" },
      { status: 400 },
    );
  }

  await ensureGlobalSettings();
  await appendMessage({
    threadId: payload.threadId,
    role: "user",
    surface: payload.surface,
    content: lastUserMessage.text,
  });
  await updateThreadStatus(payload.threadId, "running");

  try {
    const context = await buildModelContext(payload.threadId);
    if (!context) {
      await updateThreadStatus(payload.threadId, "errored");
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const result = streamText({
      model: openai(context.modelName),
      system: context.systemPrompt,
      messages: context.modelMessages,
      tools: context.tools,
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: context.uiMessages,
      onFinish: async ({ messages, isAborted }) => {
        if (isAborted) {
          await updateThreadStatus(payload.threadId, "idle");
          return;
        }

        const assistantText = extractLastAssistantText(messages);
        if (!assistantText) {
          await updateThreadStatus(payload.threadId, "errored");
          return;
        }

        await appendMessage({
          threadId: payload.threadId,
          role: "assistant",
          surface: payload.surface,
          content: assistantText,
        });
        await updateThreadStatus(payload.threadId, "completed");
      },
    });
  } catch (error) {
    console.error("Chat stream failed", error);
    await updateThreadStatus(payload.threadId, "errored");
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 },
    );
  }
}

export async function generateThreadReply(threadId: string, surface: Surface) {
  await ensureGlobalSettings();
  await updateThreadStatus(threadId, "running");

  try {
    const context = await buildModelContext(threadId);
    if (!context) {
      await updateThreadStatus(threadId, "errored");
      throw new Error("Thread not found");
    }

    const completion = await generateText({
      model: openai(context.modelName),
      system: context.systemPrompt,
      messages: context.modelMessages,
      tools: context.tools,
      stopWhen: stepCountIs(8),
    });

    const assistantMessage = await appendMessage({
      threadId,
      role: "assistant",
      surface,
      content: completion.text,
    });
    const thread = await updateThreadStatus(threadId, "completed");

    return {
      thread,
      assistantMessage,
    };
  } catch (error) {
    await updateThreadStatus(threadId, "errored");
    throw error;
  }
}

async function buildModelContext(threadId: string) {
  const promptContext = await getPromptContext(threadId);

  if (!promptContext) {
    return null;
  }

  const [settings, runtimeConfig] = await Promise.all([
    listGlobalSettings(),
    getInstanceRuntimeConfig(promptContext.thread.instanceId),
  ]);

  const settingsMap = new Map(settings.map((setting) => [setting.key, setting.value]));
  const modelName = settingsMap.get("model.defaultModel") || promptContext.agent.model;
  const baseSystemPrompt =
    runtimeConfig?.context.systemPrompt ||
    settingsMap.get("model.systemPrompt") ||
    promptContext.agent.systemPrompt;
  const promptMessages = getRecentMessages(promptContext.messages);
  const uiMessages = promptMessages.map(toUiMessage);
  const modelMessages = await convertToModelMessages(uiMessages);

  return {
    modelName,
    systemPrompt: await buildSystemPrompt(baseSystemPrompt, runtimeConfig),
    uiMessages,
    modelMessages,
    tools: createAgentTools({
      deploymentId: runtimeConfig?.deploymentId ?? DEFAULT_DEPLOYMENT_ID,
      instanceId: promptContext.thread.instanceId,
      threadId: promptContext.thread.id,
      surface: promptContext.thread.surface,
      execution: runtimeConfig?.execution ?? null,
      exposedToolIds: runtimeConfig?.exposedToolIds ?? [],
      knowledgeFiles: runtimeConfig?.context.knowledgeFiles ?? [],
    }),
  };
}

function toUiMessage(message: ThreadMessage): UIMessage {
  return {
    id: message.id,
    role: message.role === "tool" ? "assistant" : message.role,
    parts: [{ type: "text", text: message.content }],
  };
}

function extractLastAssistantText(messages: UIMessage[]) {
  const assistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!assistantMessage) {
    return "";
  }

  return assistantMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim();
}
