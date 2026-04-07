# Google Workspace

This folder is the standardized entrypoint for Google Workspace CLI guidance in `vercel-claw`.

It now includes:

- install and verification notes for the `gws` CLI
- command discovery guidance for Gmail and Calendar first
- workflow skills for common Google Workspace tasks
- typed server-side command builders in `code/` plus app-level Zod tool registration for Gmail send/reply/forward/read/triage and Calendar agenda/insert

Start with `basics.md` before suggesting any command. For write operations, inspect the relevant `gws schema ...` output or the matching skill file before proposing flags or request bodies.
