import { defaultClawConfig } from "@vercel-claw/core";

export function GET() {
  const missing = defaultClawConfig.requiredEnvVars.filter((key) => !process.env[key]);

  return Response.json({
    ok: missing.length === 0,
    missing,
  });
}
