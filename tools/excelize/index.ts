import { defineToolModule, type ShippedToolRuntimeSpec } from "../manifest-types";

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "excelize",
  label: "Excelize",
  runtime: "metadata",
  docsFile: "README.md",
  description: "Scratchpad docs for the Excelize Go library and local install notes.",
  defaultReadTargets: [
    "tools/excelize/README.md",
    "tools/excelize/install.sh",
    "tools/excelize/code/createdocument.go",
  ],
  capabilities: [
    "Excelize dependency note",
    "Minimal Go spreadsheet example",
    "Reference material for future spreadsheet tooling",
  ],
  contextHints: [
    "Treat this folder as reference material, not a shipped runtime integration.",
  ],
  promptHints: [
    "Read the sample code before describing how the spreadsheet example works.",
  ],
};

const excelizeToolModule = defineToolModule({
  installSpec: null,
  runtimeSpec,
});

export default excelizeToolModule;
