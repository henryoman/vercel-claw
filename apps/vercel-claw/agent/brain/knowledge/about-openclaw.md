# OpenClaw

As of April 2026, OpenClaw is an open-source personal AI assistant platform built to give a single user a persistent, tool-using agent they control across desktop and server environments. It is designed around real agent workflows rather than simple chat: multi-provider model support, tool calling, guarded command execution, memory and session management, background tasks, web search, and integrations with web chat and external messaging or collaboration channels.

In the context of this repo, OpenClaw is the closest reference point for the product shape. `vercel-claw` is not OpenClaw itself; it is an OpenClaw-like personal operator adapted for a Vercel deployment model, with Bun for local tooling, Next.js for the app surface, and Convex as the system of record for state, runs, artifacts, and deployment metadata.

more information: https://openclaw.ai/