# Grok Bot plugins

Five keyless plugins, each with a hosted remote MCP server (streamable HTTP) on Cloudflare Workers.

| Plugin | What it does | MCP endpoint |
|---|---|---|
| [weather-outfit](weather-outfit) | Weather + what to wear (Open-Meteo) | https://weather-outfit.me-870.workers.dev/mcp |
| [fridge-recipes](fridge-recipes) | Recipes from what's in your fridge (TheMealDB) | https://fridge-recipes.me-870.workers.dev/mcp |
| [live-scores](live-scores) | Live sports scores (ESPN public scoreboard) | https://live-scores.me-870.workers.dev/mcp |
| [on-this-day](on-this-day) | Historical events for any date (Wikipedia) | https://on-this-day.me-870.workers.dev/mcp |
| [polymarket-odds](polymarket-odds) | Prediction market odds (Polymarket) | https://polymarket-odds.me-870.workers.dev/mcp |

Each folder is a self-contained plugin: `.cursor-plugin/plugin.json`, `mcp.json`, `skills/`, `assets/logo.svg`, `src/worker.js`.

MIT License, Arsh Shah.
