import { createInterface } from "node:readline/promises";

export async function promptForText(args: {
  label: string;
  help?: string;
  defaultValue?: string;
  initialValue?: string;
  secret?: boolean;
}) {
  const fallback = args.initialValue ?? args.defaultValue ?? "";

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return fallback;
  }

  if (args.help) {
    console.log(args.help);
  }

  const suffix = fallback.length > 0 && !args.secret ? ` [${fallback}]` : "";
  const prompt = `${args.label}${suffix}: `;
  if (args.secret) {
    const value = await promptForSecret(prompt);
    return value.length > 0 ? value : fallback;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await rl.question(prompt)).trim();
    return answer.length > 0 ? answer : fallback;
  } finally {
    rl.close();
  }
}

export async function promptForConfirm(args: {
  label: string;
  defaultValue?: boolean;
}) {
  const fallback = args.defaultValue ?? true;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return fallback;
  }

  const suffix = fallback ? " [Y/n]" : " [y/N]";
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = (await rl.question(`${args.label}${suffix}: `)).trim().toLowerCase();
    if (answer.length === 0) {
      return fallback;
    }

    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function promptForSecret(label: string) {
  return await new Promise<string>((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdout.write("\n");
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString();

      if (key === "\u0003") {
        cleanup();
        process.exit(1);
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(value.trim());
        return;
      }

      if (key === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
        }
        return;
      }

      if (key.startsWith("\u001b")) {
        return;
      }

      value += key;
    };

    stdout.write(label);
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on("data", onData);
  });
}
