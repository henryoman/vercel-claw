import { tool } from "ai";
import { z } from "zod";
import { getThreadDetail } from "@/lib/server/threads";
import { getRecentMessages } from "../context-utils/getRecentMessages";
import { readPastMessagesResultSchema } from "../tool-exec/tool-contracts";

const readPastMessagesInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(10),
    offset: z.number().int().min(0).default(0),
  })
  .strict();

export function createReadPastMessagesTool(options: { threadId: string }) {
  return tool({
    description:
      "Read older thread messages that were not included in the current prompt window.",
    inputSchema: readPastMessagesInputSchema,
    outputSchema: readPastMessagesResultSchema,
    execute: async (input) => {
      const detail = await getThreadDetail(options.threadId);
      if (!detail) {
        throw new Error("Thread not found.");
      }

      const recentMessages = getRecentMessages(detail.messages);
      const olderMessages = detail.messages.slice(0, Math.max(0, detail.messages.length - recentMessages.length));
      const end = Math.max(0, olderMessages.length - input.offset);
      const start = Math.max(0, end - input.limit);
      const page = olderMessages.slice(start, end);

      return {
        kind: "past-messages" as const,
        totalMessages: olderMessages.length,
        offset: input.offset,
        hasMore: start > 0,
        messages: page.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        })),
      };
    },
  });
}
