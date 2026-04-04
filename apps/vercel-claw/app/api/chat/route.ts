import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai(process.env.CLAW_AGENT_MODEL || "gpt-4.1-mini"),
    system:
      process.env.CLAW_SYSTEM_PROMPT ||
      "You are vercel-claw, a concise personal AI operator deployed on Vercel with state stored in Convex.",
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
