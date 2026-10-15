---
name: fridge-recipes
description: Use when the user lists ingredients they have and asks what they can cook, wants a specific recipe, or can't decide what to make for dinner. Calls the fridge-recipes MCP tools (recipes_from_fridge, get_recipe, random_recipe).
---

# Fridge Recipes

- Ingredients on hand → `recipes_from_fridge` with simple single-word ingredient names ("chicken", "rice", "garlic").
- A named dish → `get_recipe`. Indecisive → `random_recipe`.
- Show the top 2-3 options with what they're missing, then give full steps for the one the user picks.
- Never make up recipes or quantities; only use tool output.
