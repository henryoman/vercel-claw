<p align="center">
  <img src="./public/logo.webp" alt="vercel-claw" width="720" />
</p>

# vercel-claw

<p align="center">
  <a href="https://bun.sh"><img alt="Bun 1.3.11" src="https://img.shields.io/badge/Bun-1.3.11-000000?style=flat-square&logo=bun&logoColor=white" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript 6.0.2" src="https://img.shields.io/badge/TypeScript-6.0.2-3178C6?style=flat-square&logo=typescript&logoColor=white" /></a>
  <a href="https://nextjs.org"><img alt="Next.js 16.2.2" src="https://img.shields.io/badge/Next.js-16.2.2-000000?style=flat-square&logo=next.js&logoColor=white" /></a>
  <a href="https://react.dev"><img alt="React 19.2.4" src="https://img.shields.io/badge/React-19.2.4-149ECA?style=flat-square&logo=react&logoColor=white" /></a>
  <a href="https://convex.dev"><img alt="Convex 1.34.1" src="https://img.shields.io/badge/Convex-1.34.1-F15A29?style=flat-square&logo=convex&logoColor=white" /></a>
  <a href="https://ai-sdk.dev"><img alt="AI SDK 6.0.146" src="https://img.shields.io/badge/AI%20SDK-6.0.146-111111?style=flat-square&logo=vercel&logoColor=white" /></a>
</p>

## What This Is

`vercel-claw` is a personal Vercel-native agent control plane.

There is no public download yet. The app combines a Vercel-hosted control plane, Convex-backed runtime state, and real tool execution inside persistent per-instance Vercel sandboxes.

## Road To `0.0.0`

- [x] Bun workspace with app, CLI, and shared core package
- [x] Next.js web app as the control plane
- [x] Convex-backed runtime state and metadata
- [x] Per-instance persistent sandbox execution
- [x] Repo-owned deployment config under `deployments/`
- [x] Shipped tool manifest system under `tools/`
- [ ] tighten the bootstrap/setup flow
- [ ] finish the first full personal deployment flow
- [ ] lock down the runtime and tool contract for `0.0.0`
- [ ] improve docs for instance lifecycle and tool authoring
- [ ] ship a real first release instead of repo-only setup

## Architecture

Repo layout:
- `apps/vercel-claw`: the deployed Next.js app and API surface
- `apps/agent-studio/cli`: the local bootstrap, sync, and deploy CLI
- `apps/agent-studio/core`: shared contracts, manifests, and constants
- `deployments/`: repo-owned deployment, instance, tool, and context config
- `tools/`: shipped tools and their manifests

System split:
- the web app is the control plane
- Convex is the source of truth
- sandboxes are the execution layer

That split matters. The app does not pretend to be the machine. It reads runtime config, handles chat and APIs, records runs and artifacts, and decides what each instance can do. The sandbox is where commands and tool execution actually happen.

Each deployed instance gets its own persistent sandbox. Each thread gets its own working directory inside that sandbox. Tool exposure is synced from repo config instead of being invented ad hoc at runtime.

## How `tools/` Works

`tools/` is the shipped tool source of truth.

Each tool directory is the repo-owned definition of a tool: docs for the model, the model-facing contract in `activate.ts`, optional install behavior in `install.ts`, and runtime code such as `run.ts` when the tool is directly executable.

The basic idea is:
- `tools/<tool-id>/activate.ts` tells the model what the tool is, when to use it, and which operations exist
- tool docs explain usage boundaries and examples
- executable tools provide real runtime code and validated inputs
- deployment config decides which tools are installed for a deployment and which installed tools are exposed to an instance

So `tools/` is not just docs. It is the checked-in contract and implementation surface for shipped tools.

## How Deployment Editing Works

The deployment is repo-owned first, then synced into Convex.

You edit deployment state in two ways:
- edit files under `deployments/` directly for shared defaults, shared context, instance config, and per-instance tool/context overrides
- use the CLI to change the deployment/tool state in a structured way

The main CLI flow is:
- `vercel-claw init` / `vercel-claw setup`: creates the editable deployment area and lets you choose shipped tools
- `vercel-claw tool install <id>`: installs a shipped tool into deployment state and local cache
- `vercel-claw tool activate <id> --instance <id>`: exposes an installed tool to one instance
- `vercel-claw tool deactivate <id> --instance <id>`: removes a tool from one instance
- `vercel-claw sync`: pushes the repo-owned deployment and instance state into Convex

In short: the CLI helps write and manage deployment config, but `deployments/` remains the human-editable source of truth.

## Why Convex

Convex provides durable, typed agent state without bolting together a database and a separate state layer.

It is the place to keep deployments, instances, threads, messages, settings, artifacts, and run history in one backend model. That is much cleaner than spreading state across JSON files, shell history, ad hoc database tables, and process memory.

It also fits the workflow:
- the CLI can sync repo-owned deployment config into one source of truth
- the app can read and update the same state model
- the runtime can persist run history and artifacts without inventing another state layer

## VPS Vs This

A normal VPS agent usually turns into one mutable box where the app, the runtime, the tools, the working files, and the state all blur together.

`vercel-claw` keeps those concerns separate:
- repo files define deployment config
- Convex stores durable state
- Vercel serves the actual control plane
- sandboxes run the tools and shell work

Why that is better here:
- cleaner isolation between instances
- less snowflake machine state
- clearer run history and artifact tracking
- easier to reason about than one pet server with everything mixed together

The point is not "VPS bad." The point is that a personal agent should still have explicit state, explicit runtime boundaries, and a real control plane.
