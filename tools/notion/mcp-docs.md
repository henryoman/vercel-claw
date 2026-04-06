> ## Documentation Index
> Fetch the complete documentation index at: https://developers.notion.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Connecting to Notion MCP

> Learn how to connect this agent to Notion using MCP.

This guide explains how this agent should connect to Notion using the hosted Model Context Protocol (MCP) server. Once connected, the agent can read and write to a Notion workspace according to the permissions granted during authentication.

The generic setup instructions for Claude, Cursor, ChatGPT, Codex, and other MCP clients are intentionally omitted here. This doc only covers the connection details relevant to this agent.

## Recommended connection

Use the hosted Notion MCP server over Streamable HTTP:

| Transport | URL | Notes |
| :-------- | :-- | :---- |
| **Streamable HTTP** (recommended) | `https://mcp.notion.com/mcp` | Modern transport and the default choice |
| **SSE** (legacy) | `https://mcp.notion.com/sse` | Only use this if the runtime cannot use the HTTP endpoint |

Configure the agent with a Notion MCP server named `notion` that points to the hosted URL:

```json
{
  "mcpServers": {
    "notion": {
      "url": "https://mcp.notion.com/mcp"
    }
  }
}
```

## Authentication

Notion MCP uses user-based OAuth. The first time the agent tries to use a Notion tool, complete the OAuth flow and choose the workspace the agent should be allowed to access.

- Access is limited to the authenticated user's Notion permissions.
- The hosted Notion MCP server does not use bearer-token authentication.
- A human must complete the OAuth flow, so this setup is not suitable for fully headless automation.

## Fallback for runtimes without remote HTTP MCP support

If the runtime cannot connect to a remote MCP server directly over HTTP, bridge to the hosted Notion MCP server with `mcp-remote`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "bunx",
      "args": ["mcp-remote", "https://mcp.notion.com/mcp"]
    }
  }
}
```

Use the bridge only as a fallback. Prefer the direct `https://mcp.notion.com/mcp` connection whenever the runtime supports it.

## Troubleshooting

- If authentication fails, clear the saved Notion MCP connection and run the OAuth flow again.
- Make sure the authenticated user has access to the target workspace, pages, and databases.
- Prefer the Streamable HTTP endpoint over SSE unless you know the runtime needs legacy transport.
- If using `mcp-remote`, verify that the bridge process starts successfully and can open the OAuth flow.

## References

- Connection guide: `https://developers.notion.com/guides/mcp/get-started-with-mcp`
- MCP client integration guide: `https://developers.notion.com/guides/mcp/build-mcp-client`
- Hosted Notion MCP overview: `https://developers.notion.com/guides/mcp/mcp`
