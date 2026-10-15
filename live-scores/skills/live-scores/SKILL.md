---
name: live-scores
description: Use when the user asks for a score, whether a team won, who's playing tonight, or what time and channel a game is on. Calls the live-scores MCP tools (get_scoreboard, find_team_game).
---

# Live Scores

- A specific team → `find_team_game` (pick the league from context: Lakers → nba, Arsenal → epl).
- "Scores tonight" / a whole league → `get_scoreboard`.
- `status` is pre / in / post. `start` is UTC; convert to the user's timezone.
- Report only the scores the tool returned.
