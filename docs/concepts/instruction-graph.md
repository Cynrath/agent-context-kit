# Instruction Graph

All agent-instruction surfaces become nodes in one resolved graph
(ADR-0006, REQ-INSTR-001..006):

| Surface | Provider | Notes |
|---|---|---|
| `AGENTS.md` / `AGENTS.override.md` | codex | any depth; nested scopes; closer wins |
| global codex AGENTS (seam) | codex | injected dir; always weakest |
| `CLAUDE.md` | claude | root + nested |
| `GEMINI.md` | gemini | root + nested |
| `.github/copilot-instructions.md` | copilot | repo-wide |
| `.github/instructions/*.instructions.md` | copilot | `applyTo` frontmatter globs |
| `.agents/skills/<name>/SKILL.md` | shared | linked skill catalog nodes |

Node fields: id, provider, kind, relativePath, scopeRoot, applyTo, depth,
precedence, managed, checksum (sha256), tokenEstimate, status, conflicts,
duplicates, references, securityFlags.

Precedence tiers (deterministic):

```
0            codex global seam
depth*10+1   codex base (+50 for same-dir override)
100+depth*10 provider roots (claude/gemini/copilot)
1000+depth*10 path-specific applyTo
```

`resolveEffectiveStack(graph, provider, forPath)` returns the weakest→strongest
chain for one path. Nested AGENTS.md files apply only inside their directory
subtree — this path-scoping is intentionally independent from workspace
boundaries (`docs/guides/monorepo.md`).

Analysis on top of the graph is deterministic only: convention conflicts,
exact/near duplicates, stale references, unreachable globs, hidden unicode,
external refs, massive embedded data, credential-shaped literals. No LLM/NLP
verdicts anywhere; nothing critical without captured evidence.
