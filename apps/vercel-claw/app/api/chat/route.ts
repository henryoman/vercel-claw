import type { ChatSendRequest } from "@vercel-claw/core";
import { streamChatResponse } from "@/agent/chat";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const payload = (await request.json()) as ChatSendRequest;
  return await streamChatResponse(payload);
}
