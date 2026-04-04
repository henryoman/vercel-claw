import type { UpdateSettingRequest } from "@vercel-claw/core";
import { listGlobalSettings, upsertSetting } from "@/lib/server/settings";

export async function GET() {
  const settings = await listGlobalSettings();
  return Response.json({ settings });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as UpdateSettingRequest;
  const setting = await upsertSetting(payload);
  return Response.json({ setting });
}
