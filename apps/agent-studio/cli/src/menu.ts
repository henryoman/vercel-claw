export interface MenuOption {
  value: string;
  label: string;
  hint?: string;
}

export async function promptForChoice(args: {
  title: string;
  help?: string;
  options: MenuOption[];
  initialValue?: string;
}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return args.initialValue ?? args.options[0]?.value ?? "";
  }

  let cursor = Math.max(
    0,
    args.options.findIndex((option) => option.value === args.initialValue),
  );

  return await new Promise<string>((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    const cleanup = () => {
      stdin.off("data", onData);
      if (stdin.isTTY) {
        stdin.setRawMode(false);
      }
      stdout.write("\u001b[?25h");
      stdout.write("\u001b[?1049l");
    };

    const render = () => {
      const lines = ["\u001b[2J\u001b[H", args.title];
      if (args.help) {
        lines.push(args.help);
      }
      lines.push("");

      for (const [index, option] of args.options.entries()) {
        const active = index === cursor;
        const prefix = active ? ">" : " ";
        const label = active ? `\u001b[1m${option.label}\u001b[0m` : option.label;
        lines.push(`${prefix} ${label}`);
        if (option.hint) {
          lines.push(`    ${option.hint}`);
        }
      }

      stdout.write(lines.join("\n"));
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString();

      if (key === "\u0003") {
        cleanup();
        process.exit(1);
      }

      if (key === "\r" || key === "\n") {
        const selected = args.options[cursor]?.value ?? args.initialValue ?? "";
        cleanup();
        resolve(selected);
        return;
      }

      if (key === "\u001b[A" || key === "k") {
        cursor = cursor === 0 ? args.options.length - 1 : cursor - 1;
        render();
        return;
      }

      if (key === "\u001b[B" || key === "j") {
        cursor = cursor === args.options.length - 1 ? 0 : cursor + 1;
        render();
      }
    };

    stdout.write("\u001b[?1049h");
    stdout.write("\u001b[?25l");
    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on("data", onData);
    render();
  });
}
