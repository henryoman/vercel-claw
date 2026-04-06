#!/usr/bin/env bun

import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

type DependencySection =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";

interface PackageJson {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface NpmRegistryMetadata {
  "dist-tags"?: Record<string, string>;
}

const dependencySections: DependencySection[] = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const prereleaseTags = new Set(["alpha", "beta", "canary", "next", "rc"]);
const skippedProtocols = [
  "workspace:",
  "file:",
  "link:",
  "portal:",
  "patch:",
  "git+",
  "github:",
  "http:",
  "https:",
  "npm:",
  "jsr:",
  "catalog:",
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = Bun.argv.includes("--dry-run");

async function main() {
  const rootManifestPath = join(repoRoot, "package.json");
  const rootManifest = await readPackageJson(rootManifestPath);
  const manifestPaths = await collectManifestPaths(rootManifest);
  const versionCache = new Map<string, Promise<string>>();

  let changedFiles = 0;
  let changedDependencies = 0;

  for (const manifestPath of manifestPaths) {
    const manifest = await readPackageJson(manifestPath);
    const packageLabel = manifest.name ?? relative(repoRoot, manifestPath) ?? "root";
    let fileChanged = false;

    for (const section of dependencySections) {
      const deps = manifest[section];
      if (!deps) {
        continue;
      }

      for (const [packageName, currentSpec] of Object.entries(deps)) {
        if (shouldSkipSpec(currentSpec)) {
          continue;
        }

        const tag = getTagForSpec(currentSpec);
        const latestVersion = await resolveTaggedVersion(packageName, tag, versionCache);
        const nextSpec = formatNextSpec(currentSpec, latestVersion);

        if (nextSpec === currentSpec) {
          continue;
        }

        deps[packageName] = nextSpec;
        fileChanged = true;
        changedDependencies += 1;

        console.log(
          `${dryRun ? "[dry-run] " : ""}${packageLabel} ${section} ${packageName}: ${currentSpec} -> ${nextSpec}`,
        );
      }
    }

    if (!fileChanged) {
      continue;
    }

    changedFiles += 1;

    if (!dryRun) {
      await Bun.write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    }
  }

  if (dryRun) {
    console.log(
      changedFiles > 0
        ? `[dry-run] Would update ${changedDependencies} dependencies across ${changedFiles} package.json files.`
        : "[dry-run] No dependency range changes found.",
    );
    return;
  }

  if (changedFiles === 0) {
    console.log("No dependency range changes found.");
    return;
  }

  console.log("Refreshing lockfile with bun install...");

  const install = Bun.spawn(["bun", "install"], {
    cwd: repoRoot,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await install.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function collectManifestPaths(rootManifest: PackageJson) {
  const manifestPaths = new Set<string>([join(repoRoot, "package.json")]);
  const workspacePatterns = Array.isArray(rootManifest.workspaces)
    ? rootManifest.workspaces
    : rootManifest.workspaces?.packages ?? [];

  for (const pattern of workspacePatterns) {
    const packageJsonPattern = pattern.endsWith("package.json") ? pattern : `${pattern}/package.json`;
    const glob = new Bun.Glob(packageJsonPattern);

    for await (const match of glob.scan({
      cwd: repoRoot,
      absolute: false,
      dot: false,
      onlyFiles: true,
    })) {
      manifestPaths.add(join(repoRoot, match));
    }
  }

  return [...manifestPaths].sort();
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return (await Bun.file(path).json()) as PackageJson;
}

function shouldSkipSpec(spec: string) {
  return skippedProtocols.some((protocol) => spec.startsWith(protocol));
}

function getTagForSpec(spec: string) {
  const normalized = spec.trim().replace(/^[~^]/, "");

  if (normalized === "*" || normalized.length === 0) {
    return "latest";
  }

  if (normalized === "latest") {
    return "latest";
  }

  if (prereleaseTags.has(normalized)) {
    return normalized;
  }

  const prereleasePart = normalized.split("-")[1];
  if (!prereleasePart) {
    return "latest";
  }

  const prereleaseTag = prereleasePart.split(/[.-]/)[0]?.toLowerCase();
  return prereleaseTag && prereleaseTags.has(prereleaseTag) ? prereleaseTag : "latest";
}

async function resolveTaggedVersion(
  packageName: string,
  tag: string,
  cache: Map<string, Promise<string>>,
) {
  const cacheKey = `${packageName}@${tag}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return await cached;
  }

  const pending = fetchRegistryVersion(packageName, tag);
  cache.set(cacheKey, pending);
  return await pending;
}

async function fetchRegistryVersion(packageName: string, tag: string) {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${packageName} metadata: ${response.status} ${response.statusText}`);
  }

  const metadata = (await response.json()) as NpmRegistryMetadata;
  const version = metadata["dist-tags"]?.[tag];

  if (!version) {
    throw new Error(`Package ${packageName} does not publish a "${tag}" dist-tag`);
  }

  return version;
}

function formatNextSpec(currentSpec: string, version: string) {
  const prefix = currentSpec.startsWith("~") ? "~" : "^";
  return `${prefix}${version}`;
}

await main();
