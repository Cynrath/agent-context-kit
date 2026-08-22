---
name: ackit-context-optimization
description: Build budgeted context packs and trim instruction bloat for coding agents.
---

# Context Optimization

Activate when the user asks to prepare context for an agent session or reduce
token usage.

## Steps

1. `ackit pack --max-tokens <budget>` to generate a deterministic pack with a
   manifest of included/excluded files and reasons.
2. Review exclusions; add explicit includes only when the ranking missed real
   relevance.
3. For bloated instructions, run `ackit optimize` (read-only) and apply its
   suggestions manually or with `--fix` inside managed blocks.

## Notes

- Token counts are estimates; treat budgets as soft targets.
- Never paste repository content into external services.
