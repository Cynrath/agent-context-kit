---
id: "TASK-0065"
title: "policy v2 reference doc and stale comment cleanup"
status: completed
schemaVersion: 2
dependencies: ["TASK-0064"]
intentRef: "INTENT-0001"
planRef: "docs/plans/final-validation-TASK-0064.md"
createdAt: "2026-09-02"
completedAt: 2026-09-02
---

## Purpose

Close the two info-severity residuals from the TASK-0064 fresh-verifier
verdict: ADR-0028 cites `docs/reference/policy.md` for the
review-dimension code-prefix registry but that document never existed
(branch-introduced gap in architecture-doc parity, §13), and
`tests/contract/api-surface/api-surface.test.ts` still carries a stale
"v0.2.0 reserved extension points (not yet exported)" comment that
predates the branch but is now actively misleading next to the corrected
sdk.md.

## Scope

- Write `docs/reference/policy.md`: policy-v2 reference documenting the
  autonomy tier table (tiers 0-4, allow/ask/deny, deny-stickiness,
  defaults), ACKit-owned boundary enforcement semantics (explicit-tier
  compatibility rule, exit-4 deny, ask-as-deny in non-tty, journaling),
  review policy (required dimensions, the code-prefix registry that maps
  verdict finding codes to dimensions, blockingSeverity + the verdict
  severity mapping blocking→critical / warning→medium / info→below), and
  the enforced-boundary limitation (advisory for providers).
- Remove the stale reserved-extension-points comment from
  `tests/contract/api-surface/api-surface.test.ts` (keep the actual
  allowlist test untouched).

## Out of scope

- Any behavior change; docs + comment only.
- Wiring the inert `workflow:` config keys (documented follow-up).
- Browser Companion, merge/publish (out of scope by governance).

## Dependencies

- TASK-0064 (its verdict flagged the residuals).

## Affected files

- docs/reference/policy.md
- docs/tasks/active/TASK-0065*
- tests/contract/api-surface/api-surface.test.ts

## Required tests

- `pnpm vitest run tests/contract/api-surface` (unchanged behavior,
  comment-only edit).
- Docs-gate suite (`tests/contract/docs-gate.test.ts`) if it indexes
  reference docs — verify green.

## Acceptance criteria

- [x] AC-001: `docs/reference/policy.md` exists and documents the tier
  table, boundary enforcement semantics, review dimensions + code-prefix
  registry, blockingSeverity mapping, and the provider-advisory limitation;
  consistent with ADR-0028 and with the shipped code (TASK-0064 wiring).
- [x] AC-002: the stale reserved-extensions comment is gone from
  api-surface.test.ts; the allowlist contract test still passes unchanged.

## Test steps

1. `pnpm vitest run tests/contract/api-surface tests/contract/docs-gate`
2. `pnpm lint && pnpm format:check`
3. `node dist/cli/index.js scan --ci` exit 0
4. Push; CI green on the exact new SHA.

## Security considerations

- None beyond documentation accuracy; no behavior change.

## Risks

- Docs drift if written loosely — mitigated by deriving the content directly
  from the TASK-0064 implementation and ADR-0028.

## Rollback plan

Revert the single docs commit.

## Completion notes

Executed 2026-09-02: docs/reference/policy.md written (tier table with
defaults + deny-stickiness, boundary table incl. the three enforced
surfaces and the explicit-tier compatibility rule, exit-4 semantics,
journaling, code-prefix registry, blockingSeverity severity mapping,
provider-advisory limitation); stale reserved-extensions comment replaced
with an accurate one in api-surface.test.ts. Evidence: tests 2 files / 8
tests green (api-surface 4 + docs-gate 4, allowlist contract unchanged);
lint 0/288; scan --ci exit 0. Verifier residual from TASK-0064's VR-0001
closed.
