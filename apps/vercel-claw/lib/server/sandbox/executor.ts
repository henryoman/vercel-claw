import "server-only";

import type { Sandbox } from "@vercel/sandbox";

export interface SandboxCommandResult {
  commandId: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface SandboxCommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  detached?: boolean;
  sudo?: boolean;
  signal?: AbortSignal;
}

export async function runSandboxCommand(
  sandbox: Sandbox,
  command: string,
  args: string[] = [],
  options: SandboxCommandOptions = {},
): Promise<SandboxCommandResult> {
  if (options.detached) {
    const detachedCommand = await sandbox.runCommand({
      cmd: command,
      args,
      cwd: options.cwd,
      env: options.env,
      sudo: options.sudo,
      detached: true,
      signal: options.signal,
    });

    return {
      commandId: detachedCommand.cmdId,
      exitCode: null,
      stdout: "",
      stderr: "",
    };
  }

  const finishedCommand = await sandbox.runCommand({
    cmd: command,
    args,
    cwd: options.cwd,
    env: options.env,
    sudo: options.sudo,
    signal: options.signal,
  });

  const [stdout, stderr] = await Promise.all([finishedCommand.stdout(), finishedCommand.stderr()]);

  return {
    commandId: finishedCommand.cmdId,
    exitCode: finishedCommand.exitCode,
    stdout,
    stderr,
  };
}
