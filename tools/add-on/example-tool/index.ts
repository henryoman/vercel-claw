import { defineToolModule, type ShippedToolRuntimeSpec } from "../../manifest-types";

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "example-tool",
  label: "Example Tool",
  runtime: "metadata",
  docsFile: "README.md",
  description: "Reference folder showing the standardized shipped tool module layout.",
  defaultReadTargets: [
    "tools/add-on/example-tool/README.md",
    "tools/add-on/example-tool/basics.md",
    "tools/add-on/example-tool/mcp.json",
  ],
  capabilities: [
    "Minimal example of the tool module contract",
    "Reference docs for README plus supporting files",
    "Template metadata for future shipped tools",
  ],
  contextHints: [
    "Use this folder as a reference when adding a new tool module.",
    "Keep the example simple and aligned with the current standard.",
  ],
  promptHints: [
    "Prefer index.ts as the single entrypoint for tool metadata.",
    "Use README.md as the first read target for examples.",
  ],
};

const exampleToolModule = defineToolModule({
  installSpec: null,
  runtimeSpec,
});

export default exampleToolModule;
