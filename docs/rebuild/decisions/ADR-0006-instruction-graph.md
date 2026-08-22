# ADR-0006: Instruction graph model

Status: Proposed · Date: 2026-08-22

## Decision
All agent-instruction surfaces become nodes in one resolved graph with the REQ-INSTR-002 field set. Resolution order: root base → nested scope (closer wins) → provider-specific → path-specific `applyTo` globs; `AGENTS.override.md` overrides same-dir `AGENTS.md`; skills link as referenced nodes. Provider adapters implement only officially documented semantics (codex/claude/gemini/copilot at launch; Cursor/Windsurf/Cline/Roo only after doc verification — otherwise omitted, never guessed).

## Rationale
Single graph lets scan conflicts, pack ranking, and init shims consume one truth. Deterministic conflict detection (structural rules + duplicates + explicit conventions + advisory heuristics, no LLM) requires the structured model.

## Consequences
Provider behavior changes force adapter updates with fixture evidence; undocumented behaviors are bugs.
