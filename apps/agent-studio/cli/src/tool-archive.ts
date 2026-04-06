import type { ToolRegistryEntry } from "@vercel-claw/core";
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

export async function installToolArchive(tool: ToolRegistryEntry, installDir: string) {
  const bytes = await readAsset(tool.bundle.url);
  const sha256 = await sha256Hex(bytes);

  if (sha256 !== tool.bundle.sha256) {
    throw new Error(`Checksum mismatch for ${tool.id}: expected ${tool.bundle.sha256}, got ${sha256}`);
  }

  await rm(installDir, { recursive: true, force: true });
  await mkdir(installDir, { recursive: true });

  switch (tool.bundle.format) {
    case "zip":
      await extractZip(bytes, installDir);
      return;
    default:
      throw new Error(`Unsupported archive format: ${tool.bundle.format}`);
  }
}

export async function removeInstalledToolDirectory(installDir: string) {
  if (!existsSync(installDir)) {
    return;
  }

  await rm(installDir, { recursive: true, force: true });
}

async function readAsset(url: string) {
  if (url.startsWith("file://")) {
    return new Uint8Array(await Bun.file(fileURLToPath(url)).arrayBuffer());
  }

  if (!url.includes("://")) {
    return new Uint8Array(await Bun.file(url).arrayBuffer());
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`asset request failed with ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array) {
  const digestInput = new Uint8Array(bytes.length);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function extractZip(bytes: Uint8Array, installDir: string) {
  const entries = unzipSync(bytes);

  for (const [relativePath, contents] of Object.entries(entries)) {
    const safeRelativePath = normalize(relativePath);

    if (
      safeRelativePath.length === 0 ||
      safeRelativePath.startsWith("..") ||
      safeRelativePath.startsWith("/")
    ) {
      throw new Error(`Unsafe archive path: ${relativePath}`);
    }

    const outputPath = join(installDir, safeRelativePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, contents);
  }
}
