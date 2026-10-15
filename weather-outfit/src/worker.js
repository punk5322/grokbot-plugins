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

// Forecast = { place, time, temp_c, feels_like_c, precip_mm, rain_chance_pct, wind_kmh, uv_index, condition, outfit[] }
const WMO = {0:"clear",1:"mostly clear",2:"partly cloudy",3:"overcast",45:"fog",48:"fog",51:"light drizzle",53:"drizzle",55:"heavy drizzle",61:"light rain",63:"rain",65:"heavy rain",66:"freezing rain",67:"freezing rain",71:"light snow",73:"snow",75:"heavy snow",77:"snow grains",80:"showers",81:"showers",82:"heavy showers",85:"snow showers",86:"snow showers",95:"thunderstorm",96:"thunderstorm with hail",99:"thunderstorm with hail"};
async function geocode(place) {
  const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(place)}`);
  const r = g.results?.[0]; if (!r) throw new Error(`Place not found: ${place}`);
  return { name: [r.name, r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude };
}
function outfit(f) {
  const o = [], t = f.feels_like_c;
  if (t < 0) o.push("heavy winter coat", "hat, gloves and scarf", "warm boots");
  else if (t < 8) o.push("warm jacket or coat", "sweater", "long pants");
  else if (t < 15) o.push("light jacket or hoodie", "long pants");
  else if (t < 22) o.push("t-shirt with a light layer", "jeans or chinos");
  else if (t < 28) o.push("t-shirt", "shorts or light pants");
  else o.push("breathable light clothing", "shorts", "stay hydrated");
  if (f.rain_chance_pct >= 50 || f.precip_mm > 0.5) o.push("umbrella or rain jacket", "waterproof shoes");
  if (/snow/.test(f.condition)) o.push("snow boots");
  if (f.wind_kmh > 30) o.push("windproof outer layer");
  if (f.uv_index >= 6) o.push("sunglasses and sunscreen");
  return o;
}
const tools = [
  { name: "get_outfit", description: "Current weather for a place plus a practical what-to-wear suggestion.",
    inputSchema: { type: "object", properties: { place: { type: "string", description: "City or town, e.g. 'Paris' or 'Austin'" } }, required: ["place"] },
    async run({ place }) {
      const p = await geocode(place);
      const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&hourly=precipitation_probability&forecast_hours=6&timezone=auto`);
      const c = w.current;
      const f = { place: p.name, time: c.time, temp_c: c.temperature_2m, feels_like_c: c.apparent_temperature, precip_mm: c.precipitation,
        rain_chance_pct: Math.max(...(w.hourly?.precipitation_probability || [0])), wind_kmh: c.wind_speed_10m, uv_index: c.uv_index, condition: WMO[c.weather_code] || `code ${c.weather_code}` };
      f.outfit = outfit(f); return f;
    } },
  { name: "get_forecast", description: "Daily forecast (up to 7 days) for a place, with an outfit suggestion per day. Good for trip packing.",
    inputSchema: { type: "object", properties: { place: { type: "string" }, days: { type: "integer", minimum: 1, maximum: 7, default: 3 } }, required: ["place"] },
    async run({ place, days = 3 }) {
      const p = await geocode(place);
      const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,uv_index_max&forecast_days=${Math.min(7, Math.max(1, days))}&timezone=auto`);
      const d = w.daily;
      return { place: p.name, days: d.time.map((date, i) => { const f = { date, high_c: d.temperature_2m_max[i], low_c: d.temperature_2m_min[i], feels_like_c: (d.apparent_temperature_max[i] + d.temperature_2m_min[i]) / 2, precip_mm: d.precipitation_sum[i], rain_chance_pct: d.precipitation_probability_max[i], wind_kmh: d.wind_speed_10m_max[i], uv_index: d.uv_index_max[i], condition: WMO[d.weather_code[i]] || "" }; f.outfit = outfit(f); return f; }) };
    } },
];
serve({ name: "weather-outfit", version: "0.1.0" }, tools);
export default { fetch: (req) => __h(req) };
