import { defineToolModule, type ShippedToolRuntimeSpec } from "../../manifest-types";

const runtimeSpec: ShippedToolRuntimeSpec = {
  id: "finance-query",
  label: "Finance Query",
  runtime: "metadata",
  docsFile: "README.md",
  description: "Reference docs for the hosted Finance Query API, CLI, and MCP server.",
  defaultReadTargets: [
    "tools/add-on/finance-query/README.md",
    "tools/add-on/finance-query/README (5).md",
  ],
  capabilities: [
    "Hosted financial data API reference",
    "CLI and GraphQL quickstart notes",
    "MCP endpoint discovery for future integrations",
  ],
  contextHints: [
    "Treat this folder as external reference material, not an installed shipped tool.",
  ],
  promptHints: [
    "Start with the local README summary before diving into the imported upstream doc dump.",
  ],
};

const financeQueryToolModule = defineToolModule({
  installSpec: null,
  runtimeSpec,
});

export default financeQueryToolModule;
