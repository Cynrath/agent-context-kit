---
id: "TASK-0063"
title: "workflow expansion final validation: scan gate regression, fresh-process e2e, task-first corrective dogfood"
status: completed
schemaVersion: 2
dependencies: ["TASK-0062"]
intentRef: "INTENT-0001"
specRefs: ["docs/decisions/ADR-0025-workflow-profiles-and-stage-contract.md", "docs/decisions/ADR-0026-evidence-and-independent-verification.md"]
decisionRefs: ["docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md"]
planRef: "docs/plans/final-validation-TASK-0063.md"
createdAt: "2026-09-01"
completedAt: 2026-09-02
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

- [x] AC-001: `scan --ci` exits 0 on the branch; scanner/policy/gate not
  weakened; deterministic finding-set comparison recorded (feature ==
  master for unsuppressed findings).
- [x] AC-002: this task is workflow-enabled (standard profile) with committed
  intent, live workflow state, evidence registry, fresh verdict, and
  completion allowed only through the composed gate; bundle for this task
  shows intent + workflow sections non-empty.
- [x] AC-003: e2e contains a genuine spawned-child-process resume assertion
  (separate OS process reading only persisted state) that passes.
- [x] AC-004: PR open (feat/workflow-expansion → master), all required checks
  green on the exact final SHA, run IDs recorded.
- [x] AC-005: fresh independent verifier verdict registered (PASS or
  PASS_WITH_WARNINGS, zero blocking findings) via the real flow.
- [x] AC-006: false prior claims corrected in committed docs; final report
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

FINAL VALIDATION REPORT (corrective work under this task).

### The three unresolved facts — resolved

1. **Missing exact-SHA CI evidence (mandate §0A)** — resolved: PR #7
   (feat/workflow-expansion → master) open and MERGEABLE with ALL 12
   required check runs green on the exact final head SHA
   `7e84f37edaa0ab70e1d5beffe05fd5c1fdec4075`: CI run `33579601080`
   (conclusion success — 11 jobs: verify ubuntu/macos/windows ×
   node22/24 = 6, self-scan dogfood, package-smoke ×3 OS, extension)
   plus the ACKit Action Dogfood job in run `33579601082` (success). Earlier candidate SHAs a36fd38
   (CI 33576495093 — lint format failures), 4bb5478 (CI 33576839318 —
   all green but superseded), and 7fa147a (CI 33578969093 — Windows
   node-22 readme-parity 30s timeout) each failed or were superseded;
   every failure was fixed task-first, pushed normally, and re-validated
   on the new SHA.
2. **Scan gate ambiguity (mandate §0B/§10)** — resolved as **Option 1
   (strict scan gate)**, proven deterministically: the accepted policy is
   `scan --ci` exit 0 (the CI `self-scan` job runs it; master `05bb30f`
   exits 0 — 159 findings, 3 unsuppressed LOW). The branch at the prior
   HEAD `47041d9` exited 1 with ONE new unsuppressed ACKIT003 HIGH finding
   in product code (`src/core/intent/types.ts:69`, the
   `secret: "INTENT-SECRET-CONTENT"` problem-code property tripping the
   credential-assignment regex) + 4 new SUPPRESSED test-fixture rows —
   NOT "identical baseline" as the previous report claimed. Fixed by
   renaming the property to `secretContent` (sibling-convention aligned;
   emitted finding-code value `INTENT-SECRET-CONTENT` byte-identical,
   contract-tested); scanner rule, policy, suppressions untouched (git
   diff master...HEAD on those files is empty). Post-fix deterministic
   comparison: branch unsuppressed set == master's (3 LOW:
   CHANGELOG.md ACKIT040, ackit-policy.yml ACKIT020,
   scripts/doc-verify.mjs ACKIT020), new=0, resolved=0, exit 0 —
   confirmed green in CI's self-scan job on the final SHA.
3. **Incomplete self-dogfood (mandate §0C)** — resolved: TASK-0062
   predates workflow-enablement (bootstrap limitation — its bundle showed
   "(no intent referenced)" / "(no workflow state — legacy task)");
   documented append-only in TASK-0062's corrections. TASK-0063 IS the
   real dogfood: workflow-enabled (standard profile: intent → plan →
   tasks → implement → verify), committed intent INTENT-0001 with
   fingerprint, evidence registry (6 criteria, per-criterion typed
   evidence), checkpoints CP-0001/CP-0002 with exact next actions, task
   resume rendering (intent summary + pending work + next action
   survived), drift checks (which found a REAL defect — see below),
   verification bundle with non-empty intent/workflow sections, fresh
   independent verifier verdict (AC-005), and completion ONLY through
   the composed gate (denial path exercised and recorded: unchecked
   criteria + REQUIRED_EVIDENCE_MISSING + MISSING_VERIFIER_VERDICT +
   WORKFLOW_STAGE_INVALID all blocked completion until resolved).

### Additional defects found & fixed during this validation (task-first)

- **Drift CLI decisionRefs gap (found BY the dogfood)**:
  `src/cli/commands/drift.ts` omitted `decisionRefs` from existence
  resolution while the core engine checked them → false
  `PLAN_REFERENCE_MISSING` on every valid decisionRef. Fixed (commit
  `7fa147a`) with a regression test
  (`tests/integration/drift/drift-cli.test.ts`: existing ref → no
  finding; absent ref → finding).
- **Parallel-mode flakiness root causes (mandate §11)**: (a)
  readme-parity tests ran `pnpm pack` inside the suite → `prepack` →
  `pnpm build && pnpm gen:schemas` rewrote `dist/` + `schemas/` while
  sibling tests read them → switched to `npm pack --ignore-scripts`
  (tarball content identical; parity assertion unchanged); (b) vitest
  default 5s per-test timeout too tight for I/O-heavy lifecycle tests
  under load → global `testTimeout: 60000` + explicit 120s/60s/30s
  lifecycle timeouts; (c) ENOTEMPTY teardown race on Windows (spawned
  child finalizing handles) → rm retry options. Post-fix: 5+
  consecutive full parallel runs green locally (92 files / 509→510
  tests) and green in CI on all 6 verify matrix jobs.
- **Windows CI readme-parity 30s timeout** (CI-only, ~35s pack on slow
  runners): raised to 120s; re-validated green
  (`verify windows-latest / node-22` pass, run `33579601080`).

### Final gate matrix (final SHA 7e84f37, recorded)

`pnpm lint` 0 problems (287 files) · `pnpm format:check` clean ·
`pnpm typecheck` clean · `pnpm build` ok · `pnpm gen:schemas` idempotent
(no diff) · `pnpm test` (parallel) 92 files / 510 tests ALL PASSED ·
`pnpm smoke:cli` pass · `pnpm run smoke:package` pass (real tarball
v0.2.2) · `node scripts/check-offline-egress.mjs` PASS · `doctor` all
checks passed · `task doctor` integrity OK (plan-first advisory for
corrective work on already-touched files — expected, documented) ·
`scan --ci` exit 0 · `git diff --check` clean · benchmarks re-validated
(median-of-3, committed `benchmarks/results/baseline-2026-09-02.json`,
values within noise of the 09-01 baseline).

### Verdict

Fresh independent verifier verdict VR-0001 for TASK-0063 =
**PASS_WITH_WARNINGS, zero blocking findings** (registered via
`ackit verification record` and stored at
`docs/evidence/TASK-0063-verdict.yaml`; local copy at
`.ackit/workflow/TASK-0063/verdicts/VR-0001.yaml`). The verifier
independently spot-checked: scan exit codes + fingerprint parity vs a
git-archive master baseline, the scanner-rule/policy empty diff, the
spawned-OS-process e2e, PR checks via the GitHub API (12/12 success on the
exact SHA), the append-only corrections, and the live workflow/evidence/
checkpoint state. Registered warnings (non-blocking, both addressed by this
session): CHECK_COUNT_MISMATCH (report now says 12) and
POLICY_BOUNDARY_WIRING_PENDING (TASK-0064, in flight under this same
session, closes exactly that). The completion gate then allowed completion
through the composed blockers.

### Remaining limitations (explicit)

1. Policy v2 enforcement covers only ACKit-owned boundaries
   (provider-side interception remains advisory — ADR-0028).
2. `.ackit/` workflow state is deliberately local (ADR-0027);
   cross-machine transfer via explicit exports only.
3. Benchmark warm-up costs for checkpoint-create and bundle generation
   (~120-230 ms first-call on this machine class).
4. README "experimental branch" labels on the workflow feature rows
   are accurate while unmerged; the merge author must update them
   post-merge.
5. One load-dependent vitest timeout failure was observed in ~10 local
   full-suite runs under extreme machine load (before the final
   timeout configuration); CI (6-job matrix, 3 runs on the final SHA
   family) never reproduced it after the fixes.
