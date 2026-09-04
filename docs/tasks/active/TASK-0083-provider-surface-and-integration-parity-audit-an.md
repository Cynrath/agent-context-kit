---
id: "TASK-0083"
title: "Provider-surface and integration parity audit and implementation"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0078"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Extend the now-solved builtin skill ↔ CLI parity (TASK-0077/v0.4.1 DONE baseline) to the next parity problem: provider-surface semantics (Claude Code, Copilot Chat, Copilot coding agent, Copilot review, VS Code agent mode, Gemini CLI, Codex, etc.) and projection parity across CLI, SDK, read-only MCP, GitHub Action, and VS Code. Model differences only where official/current provider behavior materially differs; do not chase provider count for marketing. Prefer machine-readable fixtures/capability tables and `instructions explain`/status projections. Do not create separate engines: expose the same canonical workflow/evidence/verdict/status snapshot through each surface as appropriate.

## Consensus basis

Strong multi-auditor consensus (SHOULD, two linked items): provider-surface parity audit/implementation + CI/Action/VS Code projection parity, both as composition over one canonical model, no new engines.

## Scope

- Audit provider surfaces against official/current provider behavior: build a capability table (surface × instruction/skill/projection behavior), grounded in primary sources with dates; record where behavior does NOT materially differ (no modeling there).
- Machine-readable fixtures for material differences; `instructions explain`-style surfacing where it exists.
- Audit CLI/SDK/MCP/Action/VS Code projections of workflow/evidence/verdict/status (TASK-0081 model) for drift; close proven drift so all surfaces expose the same canonical snapshot.
- Tests: fixture-driven parity tests per surface; contract tests pinning the capability table; no live-provider calls in tests (offline-first).
- Docs: provider notes with source + freshness dates; projection parity statement per surface.

## Out of scope

- New provider integrations for marketing breadth; any provider behavior modeled without a primary source.
- Separate per-surface engines or duplicated workflow logic.
- MCP mutation/write control plane (explicitly deferred for v0.5.0; MCP stays read-only).
- Large new builtin-skill catalog (explicitly deferred).

## Dependencies

- TASK-0078 (baseline vocabulary; capability table references stable concepts).

## Affected files / expected areas

- Instruction/skill projection layers, `instructions` command surfaces
- SDK/MCP/Action/VS Code projection code (as the audit finds drift)
- `tests/` fixture-driven parity suites + capability-table contract tests
- `docs/guides/agent-integration.md`, provider notes, `docs/reference/` (as needed)

## Acceptance criteria

- [ ] Capability table covers the listed surfaces, each material difference cites an official/current primary source with date; non-differences explicitly recorded as such.
- [ ] Proven projection drift closed; all surfaces expose the same canonical snapshot (fixture-proven per surface).
- [ ] No new engines; MCP remains read-only (offline-egress + capability review).
- [ ] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused parity suites, then `pnpm test` (record counts).
3. Fixture review: each case traces to a table row + source.
4. `doctor`, `task doctor`, `skills validate`, `scan --ci`, `git diff --check`.

## Security considerations

- No provider credentials, tokens, or live calls in repo/tests; fixtures synthetic.
- MCP scope unchanged (read-only); any mutation-shaped proposal is out of scope by default.

## Risks

- Provider docs churn → source dates + contract tests pin expectations; refresh is a deliberate follow-up, not drift.
- Marketing-count pressure → the material-difference rule is the gate; enforce it in review.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
