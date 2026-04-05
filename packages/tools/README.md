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

At the deployment level, `deployments/<deployment>/installed-tools.json` decides which of these tools are installed for the repo.

At the instance level, `deployments/<deployment>/instances/<id>/tools.json` decides which installed tools the model is exposed to.
