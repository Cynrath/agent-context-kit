---
id: "TASK-0064"
title: "policy v2 boundary wiring, review-policy gate integration, and audit-fidelity corrections"
status: active
schemaVersion: 2
dependencies: ["TASK-0063"]
intentRef: "INTENT-0001"
specRefs: ["docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md"]
decisionRefs: ["docs/decisions/ADR-0025-workflow-profiles-and-stage-contract.md"]
planRef: "docs/plans/final-validation-TASK-0064.md"
createdAt: "2026-09-02"
completedAt: null
---

## Purpose

Close the gaps found by the independent final-validation audit so the
shipped code matches ADR-0028's enforcement claims and the docs match the
shipped surface: wire the two declared-but-unenforced autonomy boundaries
(checkpoint export, verdict registration), wire the review policy
(`checkVerdictAgainstReview` + `blockingSeverity`) into the completion gate
through the documented `VERDICT_BLOCKING` path, fix stale SDK documentation,
and align the MCP drift tool's input resolution with the CLI. Without this,
ADR-0028 §1/§2 overstate enforcement — an evidence-truth violation under the
repository's own rules.

## Scope

1. **Boundary wiring (ADR-0028 §1)**: `evaluateBoundary("checkpointExport", …)`
   enforced in `src/cli/commands/checkpoint.ts` export paths (checkpoint
   export + handoff pack export); `evaluateBoundary("verdictRegistration", …)`
   enforced in `src/cli/commands/verification.ts` record path. Deny → the
   documented `POLICY-TIER-DENIED` exit-4 behavior (mirroring
   `task complete --force` in `task.ts:203-269`); ask in non-tty → deny;
   journaled as `policy-decision`.
2. **Review-policy gate integration (ADR-0028 §2)**: the workflow
   completion gate (`src/core/tasks/store.ts`) consults
   `checkVerdictAgainstReview` for workflow-enabled tasks when a review
   policy declares `required` dimensions: missing dimension coverage or a
   finding at/above `blockingSeverity` surfaces as a `VERDICT_BLOCKING`
   blocker (never silently allowed; never fires when no review policy is
   configured — legacy/no-review behavior unchanged). `blockingSeverity`
   becomes enforced (remove the dead `void severities` line; compare
   finding severity against the configured blocking set). Deny stays
   deny-sticky; policy layers resolve document-over-config as today.
3. **Docs truth (audit finding 15a)**: `docs/reference/sdk.md` — remove the
   stale "Reserved … not yet exported" claims for `scoreRepository` /
   `evaluateRulePack` (both exported since v0.2.0) and align the symbol
   table with the actual `src/index.ts` allowlist.
4. **MCP drift fidelity (audit finding 15b)**: `src/mcp/server.ts`
   `ackit_drift_check` resolves the same artifact/reference inputs the CLI
   resolves (`intentRef`/`specRefs`/`decisionRefs`/`planRef` existence,
   evidence/verdict presence) so the tool's findings match the CLI's for the
   same repository state.
5. **Completion-gate negative-test coverage (audit finding 9)**: add the two
   missing negative assertions to
   `tests/unit/tasks/completion-gate.test.ts`: (a) blocking drift alone denies
   completion; (b) missing verdict alone (with evidence complete and stage
   valid) denies completion.

## Out of scope

- Re-scoping ADR-0028 itself (the wiring makes the ADR true; no ADR rewrite).
- The workflow config-override keys (`workflow.defaultProfile` etc.) —
  parsed-but-unwired config surface noted by the audit: NOT wired here;
  instead the dead keys are REMOVED from the config schema? No — removal is a
  config-compatibility break for any repository that already set them; the
  chosen treatment: keep parsing (accepting unknown keys was already the
  strict-rejection alternative) but mark the section's keys as inert in the
  config reference doc, and file the wiring gap as a documented known
  limitation in TASK-0063's report. Wiring `resolveProfileRequirements` into
  gate behavior would change completion-gate semantics for existing
  workflow-enabled repositories mid-validation — a behavior change beyond
  this corrective task's mandate.
- Convert the advance-gate planning-artifact check to disk existence
  (audit finding 1b): changing `workflow advance` gate semantics mid-merge
  could invalidate existing state files; recorded as a follow-up instead
  (see TASK-0063 final report limitations).
- Checkpoint atomic-write hardening (audit finding 4): true temp+rename
  atomicity; cosmetic crash-window risk only; follow-up.
- Browser Companion, publish, merge, tags (all out of scope per governance).

## Dependencies

- TASK-0063 (final validation session context; this is its audit-remediation
  follow-up within the same session mandate).

## Affected files

- src/cli/commands/checkpoint.ts
- src/cli/commands/verification.ts
- src/core/tasks/store.ts
- src/core/policy/tiers.ts
- src/mcp/server.ts
- docs/reference/sdk.md
- docs/reference/config.md
- tests/integration/policy/policy-v2-cli.test.ts
- tests/unit/tasks/completion-gate.test.ts
- tests/unit/policy/policy-v2.test.ts
- tests/contract/mcp/mcp-conformance.test.ts
- docs/tasks/active/TASK-0064*
- docs/plans/final-validation-TASK-0064.md

## Required tests

- Boundary enforcement: `checkpoint export` and `handoff` export + `verification
  record` under a tier2-deny policy → `POLICY-TIER-DENIED` exit 4; under allow
  → proceed; journaled `policy-decision`. (extend
  `tests/integration/policy/policy-v2-cli.test.ts`)
- Review-policy gate: workflow-enabled task completion with a review policy
  requiring a dimension the verdict's findings do not cover → blocked with
  `REVIEW-DIMENSION-MISSING` via the VERDICT_BLOCKING path; with coverage
  present → allowed; with no review policy → unchanged behavior (no new
  blockers); finding severity at/above blockingSeverity → blocked.
  (extend `tests/unit/tasks/completion-gate.test.ts` +
  `tests/unit/policy/policy-v2.test.ts`)
- MCP drift fidelity: same fixture through CLI and MCP tool → identical
  findings. (extend `tests/contract/mcp/mcp-conformance.test.ts`)
- Completion-gate negative tests (audit finding 9a/9b).
- Full gate matrix re-run on the new SHA; CI green on the exact new head.

## Acceptance criteria

- [ ] AC-001: `checkpointExport` and `verdictRegistration` boundaries enforced
  with the documented exit-4 deny behavior, journaled, allow-path unchanged;
  integration tests green.
- [ ] AC-002: review policy enforced through the completion gate's
  VERDICT_BLOCKING path (dimension coverage + blockingSeverity), no-op when
  no review policy configured; unit + integration tests green.
- [ ] AC-003: `docs/reference/sdk.md` matches the actual exported allowlist
  (no "not yet exported" claims for shipped symbols); config reference marks
  the inert workflow keys honestly.
- [ ] AC-004: MCP `ackit_drift_check` resolves the same inputs as the CLI;
  conformance test proves identical findings for the same fixture.
- [ ] AC-005: completion-gate negative assertions (blocking-drift-only denial,
  missing-verdict-only denial) added and green.
- [ ] AC-006: full local gate matrix green on the new SHA; PR CI green on the
  exact new head SHA; fresh verifier verdict on the final state re-registered
  (append-only) if the prior verdict predates these changes.

## Test steps

1. `pnpm vitest run tests/unit/policy tests/integration/policy
   tests/unit/tasks/completion-gate.test.ts tests/contract/mcp` (focused)
2. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`
3. `pnpm test` (full parallel) — ≥2 consecutive green runs
4. `node dist/cli/index.js scan --ci` exit 0; `doctor`/`task doctor` OK;
   `git diff --check` clean
5. Push; watch CI on the exact new SHA; record run IDs/conclusions
6. Re-register fresh verifier verdict if verdict predates the changes;
   complete via the composed gate.

## Security considerations

- Boundary enforcement ADDS deny capability; allow-paths must remain
  byte-identical for existing repos without policy config (default table
  tier2=ask → non-tty ask=deny would BREAK exports — so default resolution
  must be checked: ADR-0028 §1 defaults `tier2: ask`; the
  `task complete --force` precedent treats non-tty ask as DENY. To avoid
  breaking every export for unpolicy'd repositories, the boundary check must
  run only when a policy/config layer ACTUALLY SET the tier explicitly —
  i.e., enforcement fires when the resolved tier decision is deny (explicit),
  and explicit ask behaves as the --force precedent (deny in non-tty).
  Default-table ask without any explicit layer must keep today's behavior
  (proceed) to preserve v0.2.2 compatibility. This nuance is asserted in
  tests.
- Review-gate integration must never fire for legacy (non-workflow) tasks
  and must never block when no review policy is configured.
- MCP change is read-only input resolution parity; no mutation tools added.
- No scanner/policy threshold/gate weakening anywhere.

## Risks

- Completion-gate behavior change for review-policy-configured repos is
  intentional (that is the ADR-0028 §2 promise) but must be additive-only:
  repos without review config see zero change (tested).
- Boundary ask/deny default nuance (above) — the compatibility-preserving
  resolution is asserted by tests on both sides.
- CI may reveal platform differences; fix task-first on the new SHA.

## Rollback plan

Focused revert of the five independent commits (boundaries, review gate,
sdk docs, MCP fidelity, negative tests). No data/state migrations involved.

## Completion notes

(placeholder)
