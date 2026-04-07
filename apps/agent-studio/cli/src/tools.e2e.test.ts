import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { zipSync } from "fflate";

const CLI_ENTRYPOINT = resolve(import.meta.dir, "index.ts");

type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type ToolFixture = {
  id: string;
  version: string;
  archiveName: string;
  bundleBytes: Uint8Array;
  sha256: string;
};

const tempPaths: string[] = [];
afterEach(async () => {
  await Promise.all(
    tempPaths.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

describe("tool CLI end-to-end", () => {
  test("scaffolds a new workspace with the create command", async () => {
    const parentRoot = await createTempDir("vercel-claw-create-");
    const targetRoot = join(parentRoot, "my-agent");

    const createResult = await runCli(parentRoot, ["create", "my-agent", "--defaults"], {});

    expect(createResult.exitCode).toBe(0);
    expect(existsSync(join(targetRoot, "vercel-claw.config.json"))).toBe(true);
    expect(existsSync(join(targetRoot, "apps", "vercel-claw", ".env.local"))).toBe(true);
    expect(existsSync(join(targetRoot, "deployments", "deployment.json"))).toBe(true);

    const config = await Bun.file(join(targetRoot, "vercel-claw.config.json")).json();
    expect(config).toMatchObject({
      name: "my-agent",
      enabledSurfaceIds: ["web"],
    });

    const packageJson = await Bun.file(join(targetRoot, "package.json")).json();
    expect(packageJson).toMatchObject({
      name: "my-agent",
    });

    const settingsResult = await runCli(targetRoot, ["settings", "show"], {});
    expect(settingsResult.exitCode).toBe(0);
    expect(settingsResult.stdout).toContain("Name: my-agent");
    expect(settingsResult.stdout).toContain("Surfaces: web");
  });

  test("lists registry tools, installs a downloaded bundle, and prints the installed path", async () => {
    const workspaceRoot = await createWorkspace();
    const cliHome = await createTempDir("vercel-claw-home-");
    const fixture = await createToolFixture({ version: "1.0.0" });
    const registry = await createRegistryFixture(fixture);

    const listResult = await runCli(workspaceRoot, ["tools", "list"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain("tiny-tool");
    expect(listResult.stdout).toContain("status: not installed");

    const infoResult = await runCli(workspaceRoot, ["tools", "info", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(infoResult.exitCode).toBe(0);
    expect(infoResult.stdout).toContain(`bundleUrl: ${registry.bundleUrl}`);
    expect(infoResult.stdout).toContain(`checksum: ${fixture.sha256}`);

    const installResult = await runCli(workspaceRoot, ["tools", "install", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(installResult.exitCode).toBe(0);
    expect(installResult.stdout).toContain("Installed tool: tiny-tool");

    const installedRoot = join(cliHome, "tools", "tiny-tool", "1.0.0", "tiny-tool");
    expect(existsSync(join(installedRoot, "README.md"))).toBe(true);
    expect(await Bun.file(join(installedRoot, "README.md")).text()).toContain("Tiny test tool");

    const state = await Bun.file(join(cliHome, "state", "installed-tools.json")).json();
    expect(state).toMatchObject({
      installedTools: {
        "tiny-tool": {
          id: "tiny-tool",
          version: "1.0.0",
        },
      },
    });

    const workspaceInstalled = await Bun.file(join(workspaceRoot, "deployments", "installed-tools.json")).json();
    expect(workspaceInstalled).toMatchObject({
      installedToolIds: ["tiny-tool"],
    });

    const pathResult = await runCli(workspaceRoot, ["tools", "path", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(pathResult.exitCode).toBe(0);
    expect(pathResult.stdout.trim()).toBe(installedRoot);
  });

  test("activates, deactivates, updates, and removes an installed tool cleanly", async () => {
    const workspaceRoot = await createWorkspace();
    const cliHome = await createTempDir("vercel-claw-home-");
    const fixtureV1 = await createToolFixture({ version: "1.0.0" });
    const fixtureV2 = await createToolFixture({ version: "1.0.1" });
    const registry = await createRegistryFixture(fixtureV1);

    const installV1 = await runCli(workspaceRoot, ["tools", "install", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });
    expect(installV1.exitCode).toBe(0);

    const activateResult = await runCli(
      workspaceRoot,
      ["tool", "activate", "tiny-tool", "--instance", "001"],
      {
        VERCEL_CLAW_HOME: cliHome,
        VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
      },
    );

    expect(activateResult.exitCode).toBe(0);
    const instanceToolsAfterActivate = await Bun.file(
      join(workspaceRoot, "deployments", "instances", "001", "tools.json"),
    ).json();
    expect(instanceToolsAfterActivate).toMatchObject({
      exposedToolIds: ["tiny-tool"],
    });

    await registry.setFixture(fixtureV2);

    const updateResult = await runCli(workspaceRoot, ["tools", "update", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(updateResult.exitCode).toBe(0);
    expect(updateResult.stdout).toContain("Updated tools:");
    expect(updateResult.stdout).toContain("tiny-tool -> 1.0.1");
    expect(existsSync(join(cliHome, "tools", "tiny-tool", "1.0.0"))).toBe(false);
    expect(existsSync(join(cliHome, "tools", "tiny-tool", "1.0.1", "tiny-tool", "README.md"))).toBe(true);

    const deactivateResult = await runCli(
      workspaceRoot,
      ["tool", "deactivate", "tiny-tool", "--instance", "001"],
      {
        VERCEL_CLAW_HOME: cliHome,
        VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
      },
    );

    expect(deactivateResult.exitCode).toBe(0);
    const instanceToolsAfterDeactivate = await Bun.file(
      join(workspaceRoot, "deployments", "instances", "001", "tools.json"),
    ).json();
    expect(instanceToolsAfterDeactivate).toMatchObject({
      exposedToolIds: [],
    });

    const removeResult = await runCli(workspaceRoot, ["tools", "remove", "tiny-tool"], {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    });

    expect(removeResult.exitCode).toBe(0);
    expect(existsSync(join(cliHome, "tools", "tiny-tool", "1.0.1"))).toBe(false);

    const workspaceInstalledAfterRemove = await Bun.file(
      join(workspaceRoot, "deployments", "installed-tools.json"),
    ).json();
    expect(workspaceInstalledAfterRemove).toMatchObject({
      installedToolIds: [],
    });
  });

  test("uses the cached registry when the remote registry becomes unavailable", async () => {
    const workspaceRoot = await createWorkspace();
    const cliHome = await createTempDir("vercel-claw-home-");
    const fixture = await createToolFixture({ version: "1.0.0" });
    const registry = await createRegistryFixture(fixture);
    const env = {
      VERCEL_CLAW_HOME: cliHome,
      VERCEL_CLAW_TOOL_REGISTRY_URL: registry.registryUrl,
    };

    const firstResult = await runCli(workspaceRoot, ["tools", "list"], env);
    expect(firstResult.exitCode).toBe(0);
    expect(existsSync(join(cliHome, "registry-cache", "tool-registry.json"))).toBe(true);

    await registry.removeRegistry();

    const secondResult = await runCli(workspaceRoot, ["tools", "list"], env);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.stdout).toContain("tiny-tool");
  });
});

async function createWorkspace() {
  const root = await createTempDir("vercel-claw-workspace-");
  await writeFile(join(root, "vercel-claw.config.json"), "{}\n");
  return root;
}

async function createTempDir(prefix: string) {
  const path = await mkdtemp(join(tmpdir(), prefix));
  tempPaths.push(path);
  return path;
}

async function createToolFixture(options: { version: string }): Promise<ToolFixture> {
  const id = "tiny-tool";
  const archiveName = `${id}-${options.version}.zip`;
  const bundleBytes = zipSync(
    {
      [`${id}/README.md`]: textBytes(`Tiny test tool ${options.version}\n`),
      [`${id}/index.ts`]: textBytes(`export const version = "${options.version}";\n`),
      [`${id}/mcp.json`]: textBytes(`{"id":"${id}","version":"${options.version}"}\n`),
    },
    { level: 9 },
  );

  return {
    id,
    version: options.version,
    archiveName,
    bundleBytes,
    sha256: await sha256Hex(bundleBytes),
  };
}

async function runCli(cwd: string, args: string[], env: Record<string, string>) {
  const command = Bun.spawn({
    cmd: ["bun", CLI_ENTRYPOINT, ...args],
    cwd,
    env: {
      ...process.env,
      ...env,
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
    command.exited,
  ]);

  return {
    exitCode,
    stdout,
    stderr,
  } satisfies CliResult;
}

async function createRegistryFixture(initialFixture: ToolFixture) {
  const root = await createTempDir("vercel-claw-registry-");
  const registryPath = join(root, "tool-registry.json");
  let fixture = initialFixture;

  const writeFixture = async () => {
    const bundlePath = join(root, fixture.archiveName);
    await Bun.write(bundlePath, fixture.bundleBytes);
    await Bun.write(
      registryPath,
      `${JSON.stringify(
        {
          version: 1,
          generatedAt: "2026-04-06T00:00:00.000Z",
          sourceRepo: "https://example.test/vercel-claw",
          tools: [
            {
              id: fixture.id,
              version: fixture.version,
              label: "Tiny Tool",
              description: "Small downloaded fixture for CLI integration tests.",
              kind: "hybrid",
              runtime: "metadata",
              activationScope: "instance",
              memberToolIds: [],
              docsFile: "README.md",
              mcpServerName: "tiny-tool",
              defaultReadTargets: [`tools/${fixture.id}/README.md`],
              capabilities: ["Exercise tool downloads in a tiny package."],
              contextHints: ["This tool is only for CLI integration tests."],
              promptHints: ["Keep the bundle small."],
              requiredEnvVars: [],
              optionalEnvVars: [],
              dependencies: [],
              installCommands: [],
              verifyCommands: [],
              bundle: {
                url: pathToFileURL(bundlePath).toString(),
                sha256: fixture.sha256,
                format: "zip",
                sizeBytes: fixture.bundleBytes.byteLength,
              },
              metadata: {
                rootDirectory: fixture.id,
                mcpConfigPath: `${fixture.id}/mcp.json`,
                knowledgeDirectory: null,
                skillsDirectory: null,
                readmePath: `${fixture.id}/README.md`,
              },
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
  };

  await writeFixture();

  return {
    registryUrl: pathToFileURL(registryPath).toString(),
    get bundleUrl() {
      return pathToFileURL(join(root, fixture.archiveName)).toString();
    },
    async setFixture(nextFixture: ToolFixture) {
      fixture = nextFixture;
      await writeFixture();
    },
    async removeRegistry() {
      await rm(registryPath, { force: true });
    },
  };
}

async function sha256Hex(bytes: Uint8Array) {
  const digestInput = new Uint8Array(bytes.length);
  digestInput.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function textBytes(value: string) {
  return new TextEncoder().encode(value);
}
