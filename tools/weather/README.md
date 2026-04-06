# Weather

Deterministic weather lookup for a specific location.

This tool does not expose raw `curl` access to the model. Instead, the app runs
the checked-in Bun wrapper at `tools/weather/run.ts`, which calls `wttr.in` with
fixed arguments and returns a normalized JSON payload.

## What makes it deterministic

- It always queries `https://wttr.in`.
- It always requests JSON with `format=j2`.
- It always uses metric units with `m`.
- It always forces English output with `lang=en`.
- It always returns the same curated JSON shape.
- It never falls back to IP-based "current location" weather.

## Supported operation

### `current`

Required arguments:

- `location`: A human-readable place name such as `London`, `Paris, France`, or
  `Salt Lake City`.

The tool returns a normalized JSON object with:

- the requested and resolved location
- current condition text
- temperature and feels-like temperature in Celsius
- humidity, precipitation, visibility, and wind
- today's forecast high and low in Celsius

## Local wrapper

Run the wrapper directly with Bun:

```sh
bun "tools/weather/run.ts" "London"
```
