# Editable Deployment Area

This directory is the human-editable control plane for generated instances.

- `default/shared` contains deployment-wide defaults shared by every instance.
- `default/installed-tools.json` is the deployment-level source of truth for which tools/plugins are installed in the repo.
- `default/shared/context.json` holds repo-owned shared context defaults.
- `default/instances/000` contains per-instance overrides for the first instance.
- `default/instances/000/tools.json` is the central source of truth for which tools the model sees in that instance.
- `default/instances/000/context.json` holds repo-owned per-instance context overrides.
- Shared shipped tool source code lives in `packages/tools/`.
- The CLI installs tools at the deployment level and instances only decide which installed tools to expose.
- Run `vercel-claw sync` after repo edits to push resolved tool/context state into Convex.

Gate configuration is stored in each `instance.json` and synced by the CLI.
