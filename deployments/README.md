# Editable Deployment Area

This directory is the human-editable control plane for generated instances.

- `default/shared` contains deployment-wide defaults shared by every instance.
- `default/installed-tools.json` is the deployment-level source of truth for which tools/plugins are enabled for the deployed sandbox runtime.
- `default/shared/context.json` holds repo-owned shared context defaults.
- `default/instances/000` contains per-instance overrides for the first instance.
- `default/instances/000/tools.json` is the central source of truth for which tools the model sees in that instance.
- `default/instances/000/context.json` holds repo-owned per-instance context overrides.
- Shared shipped tool source code lives in `packages/tools/`.
- The CLI controls deployment-level tool availability and instances only decide which deployed tools to expose.
- Run `vercel-claw sync` after repo edits to push resolved tool/context state into Convex.
- The deployed app resumes one persistent sandbox per instance and gives each thread its own working directory inside that sandbox.

Gate configuration is stored in each `instance.json` and synced by the CLI.
