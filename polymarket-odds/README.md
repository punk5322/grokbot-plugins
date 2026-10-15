# Polymarket Odds

Live prediction-market odds from Polymarket: what's trending and what the crowd thinks about any topic, as probabilities.

## Tools

| Tool | Args | What it does |
|---|---|---|
| `trending_markets` | limit? | most-traded open markets right now |
| `search_markets` | query, limit? | open markets matching a topic |

Every tool returns this shape (as JSON text + `structuredContent`):

`Market = { question, outcomes[{name, prob}], volume_24h, liquidity, end_date, url }`

## Install

This plugin uses a hosted remote MCP server (streamable HTTP), so there is nothing to run locally and no API key.

- MCP endpoint: `https://polymarket-odds.me-870.workers.dev/mcp`
- Add this folder as an Agent Plugin, or point any MCP client at the URL above.

Quick manual test:

```bash
curl -s https://polymarket-odds.me-870.workers.dev/mcp -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See `demo-output.txt` for a real recorded session.

## Data source

[Polymarket Gamma API](https://docs.polymarket.com) `gamma-api.polymarket.com/markets` (public, read-only, no key).

## Files

- `.cursor-plugin/plugin.json`: plugin manifest
- `mcp.json`: remote MCP server definition (hosted URL)
- `src/worker.js`: zero-dependency MCP server for Cloudflare Workers
- `wrangler.toml`: Workers config (`npx wrangler deploy` to self-host)
- `skills/`: tells the agent when to use the tools
- `assets/logo.svg`: logo

## License

MIT, Arsh Shah
