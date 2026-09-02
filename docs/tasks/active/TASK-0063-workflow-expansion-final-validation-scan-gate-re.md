---
id: "TASK-0063"
title: "workflow expansion final validation: scan gate regression, fresh-process e2e, task-first corrective dogfood"
status: active
schemaVersion: 2
dependencies: ["TASK-0062"]
intentRef: "INTENT-0001"
specRefs: ["docs/decisions/ADR-0025-workflow-profiles-and-stage-contract.md", "docs/decisions/ADR-0026-evidence-and-independent-verification.md"]
decisionRefs: ["docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md"]
planRef: "docs/plans/final-validation-TASK-0063.md"
createdAt: "2026-09-01"
completedAt: null
---

## Purpose

Final validation of `feat/workflow-expansion`: resolve the three unresolved
facts of the governing prompt (missing exact-SHA CI evidence; `scan --ci`
exit-1 regression mislabeled as baseline parity; incomplete self-dogfood of
TASK-0062) and bring the branch to a genuinely evidence-backed merge-readiness
state, culminating in a PR to `master` with green CI on the exact final SHA and
a fresh independent verifier verdict, without merging.

## Scope

- **Scan gate regression (AC-001)**: fix the single new unsuppressed ACKIT003
  HIGH finding at `src/core/intent/types.ts:69` (the `secret:
  "INTENT-SECRET-CONTENT"` problem-code constant trips the credential-
  assignment scanner regex) by renaming the constant's value emission so the
  line no longer matches the generic credential-assignment pattern, WITHOUT
  weakening the scanner rule, its policy, or its tests; then prove determinism
  by re-running the JSON-fingerprint comparison (feature unsuppressed set
  equal to master's, exit 0). The value string `INTENT-SECRET-CONTENT` is the
  public finding code referenced by docs/tests — the fix must keep the
  externally documented finding code intact, so the fix targets the source
  line shape (constant key naming / value quoting), not the contract.
- **Fresh-process e2e (AC-003)**: strengthen the CORE PRODUCT TEST with at
  least one genuine child-process resume: spawn `node dist/cli/index.js task
  resume <id>` (separate OS process, no shared JS memory, reads only persisted
  state) and assert it yields the same resume result as the in-process path.
- **Real dogfood (AC-002)**: dogfood the complete new system on this very
  task: `workflow set` standard profile, stage advancement, evidence registry
  via `evidence sync/verify`, checkpoint, verification bundle, fresh-context
  verifier verdict, completion gate.
- **PR + exact-SHA CI (AC-004)**: push `feat/workflow-expansion` normally,
  open the PR to `master` with the mandated body, wait for and record all
  required checks on the exact final SHA (run IDs, job names, conclusions);
  fix task-first if failures appear.
- **Fresh verifier (AC-005)**: after CI green, build the verification bundle
  from the final SHA, hand it to a genuinely fresh-context verifier
  subagent, register the verdict via the real flow.
- **Documentation truth (AC-006)**: correct the false scan-parity claims in
  TASK-0060/0062 completion notes (append-only correction, no history
  rewrite), record the real dogfood outcome, and produce the final report.

## Out of scope

- Any merge to `master`, npm publish, tag creation/movement, release (all
  user-authorized actions outside this task).
- Browser Companion (paused; separate preserved branch).
- Weakening any scanner rule, policy threshold, test, or CI gate.
- Changing the scan gate definition (Option 1 strict gate stays: CI runs
  `scan --ci` and master exits 0, so the branch must too).
- Migrating historical TASK-0062 itself to workflow-enabled state (would
  falsify history; the bootstrapping limitation is documented instead, and
  this task is the real dogfood).

## Dependencies

- TASK-0062 (final integration/verification task — its reported GO is the
  input being validated).

## Affected files

- src/core/intent/types.ts
- src/core/intent/store.ts
- src/cli/commands/drift.ts
- vitest.config.ts
- tests/e2e/core-product-test.test.ts
- tests/contract/readme-parity.test.ts
- tests/integration/checkpoint/checkpoint-cli.test.ts
- tests/integration/drift/drift-cli.test.ts
- benchmarks/results/baseline-2026-09-02.json
- docs/tasks/active/TASK-0063*
- docs/intent/INTENT-0001*
- docs/plans/final-validation-TASK-0063.md
- docs/tasks/active/TASK-0060*
- docs/tasks/active/TASK-0062*
- docs/evidence/*

## Required tests

- `pnpm vitest run tests/e2e/core-product-test.test.ts` — full lifecycle green
  including the new spawned-process resume assertion.
- `pnpm vitest run tests/contract/readme-parity.test.ts` and repeated parallel
  full-suite runs (`pnpm test`) — pack race resolved; parallel mode green.
- `node dist/cli/index.js scan --ci` — exit 0 on the branch (the same command
  that exits 0 on master).
- JSON fingerprint comparison: feature-branch unsuppressed finding set ==
  master's (empty diff).
- Full gate matrix (lint, format:check, typecheck, build, gen:schemas
  diff-clean, test, smoke:cli, smoke:package, offline-egress, doctor, task
  doctor, scan --ci, git diff --check) on the final SHA.
- CI on the PR: verify matrix (6 jobs), self-scan, package-smoke (3 jobs),
  extension — all required checks green on the exact head SHA.

## Acceptance criteria

- [ ] AC-001: `scan --ci` exits 0 on the branch; scanner/policy/gate not
  weakened; deterministic finding-set comparison recorded (feature ==
  master for unsuppressed findings).
- [ ] AC-002: this task is workflow-enabled (standard profile) with committed
  intent, live workflow state, evidence registry, fresh verdict, and
  completion allowed only through the composed gate; bundle for this task
  shows intent + workflow sections non-empty.
- [ ] AC-003: e2e contains a genuine spawned-child-process resume assertion
  (separate OS process reading only persisted state) that passes.
- [ ] AC-004: PR open (feat/workflow-expansion → master), all required checks
  green on the exact final SHA, run IDs recorded.
- [ ] AC-005: fresh independent verifier verdict registered (PASS or
  PASS_WITH_WARNINGS, zero blocking findings) via the real flow.
- [ ] AC-006: false prior claims corrected in committed docs; final report
  complete; no misleading GO/CI claims anywhere.

## Test steps

1. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`
2. `pnpm vitest run tests/e2e/core-product-test.test.ts`
3. `pnpm test` (parallel) — repeat ≥2 times to confirm the pack race fix
4. `node dist/cli/index.js scan --ci` (expect exit 0) + JSON fingerprint
   comparison against the master baseline export
5. `node scripts/check-offline-egress.mjs && pnpm smoke:cli && pnpm run smoke:package`
6. `node dist/cli/index.js doctor && node dist/cli/index.js task doctor`
7. `git diff --check && git status --short`
8. Push branch; open PR; watch CI; record run IDs and conclusions on the
   exact final SHA
9. Dogfood: `workflow set TASK-0063 --profile standard`, advance stages as
   evidence lands, `evidence sync/verify`, checkpoint, `verification bundle`,
   fresh verifier verdict, `task complete TASK-0063` (composed gate).
10. Final report.

## Security considerations

- The intent-constant fix must not reduce secret-detection coverage: the
  scanner rule regex is untouched; only the source line that accidentally
  matches it changes. `tests/security/secrets/secrets.test.ts` and all
  scanner pipeline tests must stay green unmodified.
- Child-process e2e spawns only `node dist/cli/index.js` with a `--root` temp
  fixture; no shell interpolation of untrusted input (arguments are literal);
  fixture is removed in `afterAll`.
- The pack-race fix must not weaken the README parity assertion itself (only
  the harness's interference with concurrent tests).
- Verdict registration follows the append-only store; no post-issuance edits.

## Risks

- CI matrix may surface platform-specific failures invisible locally → fix
  task-first in follow-up commits under this same task, push, re-validate on
  the new SHA.
- The child-process spawn on Windows (path to `dist/cli/index.js`) needs
  `process.execPath` + repo-root-relative resolution, not shell strings.
- Renaming the constant could break the documented finding-code contract if
  done carelessly — the fix preserves the exact public code value
  (`INTENT-SECRET-CONTENT`) and changes only the line's source shape.

## Rollback plan

Focused revert of the intent-constant commit, the e2e child-process commit,
and the pack-race commit (three independent narrowly scoped commits). Docs
corrections roll back with their own commit. No product behavior beyond the
scanner-line false positive is touched.

## Completion notes

(placeholder)
