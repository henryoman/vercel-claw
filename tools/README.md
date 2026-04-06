# Shipped Tools

This directory contains the shipped tool folders for `vercel-claw`.

The canonical authoring standard lives in `tools/TOOL_STANDARD.md`.

## Expected Shape

Every real tool should start from this shape:

```txt
tools/<tool-id>/
  README.md
  install.ts            # when install-time behavior exists
  activate.ts           # required for model-facing tools
```

Tool-specific extras depend on the runtime:

- MCP tools also include `mcp.json` and any docs referenced by `docsFile`
- Executable tools include a checked-in runtime entrypoint such as `run.ts`
- Tools may include `skills/` or extra docs such as `about.md`, `basics.md`, or other knowledge files

Use `tools/TOOL_STANDARD.md` as the source of truth for what is required versus optional.

## Contracts

`install.ts` declares deployment-level install behavior that the CLI can execute.

`activate.ts` is the typed runtime contract for the model-facing side of the tool. It should describe:

- the runtime kind (`mcp`, `app`, or `metadata`)
- the default docs or knowledge file to inspect
- default read targets the model can open before using the tool
- capabilities, context hints, and prompt hints
- connection metadata such as MCP server names or fallback transports
- execution operations and arguments for directly callable tools

For directly callable tools, `activate.ts` is not enough by itself. Follow `tools/TOOL_STANDARD.md`: the executable code should own a real validated input schema, preferably in Zod, while `activate.ts` mirrors that surface for the model.

At the deployment level, `deployments/<deployment>/installed-tools.json` decides which of these tools are installed for the repo.

At the instance level, `deployments/<deployment>/instances/<id>/tools.json` decides which installed tools the model is exposed to.
