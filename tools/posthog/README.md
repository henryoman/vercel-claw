# PostHog

This is the shipped folder for the built-in `posthog` tool.

This folder contains the stable source-of-truth files for the PostHog MCP setup used by `vercel-claw`.

Use this tool when the model needs PostHog access for:

- project and organization discovery
- custom analytics or HogQL queries
- saved dashboards and insights
- feature flags and experiments
- logs, error tracking, and related debugging workflows
- PostHog product and API docs search

## Recommended Workflow

1. Start with `projects-get` if project scope is unclear.
2. Only use `switch-project` when the user explicitly asks to change the active project.
3. Prefer `query-run` for custom analytics questions and `docs-search` for PostHog product guidance.
4. Use feature-specific MCP tools when the task clearly targets dashboards, insights, flags, experiments, or logs.

## Files

- `mcp.json` describes the local MCP server binding for this shipped tool.
- `knowledge/mcp-docs.md` explains when to use the PostHog MCP server and which tool groups matter most.

For dedicated PostHog connections, current PostHog guidance prefers project-pinned sessions and feature filtering so the model sees only the relevant tool surface.
