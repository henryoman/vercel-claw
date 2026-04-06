<p align="center">
  <img src="./public/logo.webp" alt="vercel-claw" width="720" />
</p>

# vercel-claw

Personal Vercel operator built as a Bun workspace with a Next.js app, a Bun CLI, and Convex-backed deployment state.

<p align="center">
  <img alt="Bun 1.3.11" src="https://img.shields.io/badge/Bun-1.3.11-000000?style=flat-square&logo=bun&logoColor=white" />
  <img alt="TypeScript 6.0.2" src="https://img.shields.io/badge/TypeScript-6.0.2-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Next.js 15.5.14" src="https://img.shields.io/badge/Next.js-15.5.14-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img alt="React 19.2.4" src="https://img.shields.io/badge/React-19.2.4-149ECA?style=flat-square&logo=react&logoColor=white" />
  <img alt="Convex 1.34.1" src="https://img.shields.io/badge/Convex-1.34.1-F15A29?style=flat-square&logo=convex&logoColor=white" />
  <img alt="AI SDK 7.0.0-beta.64" src="https://img.shields.io/badge/AI%20SDK-7.0.0--beta.64-111111?style=flat-square&logo=vercel&logoColor=white" />
</p>

## Stack

- Bun workspace
- TypeScript
- Next.js app
- React UI
- Convex backend/state
- Vercel AI SDK

This repo is a Bun workspace monorepo:

- `apps/vercel-claw`: the deployable Next.js app for personal Vercel installs
- `apps/agent-studio/cli`: the bootstrap and operator CLI for setup, local dev, and deploy flows
- `apps/agent-studio/core`: shared config, manifests, and core constants

Convex is treated as the source of truth for agent state, run history, artifacts, and deployment metadata. The app is the UI surface deployed to Vercel and the control plane for tool execution. Enabled CLI, shell, MCP, and browser tools execute inside persistent per-instance Vercel sandboxes. The CLI is the local bootstrap, sync, dev, and deploy surface a user installs or runs with Bun.

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
bun run cli -- sync
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

- `deployments/deployment.json` holds deployment metadata
- `deployments/shared` contains deployment-wide defaults shared by every instance
- `deployments/installed-tools.json` is the deployment-level source of truth for which tools/plugins are enabled for the deployed sandbox runtime
- `deployments/shared/context.json` is the repo-owned shared context file
- `deployments/instances/000` contains per-instance overrides for the first instance
- `deployments/instances/000/tools.json` is the central source of truth for which tools the model sees in that instance
- `deployments/instances/000/context.json` is the repo-owned per-instance context override
- shipped tool source code lives in `tools/`
- the CLI controls deployment-level tool availability and instances only decide which deployed tools to expose
- `bun run cli -- sync` resolves shared + instance tool/context state and pushes it into Convex
- the deployed app resumes one persistent sandbox per instance and gives each thread its own working directory inside that sandbox
- shared runtime code still lives in `apps/`, `packages/`, and `connectors/`

Each instance can declare gate settings in `instance.json`, and the CLI syncs that deployment-owned metadata into Convex alongside tools and context.

## Deployment Shape

1. Run `bun run cli -- init` to select CLIs and toolkits, then generate config and env scaffolding.
2. Run `bun run cli -- doctor` to see missing binaries and missing env keys.
3. Add `OPENAI_API_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, and any selected toolkit keys in `apps/vercel-claw/.env.local`.
4. Edit `deployments/shared` for deployment-wide context, defaults, and toolsets.
5. Edit `deployments/instances/000` for per-instance tools and context overrides.
6. Run `bun run cli -- sync` after the Convex deployment is available.
7. Run `bun run cli -- dev` for local Next.js + Convex development.
8. Run `bun run cli -- deploy --prod` to deploy Convex, sync runtime config, then deploy the Vercel app.
