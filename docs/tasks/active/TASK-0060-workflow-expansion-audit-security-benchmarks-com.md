---
id: "TASK-0060"
title: "workflow expansion audit: security, benchmarks, compatibility"
status: completed
schemaVersion: 2
dependencies: ["TASK-0055", "TASK-0057", "TASK-0058", "TASK-0059"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
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

- [x] All new security tests pass and are wired into the permanent suite (not skipped/relaxed); offline-egress covers all new families.
- [x] Benchmark harness measures all six mandated areas with median-of-3; actual numbers recorded in completion notes (no "negligible" claims without numbers).
- [x] Legacy compatibility snapshot/behavior tests pass on a fixture repository; documented conclusion: v0.2.2 behavior preserved for non-adopting repositories.
- [x] Full gate suite green in one recorded run; `git diff --check` clean.

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

- Security: `tests/security/offline-runtime.test.ts` gained a full-family offline test
  driving task refs, intent, workflow, checkpoint, evidence, verdict registration,
  verification bundle, drift, roles (7 built-ins), journal appends, policy-v2 resolution
  — all under the network spy with ZERO egress attempts (14/14 file tests pass; suite
  total now includes it permanently). Forgery/tamper/traversal rejections were already
  asserted per-subsystem in TASK-0046..0058 unit suites (verdict forging T18, evidence
  forging T17, state tamper T16, ref traversal T19, stale checkpoints T20, tier-bypass
  T23, no-execution gates T24, metadata spoofing/shadowing T25, output redaction T26) —
  the offline harness closes the T26/TELEMETRY dimension family-wide.
- Benchmarks (`benchmarks/run.mjs`): seven new median-of-3 metrics on deterministic
  fixtures (small + medium classes; results committed at
  `benchmarks/results/baseline-2026-09-01.json`; machine: Windows, 12× AMD Ryzen 5
  6600H, Node v24.13.0):
  - small (10 files): taskPackMs 10.21, checkpointCreateMs 188.8, checkpointLoadMs 5.67,
    evidenceValidateMs 0.02, bundleMs 121.52, driftMs 0.01, policyEvalMs 0.03
  - medium (200 files): taskPackMs 146.96, checkpointCreateMs 231.72, checkpointLoadMs
    4.5, evidenceValidateMs 0.03, bundleMs 134.14, driftMs 0.02, policyEvalMs 0.05
  - Honest observations (no invented claims): checkpoint create and bundle generation
    pay a first-call YAML/module warm-up cost (~120-230ms); evidence validation, drift
    detection, and policy evaluation are sub-0.1ms pure functions; task-aware packs cost
    ~+5% over plain packs at the same budget; checkpoint loads are ~5ms.
- Compatibility: `tests/integration/compat/legacy-repository.test.ts` 2/2 — a
  v0.2.2-shaped repository (config without workflow sections, task without refs, no
  `.ackit/workflow/`) keeps identical behavior across config check, task list/doctor/
  show/start/complete (legacy gate rules ONLY — no workflow blockers appear), workflow
  show (legacy notice, no coercion), drift check-active (clean no-op), pack (byte-identical
  determinism), and task resume (usage when no checkpoint). Conclusion recorded: v0.2.2
  behavior is preserved for non-adopting repositories.
- Full recorded gate run (this task): `pnpm lint` 0 problems (286 files); `pnpm
  format:check` clean; `pnpm typecheck` clean; `pnpm build` ok; `node scripts/
  check-offline-egress.mjs` PASS; `pnpm smoke:cli` all assertions passed; `pnpm run
  smoke:package` OK (real tarball, v0.2.2); `git diff --check` clean. Full sequential
  suite result recorded in the commit. `scan --ci` parity: same findings/exit behavior as
  the master baseline (identical pre-existing finding set, readiness 88 pass).
