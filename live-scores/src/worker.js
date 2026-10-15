// Minimal zero-dependency MCP stdio server (JSON-RPC 2.0, newline-delimited).
const UA = { "User-Agent": "grokbot-plugins/1.0 (github.com/punk5322/grokbot-plugins)" };
async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  return r.json();
}
async function rpc(info, tools, msg) {
  const { id, method, params } = msg || {};
  if (id === undefined || id === null && !method) return null;
  const ok = (result) => ({ jsonrpc: "2.0", id, result }), err = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  if (method === "initialize") return ok({ protocolVersion: params?.protocolVersion || "2025-06-18", capabilities: { tools: {} }, serverInfo: info });
  if (method === "ping") return ok({});
  if (method === "tools/list") return ok({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  if (method === "tools/call") {
    const t = tools.find((x) => x.name === params?.name);
    if (!t) return err(-32602, `Unknown tool: ${params?.name}`);
    try { const out = await t.run(params.arguments || {}); return ok({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out }); }
    catch (e) { return ok({ content: [{ type: "text", text: `Error: ${e.message}` }], isError: true }); }
  }
  return err(-32601, `Method not found: ${method}`);
}
let __h;
function serve(info, tools) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE" };
  const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  __h = async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method === "GET") return j({ error: "Use POST (MCP streamable HTTP, JSON responses)", server: info }, 405);
    if (req.method === "DELETE") return new Response(null, { status: 200, headers: cors });
    if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });
    let body; try { body = await req.json(); } catch { return j({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
    const batch = Array.isArray(body);
    const out = (await Promise.all((batch ? body : [body]).map((m) => rpc(info, tools, m)))).filter(Boolean);
    if (!out.length) return new Response(null, { status: 202, headers: cors });
    return j(batch ? out : out[0]);
  };
}

// Game = { league, name, status, detail, start, home:{team, abbr, score, record}, away:{team, abbr, score, record}, venue, broadcast }
const LEAGUES = { nfl: "football/nfl", nba: "basketball/nba", wnba: "basketball/wnba", mlb: "baseball/mlb", nhl: "hockey/nhl", mls: "soccer/usa.1", epl: "soccer/eng.1", laliga: "soccer/esp.1", seriea: "soccer/ita.1", bundesliga: "soccer/ger.1", ucl: "soccer/uefa.champions", ncaaf: "football/college-football", ncaab: "basketball/mens-college-basketball" };
const side = (c) => c && { team: c.team.displayName, abbr: c.team.abbreviation, score: c.score, record: c.records?.[0]?.summary || null };
async function games(league, date) {
  const path = LEAGUES[league?.toLowerCase()]; if (!path) throw new Error(`Unknown league. Use one of: ${Object.keys(LEAGUES).join(", ")}`);
  const d = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard${date ? `?dates=${date.replace(/-/g, "")}` : ""}`);
  return (d.events || []).map((e) => { const c = e.competitions[0], cs = c.competitors;
    return { league: league.toLowerCase(), name: e.name, status: e.status.type.state, detail: e.status.type.shortDetail, start: e.date,
      home: side(cs.find((x) => x.homeAway === "home")), away: side(cs.find((x) => x.homeAway === "away")), venue: c.venue?.fullName || null, broadcast: c.broadcasts?.flatMap((b) => b.names).join(", ") || null }; });
}
const tools = [
  { name: "get_scoreboard", description: `Live and recent scores for a league (pre/in/post status). Leagues: ${Object.keys(LEAGUES).join(", ")}.`,
    inputSchema: { type: "object", properties: { league: { type: "string", enum: Object.keys(LEAGUES) }, date: { type: "string", description: "Optional YYYY-MM-DD; defaults to today" } }, required: ["league"] },
    run: ({ league, date }) => games(league, date) },
  { name: "find_team_game", description: "Find today's (or a given date's) game for a specific team, e.g. 'Lakers' or 'Arsenal'.",
    inputSchema: { type: "object", properties: { team: { type: "string" }, league: { type: "string", enum: Object.keys(LEAGUES) }, date: { type: "string" } }, required: ["team", "league"] },
    async run({ team, league, date }) { const q = team.toLowerCase();
      const g = (await games(league, date)).filter((x) => [x.home, x.away].some((s) => s && (s.team.toLowerCase().includes(q) || s.abbr.toLowerCase() === q)));
      return g.length ? g : { message: `No ${league} game found for ${team} on ${date || "today"}.` }; } },
];
serve({ name: "live-scores", version: "0.1.0" }, tools);
export default { fetch: (req) => __h(req) };
