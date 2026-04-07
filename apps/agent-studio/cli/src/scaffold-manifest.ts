export const scaffoldEntries = [
  ".gitattributes",
  ".gitignore",
  ".oxlintrc.json",
  "AGENTS.md",
  "README.md",
  "bun.lock",
  "package.json",
  "public",
  "scripts",
  "tools",
  "tsconfig.base.json",
  "tsconfig.json",
  "turbo.json",
  "vercel-claw.config.json",
  "apps/agent-studio/cli",
  "apps/agent-studio/core",
  "apps/vercel-claw",
  "deployments",
] as const;

const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
]);

export function shouldSkipScaffoldRelativePath(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  const segments = normalized.split("/");

  if (segments.some((segment) => ignoredDirectoryNames.has(segment))) {
    return true;
  }

  return (
    normalized === ".env" ||
    normalized === ".env.local" ||
    normalized.endsWith(".env.local") ||
    normalized.endsWith(".tsbuildinfo")
  );
}
