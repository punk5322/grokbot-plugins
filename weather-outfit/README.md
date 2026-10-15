# Weather Outfit

Current weather and multi-day forecasts for any city, with a plain what-to-wear suggestion. Powered by Open-Meteo, no API key.

## Tools

| Tool | Args | What it does |
|---|---|---|
| `get_outfit` | place | current conditions + what to wear |
| `get_forecast` | place, days? | 1-7 day daily forecast with an outfit per day (packing) |

Every tool returns this shape (as JSON text + `structuredContent`):

`Forecast = { place, time, temp_c, feels_like_c, precip_mm, rain_chance_pct, wind_kmh, uv_index, condition, outfit[] }`

## Install

This plugin uses a hosted remote MCP server (streamable HTTP), so there is nothing to run locally and no API key.

- MCP endpoint: `https://weather-outfit.me-870.workers.dev/mcp`
- Add this folder as an Agent Plugin, or point any MCP client at the URL above.

Quick manual test:

```bash
curl -s https://weather-outfit.me-870.workers.dev/mcp -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See `demo-output.txt` for a real recorded session.

## Data source

[Open-Meteo](https://open-meteo.com) forecast + geocoding APIs (free, no key, non-commercial use).

## Files

- `.cursor-plugin/plugin.json`: plugin manifest
- `mcp.json`: remote MCP server definition (hosted URL)
- `src/worker.js`: zero-dependency MCP server for Cloudflare Workers
- `wrangler.toml`: Workers config (`npx wrangler deploy` to self-host)
- `skills/`: tells the agent when to use the tools
- `assets/logo.svg`: logo

## License

MIT, Arsh Shah
