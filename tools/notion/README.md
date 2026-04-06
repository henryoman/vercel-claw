# Notion

This is the shipped folder for the built-in `notion` tool.

This folder is part of the deployment-level tool library under `packages/tools/notion`.

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
- `mcp.json` for MCP connection metadata
- `skills/` for workflow-oriented docs
- `knowledge/` for tool-specific docs and references
- activation metadata

It should not fetch arbitrary "latest" tool definitions from the internet during activation.
