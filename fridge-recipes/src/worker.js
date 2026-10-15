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

// Meal = { id, name, category, area, ingredients[{item, measure}], instructions, thumb, source, youtube }
const API = "https://www.themealdb.com/api/json/v1/1";
const slim = (m) => { const ing = []; for (let i = 1; i <= 20; i++) { const it = m[`strIngredient${i}`]?.trim(); if (it) ing.push({ item: it, measure: (m[`strMeasure${i}`] || "").trim() }); }
  return { id: m.idMeal, name: m.strMeal, category: m.strCategory, area: m.strArea, ingredients: ing, instructions: m.strInstructions, thumb: m.strMealThumb, source: m.strSource || null, youtube: m.strYoutube || null }; };
const ids = async (ing) => ((await getJSON(`${API}/filter.php?i=${encodeURIComponent(ing.trim().toLowerCase().replace(/\s+/g, "_"))}`)).meals || []).map((m) => ({ id: m.idMeal, name: m.strMeal }));
const tools = [
  { name: "recipes_from_fridge", description: "Find recipes using ingredients the user already has. Ranks meals by how many of the given ingredients they use.",
    inputSchema: { type: "object", properties: { ingredients: { type: "array", items: { type: "string" }, description: "e.g. ['chicken', 'garlic', 'rice']" }, limit: { type: "integer", default: 5 } }, required: ["ingredients"] },
    async run({ ingredients, limit = 5 }) {
      const hits = new Map();
      for (const ing of ingredients) for (const m of await ids(ing)) { const h = hits.get(m.id) || { ...m, matched: [] }; h.matched.push(ing); hits.set(m.id, h); }
      const ranked = [...hits.values()].sort((a, b) => b.matched.length - a.matched.length).slice(0, limit);
      return Promise.all(ranked.map(async (r) => { const m = slim((await getJSON(`${API}/lookup.php?i=${r.id}`)).meals[0]);
        const have = ingredients.map((x) => x.toLowerCase());
        return { ...m, matched: r.matched, missing: m.ingredients.map((i) => i.item).filter((i) => !have.some((h) => i.toLowerCase().includes(h))) }; }));
    } },
  { name: "get_recipe", description: "Full recipe by name (search) or TheMealDB id.",
    inputSchema: { type: "object", properties: { name: { type: "string" }, id: { type: "string" } } },
    async run({ name, id }) {
      const d = id ? await getJSON(`${API}/lookup.php?i=${id}`) : await getJSON(`${API}/search.php?s=${encodeURIComponent(name || "")}`);
      return (d.meals || []).slice(0, 3).map(slim);
    } },
  { name: "random_recipe", description: "A random recipe for when the user can't decide what to cook.", inputSchema: { type: "object", properties: {} },
    async run() { return slim((await getJSON(`${API}/random.php`)).meals[0]); } },
];
serve({ name: "fridge-recipes", version: "0.1.0" }, tools);
export default { fetch: (req) => __h(req) };
