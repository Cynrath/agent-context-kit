---
id: "TASK-0060"
title: "workflow expansion audit: security, benchmarks, compatibility"
status: pending
schemaVersion: 2
dependencies: ["TASK-0055", "TASK-0057", "TASK-0058", "TASK-0059"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Close the audit trail for the expansion (§22/§23/§27): every new subsystem gets security tests wired into the permanent gates, benchmark measurements for the six mandated cost areas (no unmeasured claims), and an explicit backward-compatibility audit proving legacy repositories are unaffected.

## Scope

- Security tests (permanent, in `tests/security/`): forged-evidence attempt, forged-verdict attempt, workflow-state tamper (unknown fields / traversal ids), stale-checkpoint reuse attempt, cross-repository artifact confusion (task id from repo A against store of repo B), policy-bypass attempt (`--force` under deny), no-execution proof for gates schema, journal redaction audit; extend `tests/security/offline-runtime.test.ts` to run the new command families (workflow, intent, checkpoint, evidence, verification, drift, role, journal) under the network spy.
- Benchmarks (`benchmarks/run.mjs` + `benchmarks/generate-fixtures.mjs`): extend the harness with workflow-fixture measurements: `taskPackMs` (task-aware pack generation), `checkpointCreateMs`, `checkpointLoadMs`, `evidenceValidateMs`, `bundleMs` (verification bundle generation), `driftMs`, `policyEvalMs` — median-of-3 on the existing deterministic fixture classes; results recorded in `benchmarks/results/` (committed summary JSON, not machine paths) and in task completion notes with actual values.
- Compatibility audit: fixture-based legacy repository (ackit.yml without `workflow:` section, tasks without refs, no `.ackit/workflow/` state) — full CLI/SDK surface behaves identically to v0.2.2 (snapshot test where output is deterministic: `task list/doctor`, `pack`, `scan`); migration guidance written (`docs/guides/workflow-adoption.md` owned by TASK-0061 references it).
- Cross-platform sensitivity: POSIX-path normalization tests for all new state files (already unit-tested per task; here verified on Windows CI path set in `.github/workflows/ci.yml` verify matrix — no CI changes needed unless a gap appears, then follow the existing pinning rules).
- Run the full gate suite and record results: `pnpm lint`, `format:check`, `typecheck`, `build`, `test`, `gen:schemas` (diff-clean), `smoke:cli`, `smoke:package`, `check-offline-egress.mjs`, CLI doctor/task-doctor/scan --ci, `git diff --check`, benchmarks run.

## Out of scope

- Documentation rewrite (TASK-0061) and final GO/NO-GO (TASK-0062).
- CI workflow modifications beyond existing structure (any change would follow pinning rules and needs its own justification).

## Affected files

- `tests/security/*.ts` (new/extended), `tests/security/offline-runtime.test.ts`
- `benchmarks/run.mjs`, `benchmarks/generate-fixtures.mjs`, `benchmarks/results/*.json`
- `tests/integration/compat/legacy-repository.test.ts` (new)
- Fixture additions under `fixtures/` where needed for realistic legacy repo

## Acceptance criteria

- [ ] All new security tests pass and are wired into the permanent suite (not skipped/relaxed); offline-egress covers all new families.
- [ ] Benchmark harness measures all six mandated areas with median-of-3; actual numbers recorded in completion notes (no "negligible" claims without numbers).
- [ ] Legacy compatibility snapshot/behavior tests pass on a fixture repository; documented conclusion: v0.2.2 behavior preserved for non-adopting repositories.
- [ ] Full gate suite green in one recorded run; `git diff --check` clean.

## Test steps

1. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build`
2. `pnpm test` (full, including new security/benchmark-guard tests)
3. `node benchmarks/run.mjs --classes small,medium` (record values)
4. `node scripts/check-offline-egress.mjs && pnpm smoke:cli && pnpm run smoke:package`
5. `node dist/cli/index.js doctor && node dist/cli/index.js task doctor && node dist/cli/index.js scan --ci && git diff --check`

## Security considerations

- This task is itself the security closure: every THREAT_MODEL T16+ row must point at a passing regression test (audit matrix recorded in completion notes).

## Risks

- Benchmark noise on shared CI machines — use median-of-3 and local primary recording, consistent with existing methodology.

## Rollback plan

Focused revert of test/benchmark additions; no product-code rollback needed.

## Completion notes

(placeholder)
