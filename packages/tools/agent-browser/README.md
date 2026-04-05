# Agent Browser

This shipped tool provides the metadata and install steps for the browser automation integration.

Required files in this folder:

- `install.ts` declares deployment-level install behavior for the CLI.
- `activate.ts` declares runtime-facing activation metadata.
- `mcp.json` stores MCP connection metadata.
- `skills/` holds tool-specific skill content.
- `knowledge/` holds docs and notes the runtime can reference.
# Agent Browser

This is the shipped folder for the built-in `agent-browser` tool.

This folder is part of the deployment-level tool library under `packages/tools/agent-browser`.

Whether the tool is installed for a deployment is controlled by:

```txt
deployments/<deployment>/installed-tools.json
```

Whether an installed tool is exposed to a specific instance is controlled by:

```txt
deployments/<deployment>/instances/<instance-id>/tools.json
```

This folder contains the stable, versioned source-of-truth files for the tool:

- setup/readme docs
- `mcp.json` for MCP/integration metadata
- `skills/` for workflow-oriented docs
- `knowledge/` for tool-specific docs and references
- activation metadata
