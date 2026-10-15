# Live Scores

Live and recent scores for NFL, NBA, MLB, NHL, WNBA, MLS, Premier League, La Liga, Champions League and college sports, from ESPN's public scoreboard.

## Tools

| Tool | Args | What it does |
|---|---|---|
| `get_scoreboard` | league, date? | every game in a league today or on a date |
| `find_team_game` | team, league, date? | one team's game |

Every tool returns this shape (as JSON text + `structuredContent`):

`Game = { league, name, status, detail, start, home:{team, abbr, score, record}, away:{team, abbr, score, record}, venue, broadcast }`

## Install

This plugin uses a hosted remote MCP server (streamable HTTP), so there is nothing to run locally and no API key.

- MCP endpoint: `https://live-scores.me-870.workers.dev/mcp`
- Add this folder as an Agent Plugin, or point any MCP client at the URL above.

Quick manual test:

```bash
curl -s https://live-scores.me-870.workers.dev/mcp -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See `demo-output.txt` for a real recorded session.

## Data source

ESPN's public site scoreboard JSON (`site.api.espn.com/apis/site/v2/sports/...`). Unofficial and undocumented, no key; it may change without notice.

## Files

- `.cursor-plugin/plugin.json`: plugin manifest
- `mcp.json`: remote MCP server definition (hosted URL)
- `src/worker.js`: zero-dependency MCP server for Cloudflare Workers
- `wrangler.toml`: Workers config (`npx wrangler deploy` to self-host)
- `skills/`: tells the agent when to use the tools
- `assets/logo.svg`: logo

## License

MIT, Arsh Shah
