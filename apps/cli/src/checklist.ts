export interface ChecklistOption {
  value: string;
  label: string;
  hint?: string;
}

export async function promptForSelections(args: {
  title: string;
  help: string;
  options: ChecklistOption[];
  initialValues: string[];
}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return args.initialValues;
  }

  const selected = new Set(args.initialValues);
  let cursor = 0;

  return await new Promise<string[]>((resolve) => {
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
      const lines = [
        "\u001b[2J\u001b[H",
        `${args.title}`,
        `${args.help}`,
        "",
      ];

      for (const [index, option] of args.options.entries()) {
        const active = index === cursor;
        const checked = selected.has(option.value);
        const prefix = active ? ">" : " ";
        const box = checked ? "[x]" : "[ ]";
        const label = active ? `\u001b[1m${option.label}\u001b[0m` : option.label;
        lines.push(`${prefix} ${box} ${label}`);

        if (option.hint) {
          lines.push(`    ${option.hint}`);
        }
      }

      lines.push("");
      lines.push(`Selected: ${selected.size}`);
      stdout.write(lines.join("\n"));
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString();

      if (key === "\u0003") {
        cleanup();
        process.exit(1);
      }

      if (key === " " || key === "\u001b[Z") {
        const value = args.options[cursor]?.value;
        if (!value) {
          return;
        }

        if (selected.has(value)) {
          selected.delete(value);
        } else {
          selected.add(value);
        }
        render();
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(args.options.filter((option) => selected.has(option.value)).map((option) => option.value));
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
