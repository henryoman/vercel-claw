import type { CreateThreadRequest } from "@vercel-claw/core";
import { createThread, listThreads } from "@/lib/server/threads";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const instanceId = url.searchParams.get("instanceId") ?? undefined;
  const threads = await listThreads(limit, instanceId);
  return Response.json({ threads });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as CreateThreadRequest;
  const thread = await createThread(payload);
  return Response.json({ thread }, { status: 201 });
}
