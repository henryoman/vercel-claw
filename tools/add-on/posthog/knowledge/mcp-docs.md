# PostHog MCP Notes

Use the `posthog` MCP server when the user needs live PostHog product data, analytics, release controls, debugging context, schema context, or official PostHog docs.

## Scope First

- Use `organizations-get` and `projects-get` to understand what the current API key can access.
- Treat the current project as the default working scope.
- Only use `switch-project` if the user explicitly asks to change projects.
- When provisioning a dedicated connection, prefer project-pinned sessions and feature filtering so the tool surface is narrower and safer.

## High-Value Tool Groups

### Discovery

- `projects-get`
- `organizations-get`
- `entity-search`
- `docs-search`

Use these first when the task is exploratory or when the exact PostHog object name is unknown.

### Analytics

- `query-run`
- `insights-get-all`
- `insight-get`
- `insight-query`
- `dashboards-get-all`
- `dashboard-get`

Prefer `query-run` for custom analytics. Prefer saved insight or dashboard tools when the user is asking about an existing object.

### Release And Experimentation

- `feature-flag-get-all`
- `feature-flag-get-definition`
- `feature-flags-status-retrieve`
- `feature-flags-user-blast-radius-create`
- `experiment-get-all`
- `experiment-get`
- `experiment-results-get`

Use these when rollout state, blast radius, experiment health, or linked release metadata matters.

### Debugging

- `logs-list-attributes`
- `logs-list-attribute-values`
- `logs-query`
- `query-error-tracking-issues`
- `error-tracking-issues-list`

Use attribute discovery before writing narrow log filters if the exact attribute names are unclear.

### Schema

- `read-data-schema`
- `event-definitions-list`
- `properties-list`

Use these when the user wants to inspect which events and properties exist before asking narrower analytics questions.

## Working Style

- PostHog's MCP guidance favors small, composable tools over large multi-step wrappers.
- Prefer feature-specific tools when they already model the task.
- Fall back to `query-run` for custom analytics, especially when the user asks for raw event data or flexible breakdowns.
- Use `docs-search` when the question is about PostHog product behavior, setup, or API details rather than the user's data.
- If the exact tool name is unclear, inspect the server catalog before guessing.

## Practical Starting Points

- "What projects can I access?" -> `projects-get`
- "Search PostHog docs for X" -> `docs-search`
- "Run a custom funnel or trend" -> `query-run`
- "Show me saved insights about X" -> `insights-get-all`
- "Check rollout status for flag Y" -> `feature-flags-status-retrieve`
- "Investigate logs for service Z" -> `logs-query`
- "What events or properties do we have?" -> `read-data-schema`
