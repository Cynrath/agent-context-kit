---
id: "TASK-0083"
title: "Provider-surface and integration parity audit and implementation"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0078"
  - "TASK-0081"
createdAt: "2026-09-04"
completedAt: 2026-09-05
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
- TASK-0081 (canonical workflow/evidence/verdict/status snapshot this task must expose/audit; scheduling before the status model exists is prohibited).

## Affected files / expected areas

- Instruction/skill projection layers, `instructions` command surfaces
- SDK/MCP/Action/VS Code projection code (as the audit finds drift)
- `tests/` fixture-driven parity suites + capability-table contract tests
- `docs/guides/agent-integration.md`, provider notes, `docs/reference/` (as needed)

## Acceptance criteria

- [x] Capability table covers the listed surfaces, each material difference cites an official/current primary source with date; non-differences explicitly recorded as such.
- [x] Proven projection drift closed; all surfaces expose the same canonical snapshot (fixture-proven per surface).
- [x] No new engines; MCP remains read-only (offline-egress + capability review).
- [x] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

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

Implemented 2026-09-05 on `release/v0.5.0` (single-lane, fourth chain on
the same branch/PR #20).

Provider audit (fresh official primary sources, fetched directly
2026-09-05 — vendor docs + vendor doc repos; directory search API was
unavailable, recorded honestly in the fixture; no community sources, no
live calls): 7 surfaces audited (Codex CLI, Claude Code, Gemini CLI,
Copilot Chat, Copilot coding agent, Copilot review, VS Code agent mode)
→ 10 material differences D1–D10 (canonical filenames, foreign-file
reading, skills roots, conflict resolution, scoped syntax, precedence,
review channels, caps, packaging, VS Code settings gates), each citing
URLs + access dates, plus 5 pinned non-differences N1–N5 (notably N2
SKILL.md convergence) and 5 UNSPECIFIED items (never inferred).
Machine-readable: `tests/fixtures/provider-capabilities.json`
(`ackit.provider-capabilities.v1`), pinned by
`tests/contract/provider-capabilities.test.ts` (surface coverage, dated
https sources, no-drop D1–D10, N2 pin, ACKit projection mapping for
D1–D3). Deliberate non-change, reviewed: NO new codex/gemini skill
export targets — identical SKILL.md bytes would be provider-count
inflation (N2); roots stay caller-chosen via `--out`, documented as
data in the fixture mapping.

Projection parity (one canonical snapshot, no new engines): SDK gains
the v0.5 read models (status report/render + contract id, handoff
build/parse/validate + error + contract id, independence assessment +
replay digest helpers; allowlist + function/shape contract updated);
MCP gains ONE read-only `ackit_status` (composed 0081 projection —
evidence/verdict/drift answers ride one tool, no per-entity sprawl; no
mutation surface, guarded by a tool-name test); Action proven
passthrough (spawns CLI; description now documents read-only
status/drift; no bundle change); VS Code Tasks view renders the SDK
status snapshot (blockers + next actions; tsc + esbuild green, host
suite runs in CI). Parity proven per surface:
`tests/contract/projection-parity.test.ts` (CLI ≡ SDK ≡ MCP
byte-equality, MCP read-only guard, Action bundle spawn asserting the
snapshot in findings-json). Docs: `docs/reference/provider-surfaces.md`
(capability summary + sources/dates + parity matrix + deferred items),
agent-integration MCP list refreshed (9 → 16 + status note) with
provider doc link, SDK reference v0.5 rows, action.yml description.

Evidence: capability contract 4/4 + parity 3/3 + MCP conformance (16
tools) + api-surface allowlist green; pre-existing skills/instruction/
contract suites pass unmodified. Full `pnpm test` counts + all gates
recorded at completion-gate time. MCP stays read-only (offline-egress +
capability review hold). No quality gates weakened. No publish/tag/
release. TASK-0084 not started.

Final validation (2026-09-05, head `3dbc896`): `pnpm test` 112 files /
687 passed / 1 conditional skip (pre-existing symlink-behavior skip), 0
failed with `--maxWorkers 2`; lint, format:check, typecheck, build
green (zero warnings); `gen:schemas` no-op (no schema change);
smoke:cli + smoke:package (`cynrath-agent-context-kit-0.5.0-dev.0.tgz`,
nothing published) PASS; version-parity PASS (source 0.5.0-dev.0,
stable 0.4.1); offline-egress PASS; text-hygiene repo clean (920
files); config check, doctor, task doctor, skills validate, scan --ci
(readiness 88) PASS; `git diff --check` clean; VS Code `tsc --noEmit`
+ esbuild bundle green. PR #20 exact-head CI: 12/12 green on `3dbc896`.
Fresh independent verifier: OVERALL PASS, zero blockers (zero warnings)
— capability table, no-new-engines, parity proofs, scope discipline,
docs, CLI verdicts all hold.
