import { defineToolModule, type ShippedToolRuntimeSpec } from "../../manifest-types";

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "toast",
  label: "Toast",
  runtime: "metadata",
  docsFile: "README.md",
  description: "Reference note for Toast-related tool dependencies.",
  defaultReadTargets: [
    "tools/add-on/toast/README.md",
    "tools/add-on/toast/required-tools.txt",
  ],
  capabilities: [
    "Placeholder dependency note for Toast workflows",
  ],
  contextHints: [
    "This folder is draft metadata only and does not expose a runtime tool.",
  ],
  promptHints: [
    "Read the dependency note before claiming Toast support exists.",
  ],
};

const toastToolModule = defineToolModule({
  installSpec: null,
  runtimeSpec,
});

export default toastToolModule;
