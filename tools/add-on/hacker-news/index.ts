import { defineToolModule, type ShippedToolRuntimeSpec } from "../../manifest-types";

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "hacker-news",
  label: "Hacker News",
  runtime: "metadata",
  docsFile: "README.md",
  description: "Scratch notes for a possible Hacker News integration.",
  defaultReadTargets: [
    "tools/add-on/hacker-news/README.md",
    "tools/add-on/hacker-news/notes.txt",
  ],
  capabilities: [
    "Placeholder notes for future Hacker News tooling",
  ],
  contextHints: [
    "This folder is a draft placeholder and not a shipped integration.",
  ],
  promptHints: [
    "Read the local notes before assuming any runtime support exists.",
  ],
};

const hackerNewsToolModule = defineToolModule({
  installSpec: null,
  runtimeSpec,
});

export default hackerNewsToolModule;
