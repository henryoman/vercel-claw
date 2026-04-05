import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface InstalledToolStateEntry {
  id: string;
  version: string;
  installedAt: string;
  installDir: string;
  bundleUrl: string;
}

export interface InstalledToolState {
  version: number;
  installedTools: Record<string, InstalledToolStateEntry>;
}

export const CLI_HOME_ENV = "VERCEL_CLAW_HOME";

export function getCliHome() {
  return process.env[CLI_HOME_ENV] || join(homedir(), ".vercel-claw");
}

export function getRegistryCachePath() {
  return join(getCliHome(), "registry-cache", "tool-registry.json");
}

export function getInstalledToolStatePath() {
  return join(getCliHome(), "state", "installed-tools.json");
}

export function getToolsHome() {
  return join(getCliHome(), "tools");
}

export function getToolVersionDir(toolId: string, version: string) {
  return join(getToolsHome(), toolId, version);
}

export function createEmptyInstalledToolState(): InstalledToolState {
  return {
    version: 1,
    installedTools: {},
  };
}

export async function readInstalledToolState() {
  const path = getInstalledToolStatePath();
  if (!existsSync(path)) {
    return createEmptyInstalledToolState();
  }

  const raw = (await Bun.file(path).json()) as Partial<InstalledToolState>;
  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    installedTools:
      raw.installedTools && typeof raw.installedTools === "object" ? raw.installedTools : {},
  } satisfies InstalledToolState;
}

export async function writeInstalledToolState(state: InstalledToolState) {
  const path = getInstalledToolStatePath();
  await mkdir(join(getCliHome(), "state"), { recursive: true });
  await Bun.write(path, `${JSON.stringify(state, null, 2)}\n`);
}

export async function ensureCliHome() {
  await mkdir(getCliHome(), { recursive: true });
  await mkdir(join(getCliHome(), "registry-cache"), { recursive: true });
  await mkdir(getToolsHome(), { recursive: true });
  await mkdir(join(getCliHome(), "state"), { recursive: true });
}
