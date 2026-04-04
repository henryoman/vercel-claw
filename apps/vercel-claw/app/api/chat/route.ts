import type { ChatSendRequest } from "@vercel-claw/core";
import { streamChatResponse } from "@/lib/server/chat";

export const maxDuration = 30;

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatSendRequest;
  return await streamChatResponse(payload);
}
