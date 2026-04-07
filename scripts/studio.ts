#!/usr/bin/env bun
/// <reference types="bun" />

const entrypoint = toPath(new URL("../apps/agent-studio/cli/src/index.ts", import.meta.url));
const child = Bun.spawn({
  cmd: ["bun", entrypoint, ...Bun.argv.slice(2)],
  cwd: process.cwd(),
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await child.exited;
process.exit(exitCode);

function toPath(url: URL) {
  const pathname = decodeURIComponent(url.pathname);
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
