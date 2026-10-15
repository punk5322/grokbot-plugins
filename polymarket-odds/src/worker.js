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

// Market = { question, outcomes[{name, prob}], volume_24h, liquidity, end_date, url }
const G = "https://gamma-api.polymarket.com";
const parse = (s) => { try { return typeof s === "string" ? JSON.parse(s) : s || []; } catch { return []; } };
const slim = (m) => { const o = parse(m.outcomes), p = parse(m.outcomePrices);
  return { question: m.question, outcomes: o.map((name, i) => ({ name, prob: p[i] != null ? Math.round(+p[i] * 1000) / 10 : null })), volume_24h: Math.round(+m.volume24hr || 0), liquidity: Math.round(+m.liquidity || 0), end_date: m.endDate, url: m.events?.[0]?.slug ? `https://polymarket.com/event/${m.events[0].slug}` : `https://polymarket.com/market/${m.slug}` }; };
const top = (n, offset = 0) => getJSON(`${G}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${n}&offset=${offset}`);
const tools = [
  { name: "trending_markets", description: "Most-traded open Polymarket prediction markets right now, with implied probabilities (%).",
    inputSchema: { type: "object", properties: { limit: { type: "integer", default: 10, maximum: 50 } } },
    async run({ limit = 10 }) { return (await top(Math.min(50, limit))).map(slim); } },
  { name: "search_markets", description: "Find open Polymarket markets about a topic (e.g. 'election', 'bitcoin', 'Fed') and return current odds.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", default: 8 } }, required: ["query"] },
    async run({ query, limit = 8 }) {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const pages = await Promise.all([0, 500].map((o) => top(500, o)));
      const hits = pages.flat().filter((m) => words.every((w) => `${m.question} ${m.slug}`.toLowerCase().includes(w)));
      return hits.slice(0, limit).map(slim);
    } },
];
serve({ name: "polymarket-odds", version: "0.1.0" }, tools);
export default { fetch: (req) => __h(req) };
