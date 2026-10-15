# Fridge Recipes

List what's in your fridge and get real recipes that use it, plus full ingredient lists and steps. Powered by TheMealDB, no API key.

## Tools

| Tool | Args | What it does |
|---|---|---|
| `recipes_from_fridge` | ingredients[], limit? | rank meals by how many of your ingredients they use, with what's missing |
| `get_recipe` | name? id? | full recipe by name or id |
| `random_recipe` | - | a random meal |

Every tool returns this shape (as JSON text + `structuredContent`):

`Meal = { id, name, category, area, ingredients[{item, measure}], instructions, thumb, source, youtube } (+ matched[], missing[] in fridge results)`

## Install

This plugin uses a hosted remote MCP server (streamable HTTP), so there is nothing to run locally and no API key.

- MCP endpoint: `https://fridge-recipes.me-870.workers.dev/mcp`
- Add this folder as an Agent Plugin, or point any MCP client at the URL above.

Quick manual test:

```bash
curl -s https://fridge-recipes.me-870.workers.dev/mcp -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See `demo-output.txt` for a real recorded session.

## Data source

[TheMealDB](https://www.themealdb.com/api.php) public test key `1` (free, no signup).

## Files

- `.cursor-plugin/plugin.json`: plugin manifest
- `mcp.json`: remote MCP server definition (hosted URL)
- `src/worker.js`: zero-dependency MCP server for Cloudflare Workers
- `wrangler.toml`: Workers config (`npx wrangler deploy` to self-host)
- `skills/`: tells the agent when to use the tools
- `assets/logo.svg`: logo

## License

MIT, Arsh Shah
