import { getThreadDetail } from "@/lib/server/threads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const detail = await getThreadDetail(threadId);

  if (!detail) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  return Response.json(detail);
}
