# TASK-0278: vNext optimize suggestions and fix boundary

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0277, TASK-0273
- Unlocks: —
- Requirement IDs: REQ-CTX-005, REQ-GOV-008
- Related ADR/spec: ADR-0006; MS§15

## Purpose

Implement `ackit optimize` as read-only-by-default advisor with a strictly fenced fix mode.

## Scope

- Detection checks per REQ-CTX-005 list: redundant/conflicting instructions, huge context docs, stale generated files, duplicate skills, mis-scoped applyTo, oversized AGENTS/CLAUDE/GEMINI, missing workflow skill, missing task docs, budget overrun.
- Output: prioritized suggestions with evidence + remediation; JSON mode stable.
- Fix mode (`--fix`): only ACKit-managed surfaces (managed blocks, owned skills); non-managed content requires diff-first proposal output; `--fix --dry-run` prints planned diffs without writing.

## Out of scope

Rewriting user-authored content automatically (forbidden); policy thresholds (TASK-0282).

## Affected files

- `src/core/context/optimize/**` (or dedicated module), `src/cli/commands/optimize.ts`
- `tests/integration/optimize/**`

## Data/database impact

None.

## Security impact

Write path constrained to managed content; enforced by ownership checks reused from skills lock + instruction managed-block parser.

## Permission/auth impact

None.

## Localization impact

English.

## UX impact

Default run never mutates the repository (contract-tested zero-diff guarantee).

## Logging/audit impact

Fix actions summarized in stdout summary for audit.

## Acceptance criteria

- [x] Default `optimize` on dirty-fixture repo exits 0 with findings, repo git-status clean afterward (hard assertion).
- [x] `--fix` on fixture with user-owned conflicting file → proposes diff, refuses silent write.
- [x] `--fix --dry-run` byte-identical to proposal output of default+plan flag (determinism).
- [x] Managed block update preserves surrounding user text exactly (round-trip test).
- [x] All nine detection categories have at least one triggering fixture test.

## Test steps

`pnpm vitest run tests/integration/optimize`.

## Risks

Suggestion noise on healthy repos → golden-repo negative test asserting zero findings.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/context/optimize.ts` — analyzeOptimize (read-only) covering all nine REQ-CTX-005 categories by reusing the deterministic engines: conflicting-instructions/redundant-content/stale-reference/mis-scoped-applyto from TASK-0273 analysis (knownFiles wired for unreachable-glob detection), oversized-context-doc via token estimates on root instruction files, duplicate-skill from the skills validator, missing-workflow-skill + missing-task-docs advisories, budget-overrun from a real pack run at the configured budget, stale-generated-files for managed blocks differing from canonical shims.
- naiveLineDiff — LCS-based deterministic diff used for proposal previews.
- applyFixes — fenced fix mode: writes ONLY managed blocks (ensureManagedBlock) and lock-owned skills (installSkills); non-managed conflicts are never touched; --dry-run emits proposal diffs instead of writing (REQ-GOV-008).
- CLI `ackit optimize [--fix] [--dry-run]` — JSON mode ackit.optimize.v0; default exit 0.

Tests (38 files / 198 tests total, all green):
- Dirty fixture triggers all nine categories in one analysis; git status stays clean across init→analyze (hard zero-mutation assertion).
- Non-fixable conflict produces zero outcomes and leaves user bytes identical.
- LCS diff determinism with -/+/context lines asserted on a managed-block example.
- Managed-block round-trip preserves user prefix and trailing text exactly.
- Healthy fixture (workflow skill installed, docs/tasks present, clean instructions) yields ZERO suggestions (noise guard).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 38 files / 198 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
