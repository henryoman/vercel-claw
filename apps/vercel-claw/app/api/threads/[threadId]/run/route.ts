import type { Surface } from "@vercel-claw/core";
import { startThreadReplyWorkflow } from "@/lib/server/thread-workflows";

type StartThreadRunRequest = {
  surface?: Surface;
  telegramChatId?: number;
};

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const payload = (await request.json().catch(() => ({}))) as StartThreadRunRequest;
  const surface = payload.surface ?? "web";

  if (surface !== "web" && surface !== "telegram") {
    return Response.json({ error: "Invalid surface" }, { status: 400 });
  }

  const run = await startThreadReplyWorkflow({
    threadId,
    surface,
    telegramChatId: payload.telegramChatId,
  });

  return Response.json(
    {
      ok: true,
      runId: run.runId,
    },
    { status: 202 },
  );
}
