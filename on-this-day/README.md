# On This Day

What happened on this day in history: events, famous births and deaths, and holidays, straight from Wikipedia.

## Tools

| Tool | Args | What it does |
|---|---|---|
| `on_this_day` | month?, day?, kind?, limit? | events / births / deaths / holidays / selected for any date (defaults to today) |

Every tool returns this shape (as JSON text + `structuredContent`):

`HistoryEvent = { year, text, link }`

## Install

This plugin uses a hosted remote MCP server (streamable HTTP), so there is nothing to run locally and no API key.

- MCP endpoint: `https://on-this-day.me-870.workers.dev/mcp`
- Add this folder as an Agent Plugin, or point any MCP client at the URL above.

Quick manual test:

```bash
curl -s https://on-this-day.me-870.workers.dev/mcp -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See `demo-output.txt` for a real recorded session.

## Data source

[Wikimedia Feed API](https://api.wikimedia.org/wiki/Feed_API/Reference/On_this_day) `onthisday` (free, no key).

## Files

- `.cursor-plugin/plugin.json`: plugin manifest
- `mcp.json`: remote MCP server definition (hosted URL)
- `src/worker.js`: zero-dependency MCP server for Cloudflare Workers
- `wrangler.toml`: Workers config (`npx wrangler deploy` to self-host)
- `skills/`: tells the agent when to use the tools
- `assets/logo.svg`: logo

## License

MIT, Arsh Shah
