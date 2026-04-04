import type { TelegramWebhookRequest } from "@vercel-claw/core";
import { handleTelegramWebhook } from "@/lib/server/telegram";

export async function POST(request: Request) {
  const payload = (await request.json()) as TelegramWebhookRequest;
  const result = await handleTelegramWebhook(payload);
  return Response.json(result);
}
