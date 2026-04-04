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

## Deployment Shape

1. Run `bun run cli -- init` to select CLIs and toolkits, then generate config and env scaffolding.
2. Run `bun run cli -- doctor` to see missing binaries and missing env keys.
3. Add `OPENAI_API_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and any selected toolkit keys in `apps/vercel-claw/.env.local`.
4. Run `bun run cli -- dev` for local Next.js + Convex development.
5. Run `bun run cli -- deploy --prod` to deploy Convex first, then the Vercel app.
