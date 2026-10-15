---
name: weather-outfit
description: Use when the user asks about the weather, whether they need a jacket or umbrella, what to wear today, or what to pack for a trip to a city. Calls the weather-outfit MCP tools (get_outfit, get_forecast).
---

# Weather Outfit

- "What should I wear?" → `get_outfit` with the user's city (ask if unknown).
- Trips / packing / "this weekend" → `get_forecast` with `days`.
- Temperatures are Celsius; convert to Fahrenheit if the user is in the US.
- Report only what the tool returned. Lead with the outfit, then one line of conditions.
