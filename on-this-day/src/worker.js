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

// HistoryEvent = { year, text, link }
const KINDS = ["events", "births", "deaths", "holidays", "selected"];
const tools = [
  { name: "on_this_day", description: "Historical events, births, deaths or holidays from Wikipedia for a calendar date (defaults to today).",
    inputSchema: { type: "object", properties: { month: { type: "integer", minimum: 1, maximum: 12 }, day: { type: "integer", minimum: 1, maximum: 31 }, kind: { type: "string", enum: KINDS, default: "selected" }, limit: { type: "integer", default: 10 } } },
    async run({ month, day, kind = "selected", limit = 10 }) {
      const now = new Date(); month ??= now.getMonth() + 1; day ??= now.getDate();
      const mm = String(month).padStart(2, "0"), dd = String(day).padStart(2, "0");
      const d = await getJSON(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/${kind}/${mm}/${dd}`);
      const items = (d[kind] || []).map((e) => ({ year: e.year ?? null, text: e.text, link: e.pages?.[0]?.content_urls?.desktop?.page || null }));
      if (kind !== "holidays") items.sort((a, b) => b.year - a.year);
      return { date: `${mm}-${dd}`, kind, total: items.length, items: items.slice(0, limit) };
    } },
];
serve({ name: "on-this-day", version: "0.1.0" }, tools);
export default { fetch: (req) => __h(req) };
