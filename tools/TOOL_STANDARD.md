# Tool Standard

This is the canonical standard for shipped tools in `tools/`.

The goal is simple: every tool must be understandable by both the runtime and the model.

## Core Rule

Every tool must define:

- a machine-readable contract for anything the model can call
- a human-readable explanation of when to use it
- enough examples and constraints that the model does not have to guess

Schema without explanation is not enough.
Explanation without schema is not enough for callable tools.

## Tool Classes

There are three practical classes of tools in this repo:

1. `metadata`
2. `mcp`
3. `app` or other directly executable tools such as `cli`, `browser`, or `shell`

### `metadata`

Metadata-only tools are not directly runnable by the model.

They must still explain:

- what the tool or bundle represents
- which tools it expands to, if it is a bundle
- what assumptions the model must not make

They do not need a callable input schema because there is nothing to invoke directly.

### `mcp`

MCP tools must treat the MCP server tool schema as the source of truth for invocation.

They must also include local docs that explain:

- when to use the MCP server
- what capabilities it exposes
- auth, connection, or transport requirements
- which docs the model should read before using it

If the MCP server exposes callable tools, those tools must already have real input schemas through MCP. The local repo docs are still required because the model needs usage guidance, not just parameter shapes.

### `app` / executable tools

Any tool that this repo executes directly must have a real runtime schema for its inputs.

The preferred standard is:

- define the executable input contract in Zod
- validate the tool input at runtime with that Zod schema
- mirror the same contract in `activate.ts` so the model gets a compact description of operations and arguments

If a tool is directly callable and does not have a real validated input schema, it is incomplete.

## Required Files

Every real tool directory should have:

```txt
tools/<tool-id>/
  README.md
  install.ts            # if the tool needs install-time behavior
  activate.ts           # required for anything exposed to the model
```

Additional files are required by tool type:

- MCP tool: `mcp.json` and any docs referenced by `docsFile`
- Executable tool: implementation file such as `run.ts` or another checked-in runtime entrypoint
- Knowledge-heavy tool: extra docs such as `about.md`, `basics.md`, or targeted knowledge files
- Skill-backed tool: `skills/` with task-oriented guidance

## `activate.ts` Requirements

`activate.ts` is the model-facing contract. It must answer all of these:

- What is this tool for?
- When should the model use it?
- When should the model not use it?
- What should the model read first?
- What operations are allowed?
- What arguments are required?
- What output shape or behavior should the model expect?

At minimum, every `ShippedToolRuntimeSpec` should provide:

- `id`
- `label`
- `runtime`
- `docsFile` when docs exist
- `description`
- `defaultReadTargets`
- `capabilities`
- `contextHints`
- `promptHints`

If the tool is executable, it must also provide:

- `execution.runner`
- `execution.description`
- `execution.operations`

Each operation must have:

- stable `id`
- short human label
- precise description
- explicit argument list

Each argument must have:

- stable key
- primitive type
- plain-English description
- required vs optional

## Schema Standard

For directly callable tools, use this rule:

1. The executable code owns the real schema.
2. The real schema should be written in Zod.
3. Runtime code must validate inputs against that schema before execution.
4. `activate.ts` mirrors the callable surface in a model-friendly format.

That means:

- Zod is the validation source of truth.
- `activate.ts` is the discovery and guidance layer.
- README and docs explain intent, examples, and boundaries.

## Description Standard

Every tool description must be written so the model can choose correctly.

Bad descriptions are vague:

- "Weather tool"
- "Notion integration"
- "Browser helper"

Good descriptions explain action and boundaries:

- "Deterministic weather lookup for a named location with normalized JSON output."
- "Hosted Notion MCP connection metadata and docs for workspace access."
- "Persistent browser automation for opening pages, reading snapshots, clicking refs, and filling fields."

Every operation description should describe:

- what it does
- what it needs
- any important constraints

Every argument description should explain:

- the expected format
- examples when ambiguity is likely
- whether the value is user-facing text, an id, a path, a URL, or a machine token

## Example Standard

If a tool has any non-obvious argument, the docs must include at least one example.

Examples are especially required for:

- locations
- URLs
- ids and refs
- date or time strings
- filters or query expressions
- file paths
- auth or connection setup

## Output Standard

The model should never have to guess what comes back from a tool.

For executable tools, docs should describe:

- whether output is text, JSON, files, side effects, or streamed progress
- whether the tool is deterministic
- whether the tool can run in background
- any important failure modes

## Naming Standard

- `id` must be stable, lowercase, and hyphenated
- operation ids must be stable verbs or verb phrases
- argument keys must be stable and boring
- labels should be human-readable
- docs filenames should be predictable

Do not rename ids casually. They are part of the contract.

## Definition Of Done

A tool is only complete if all of the following are true:

- the model can tell when to use it
- the model can tell when not to use it
- every callable input is validated by a real schema
- every operation has a description
- every argument has a description
- docs include examples for ambiguous inputs
- docs explain output behavior and constraints
- `defaultReadTargets` point at the files the model actually needs

## Short Checklist

Before adding or shipping a tool, check:

- Is this tool directly callable by the model
- If yes, where is the Zod schema
- Does `activate.ts` mirror the callable operations
- Does the README explain usage boundaries
- Does the tool expose examples for ambiguous arguments
- Does the model know what output to expect
- Are docs and file paths current

If any answer is "no", the tool does not meet the standard yet.
