import { existsSync } from "node:fs";

export function parseEnvValues(lines: string[]) {
  return new Map(
    lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key ?? "", rest.join("=").trim()] as const;
      }),
  );
}

export async function readEnvMap(path: string) {
  if (!existsSync(path)) {
    return new Map<string, string>();
  }

  return parseEnvValues((await Bun.file(path).text()).split(/\r?\n/));
}

export function mergeEnvTemplate(current: string, template: string) {
  const currentLines = current.split(/\r?\n/);
  const existingKeys = new Set(
    currentLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => line.split("=")[0] ?? ""),
  );

  const missingLines = template
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .filter((line) => !existingKeys.has(line.split("=")[0] ?? ""));

  if (missingLines.length === 0) {
    return current;
  }

  return `${current.trimEnd()}\n\n# Added by vercel-claw setup\n${missingLines.join("\n")}\n`;
}

export function upsertEnvValues(current: string, values: Record<string, string>) {
  const lines = current.length > 0 ? current.split(/\r?\n/) : [];
  const nextLines = [...lines];
  const lineIndexes = new Map<string, number>();

  for (const [index, line] of nextLines.entries()) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const key = trimmed.split("=")[0] ?? "";
    if (!lineIndexes.has(key)) {
      lineIndexes.set(key, index);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    if (lineIndexes.has(key)) {
      nextLines[lineIndexes.get(key)!] = `${key}=${value}`;
    } else {
      nextLines.push(`${key}=${value}`);
    }
  }

  return `${nextLines.filter((line, index, all) => !(index === all.length - 1 && line.length === 0)).join("\n")}\n`;
}

export function hasConfiguredValue(envValues: Map<string, string>, key: string) {
  return (envValues.get(key) ?? "").length > 0;
}
