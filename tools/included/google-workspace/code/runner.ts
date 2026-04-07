import { execFile } from "node:child_process";
import type { GoogleWorkspaceCommandRequest } from "./commands";

const GWS_BINARY = "gws";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_BUFFER_BYTES = 4 * 1024 * 1024;

export interface GoogleWorkspaceCommandResult {
  readonly command: string[];
  readonly stdout: string;
  readonly stderr: string;
  readonly format: "json" | "text";
  readonly data: unknown | null;
}

export async function runGoogleWorkspaceCommand(
  request: GoogleWorkspaceCommandRequest,
): Promise<GoogleWorkspaceCommandResult> {
  const command = [GWS_BINARY, ...request.args];
  const result = await runHostCommand(GWS_BINARY, request.args);

  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || "Unknown gws failure.";
    throw new Error(`${command.join(" ")} failed: ${detail}`);
  }

  const parsedJson = request.expectJson ? tryParseJson(result.stdout) : null;

  return {
    command,
    stdout: result.stdout,
    stderr: result.stderr,
    format: parsedJson === null ? "text" : "json",
    data: parsedJson,
  };
}

function tryParseJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function runHostCommand(command: string, args: string[]) {
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolveCommand, rejectCommand) => {
    execFile(
      command,
      args,
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: DEFAULT_TIMEOUT_MS,
        maxBuffer: DEFAULT_MAX_BUFFER_BYTES,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolveCommand({
            exitCode: 0,
            stdout,
            stderr,
          });
          return;
        }

        const commandError = error as NodeJS.ErrnoException & { code?: number | string };
        if (commandError.code === "ENOENT") {
          rejectCommand(
            new Error(
              `Required binary "${command}" is not available on PATH. Install the Google Workspace CLI first.`,
            ),
          );
          return;
        }

        resolveCommand({
          exitCode: typeof commandError.code === "number" ? commandError.code : 1,
          stdout,
          stderr: stderr || commandError.message,
        });
      },
    );
  });
}
