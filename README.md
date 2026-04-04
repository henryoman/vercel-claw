# vercel-claw

The right move for this repo is a small Bun workspace monorepo:

- `apps/vercel-claw`: the deployable Next.js app for personal Vercel installs
- `apps/cli`: the bootstrap and operator CLI for setup, local dev, and deploy flows
- `packages/core`: shared config, env templates, and constants used by both

Convex is treated as the source of truth for agent state, run history, artifacts, and deployment metadata. The app is the UI surface deployed to Vercel. The CLI is the local operator surface a user installs or runs with Bun.

## Install

```bash
bun install
```

## Workspace Commands

```bash
bun run dev
bun run build
bun run check
```

## CLI Commands

```bash
bun run cli -- help
bun run cli -- init
bun run cli -- setup
bun run cli -- doctor
bun run cli -- dev
bun run cli -- deploy --prod
```

`init`/`setup` now run an interactive checklist in the terminal:

- Space toggles a checkbox
- Enter confirms the selection
- One checklist captures which local CLIs this machine should have
- One checklist captures which external toolkits this personal agent should support

The selected CLIs and toolkits are saved in `vercel-claw.config.json`, and `doctor` validates:

- Whether each selected CLI is installed locally
- Which toolkit-specific env vars are still missing
- Whether the app and Convex directories are in place

## Editable Deployment Layout

The human-editable control plane now lives under `deployments/`.

- `deployments/default/shared` contains deployment-wide defaults shared by every instance
- `deployments/default/instances/000` contains per-instance overrides for the first instance
- shared runtime code still lives in `apps/`, `packages/`, `tools/`, and `connectors/`

Each instance can declare a gate mode in `instance.json`:

- `"member"` is the safe default and is intended for authenticated access
- `"password"` should only reference a secret name like `passwordSecretName`; do not commit hashes or plaintext passwords to the repo
- `"public"` is only for intentionally open instances

## Deployment Shape

1. Run `bun run cli -- init` to select CLIs and toolkits, then generate config and env scaffolding.
2. Run `bun run cli -- doctor` to see missing binaries and missing env keys.
3. Add `OPENAI_API_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and any selected toolkit keys in `apps/vercel-claw/.env.local`.
4. Edit `deployments/default/shared` for deployment-wide prompts, defaults, and toolsets.
5. Edit `deployments/default/instances/000` for per-instance overrides.
6. Run `bun run cli -- dev` for local Next.js + Convex development.
7. Run `bun run cli -- deploy --prod` to deploy Convex first, then the Vercel app.
