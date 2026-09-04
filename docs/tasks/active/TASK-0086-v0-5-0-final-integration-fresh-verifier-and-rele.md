---
id: "TASK-0086"
title: "v0.5.0 final integration, fresh verifier, and release-readiness"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0078"
  - "TASK-0079"
  - "TASK-0080"
  - "TASK-0081"
  - "TASK-0082"
  - "TASK-0083"
  - "TASK-0084"
  - "TASK-0085"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Integrate the full v0.5.0 chain, prove the chain composes (status projection over bound verification state, handoff resume across processes, parity surfaces agreeing), and establish release-readiness with an independent fresh verifier (zero blockers) — without publishing, tagging, or releasing anything. This task definitionally cannot complete while any child task (TASK-0078..0085) has missing acceptance evidence, pending tests, deferred mandatory scope, TODOs, disabled quality gates, unresolved security findings, failed live verification, or missing CI evidence.

## External-audit synthesis (basis for the frozen chain; normalized 2026-09-04)

Source audits (pre-v0.4.1 reports normalized against post-v0.4.1 live state; source files not on disk — synthesis basis is the session consensus plus live verification): GPT-5.6 Sol, Claude Sonnet 5, GLM-5.3-Flash (no web access; lower factual weight), Grok 4.5, Qwen, and one Manus-supplied report self-identifying as "OpenAI / API model" with exact model ID unavailable (two uploaded Manus text files were duplicates and count as ONE audit; the self-reported provider string is not an independently verified official model identity). Weighting: live repo inspection quality, primary-source freshness, architecture agreement, already-fixed status, product-boundary preservation.

| Recommendation | Auditors supporting | Already solved? | v0.5 decision |
|---|---|---|---|
| Builtin skill stale-command fixes | Multiple (baseline) | YES (TASK-0077/v0.4.1) | DONE baseline, no work |
| Basic SKILL↔CLI parity | Multiple (baseline) | YES (parity suite) | DONE baseline, no work |
| Skills `--force` wiring | Maintenance-driven | YES (v0.4.1 + forward-port) | DONE baseline, no work |
| Evidence/verdict state binding | Strong consensus | NO | MUST → TASK-0079 |
| Verifier independence hardening | Strong consensus | NO | MUST → TASK-0080 |
| Read-only status consolidation | Strong consensus | NO | MUST (composed) → TASK-0081; mutating `ackit run` NOT accepted (Qwen variant rejected without boundary ADR) |
| Portable handoff hardening | Strong consensus | Partial (v1 exists) | SHOULD (extend v1) → TASK-0082 |
| Provider-surface parity | Strong consensus | NO (skill↔CLI only) | SHOULD (material differences only) → TASK-0083 |
| CI/Action/VS Code projection parity | Strong consensus | NO | SHOULD (no new engines) → TASK-0083 |
| MCP path allow-list | Single report (MUST claim) | UNPROVEN (containment claimed) | Audit first → TASK-0084; adopt only on proven gap |
| Product positioning + demo | Strong consensus | NO | Docs task → TASK-0085 |
| Browser Companion revival | None in scope | N/A (PAUSED) | DEFERRED, branch untouched |
| Hosted SaaS/control plane | None (boundary) | N/A | REJECTED for v0.5.0 |
| Model router / LLM gateway | None (boundary) | N/A | REJECTED for v0.5.0 |
| Cloud RAG / vector DB | None (boundary) | N/A | REJECTED for v0.5.0 |
| LLM-judged semantic drift | None (boundary) | N/A | REJECTED for v0.5.0 |
| MCP mutation/write control plane | None (boundary) | N/A | REJECTED for v0.5.0 |
| Generic workflow DSL | None (boundary) | N/A | REJECTED for v0.5.0 |
| Internal autonomous subagent runtime | None (boundary) | N/A | REJECTED for v0.5.0 |
| Large new builtin-skill catalog | None (deferred) | N/A | REJECTED for v0.5.0 |
| New evidence-authoring skill | Conditional | N/A | DEFERRED unless workflow skill incoherent after progressive disclosure |

## Scope

- Integration proof across the chain: status projection (0081) over bound verification state (0079/0080), handoff export→import→resume across processes (0082), parity surfaces agreeing (0083), demo flow green on final code (0085), adversarial matrix green (0084), release-truth model holding (0078).
- Fresh independent verifier with zero blockers over the whole chain (separate agent/process, read-only, exact-head CI required first).
- Release-readiness checklist: full gates, version-parity under the new model, CHANGELOG discipline (no premature v0.5.0 entry content beyond an Unreleased scaffold if convention allows), tag/publish absence proof.
- Docs: chain completion record; v0.5.0 readiness statement with evidence links.
- No tag, no publish, no release, no deployment in this task.

## Out of scope

- v0.5.0 publication/tag/release (separate user-authorized release task, not this session).
- Feature implementation beyond integration glue proven necessary by the verifier.
- All §13 deferred/rejected items (list above); Browser Companion untouched.

## Dependencies

- TASK-0078, TASK-0079, TASK-0080, TASK-0081, TASK-0082, TASK-0083, TASK-0084, TASK-0085 (all must be completed with evidence first).

## Affected files / expected areas

- Integration glue only (as proven necessary) + fixtures
- `tests/` chain-level integration suites
- `docs/tasks/active/TASK-0086-*.md` (this task) + readiness record
- Never: `dist/`, `.ackit/`, artifacts, secrets

## Acceptance criteria

- [ ] Every dependency completed with real evidence; GO-gate scan finds no missing evidence, pending tests, TODOs, weakened gates, or unresolved security findings.
- [ ] Chain composition proven end-to-end (status over bound state, cross-process handoff resume, surfaces agreeing, demo green, matrix green).
- [ ] Fresh independent verifier: OVERALL PASS, zero blockers, exact-head CI green recorded.
- [ ] No tag/publish/release side effects proven (`git tag`, `npm view`, `gh release` unchanged).
- [ ] Full gates green with counts; task completed through the real gate.

## Test steps

1. Dependency evidence audit (per-task completion notes + CI runs).
2. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
3. `pnpm test` full suite (record counts) + `pnpm gen:schemas` idempotence.
4. `pnpm smoke:cli`, `pnpm run smoke:package`.
5. Fresh verifier bundle/record/show (zero blockers).
6. `doctor`, `task doctor`, `skills validate`, `scan --ci`, `git diff --check`, no-publish proof.

## Security considerations

- Integration must not weaken any per-task security property; re-run offline-egress + adversarial spot checks at chain level.

## Risks

- Late-found cross-task contract mismatch → integration glue stays minimal; real mismatches file back against the owning task instead of being papered over here.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix. No release to roll back (nothing published).

## Completion notes

(placeholder)
