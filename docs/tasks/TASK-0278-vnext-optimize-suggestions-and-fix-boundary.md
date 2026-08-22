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

- [ ] Default `optimize` on dirty-fixture repo exits 0 with findings, repo git-status clean afterward (hard assertion).
- [ ] `--fix` on fixture with user-owned conflicting file → proposes diff, refuses silent write.
- [ ] `--fix --dry-run` byte-identical to proposal output of default+plan flag (determinism).
- [ ] Managed block update preserves surrounding user text exactly (round-trip test).
- [ ] All nine detection categories have at least one triggering fixture test.

## Test steps

`pnpm vitest run tests/integration/optimize`.

## Risks

Suggestion noise on healthy repos → golden-repo negative test asserting zero findings.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
