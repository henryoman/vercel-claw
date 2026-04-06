import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vercel-claw/core"],
};

export default withWorkflow(nextConfig);
