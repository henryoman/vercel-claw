# Shipped Tools

This directory contains the shipped tool folders for `vercel-claw`.

Every tool folder should follow the same shape:

```txt
packages/tools/<tool-id>/
  README.md
  install.ts
  activate.ts
  mcp.json
  skills/
    README.md
  knowledge/
    README.md
```

Use `packages/tools/example-tool/` as the reference layout.

`install.ts` declares deployment-level install behavior that the CLI can execute.

`activate.ts` is the typed runtime contract for the model-facing side of the tool. It should describe:

- the runtime kind (`mcp`, `app`, or metadata-only)
- the default docs or knowledge file to inspect
- default read targets the model can open before using the tool
- capabilities, context hints, and prompt hints
- connection metadata such as MCP server names or fallback transports

At the deployment level, `deployments/<deployment>/installed-tools.json` decides which of these tools are installed for the repo.

At the instance level, `deployments/<deployment>/instances/<id>/tools.json` decides which installed tools the model is exposed to.
