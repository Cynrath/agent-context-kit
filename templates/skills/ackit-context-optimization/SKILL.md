---
name: ackit-context-optimization
description: Build budgeted context packs and trim instruction bloat for coding agents.
---

# Context Optimization

Activate when the user asks to prepare context for an agent session or reduce
token usage.

See [ranking signals](references/ranking.md) for deterministic ordering.

## Steps

1. `ackit pack --max-tokens <budget> [--format markdown|json] [--include <globs...>] [--changed] [--profile codex|claude|copilot|gemini|generic] [--task <id>] [--resume]` to generate a deterministic pack with a manifest of included/excluded files and reasons (`relativePath`, `action`, `reason`, `estimatedTokens`, `sha256`, `bytes`). Task-aware ranking (`--task`) and checkpoint resume (`--resume`) keep packs scoped; greedy fill excludes over-budget candidates with `budget exhausted`.
2. Review exclusions; add explicit includes only when the ranking missed real relevance (explicit include is the highest signal; no embeddings).
3. For bloated instructions, run `ackit optimize [--profile <name>] [--category <cat>] [--min-severity low|medium|high] [--explain] [--format terminal|json|markdown|sarif]` (read-only by default) and apply suggestions manually or with `ackit optimize --fix [--dry-run] [--diff]` — fixes apply ONLY to ACKit-managed surfaces.

## Notes

- Token counts are character-class estimates (~4 chars/token); treat budgets as soft targets.
- Safety gates run before scoring: secret-shaped content excluded, duplicate hashes deduped, machine-local paths scrubbed to `<local-path>`.
- Never paste repository content into external services.
