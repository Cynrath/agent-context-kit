---
id: "TASK-0104"
title: "Action optimize projection and cold consumer corrective verification"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0101"
createdAt: "2026-11-17"
completedAt: 2026-11-17
---


## Purpose

Correct the final-audit gaps in the Action's advertised optimize command and
clean-consumer bootstrap before TASK-0102/0103 may proceed. Scoped edits, tests,
commits and PR work are authorized by the 2026-11-17 goal.

## Scope

- Confirmed source gap: the typed Action wrapper reads only report.findings,
  while CLI optimize emits report.suggestions; its severity threshold is ignored.
- Restore optimize projections without changing the original JSON report or
  scanner behavior. Reuse the canonical SARIF writer with source suggestion IDs,
  severities and relative locations; do not invent a parallel report format.
- The same scanner-only validation rejects advertised `drift check` findings
  (`code/detail`, blocking/warning). Add its explicit projection, preserving raw
  JSON and CLI codes; map blocking to high and warning to medium for Action
  thresholds. Global task drift has no invented file location in SARIF.
- The shared SARIF writer currently emits raw path characters. Encode URI path
  segments for spaces, fragment/query characters and Unicode per SARIF 2.1.0
  section 3.10.4, preserving path separators and the existing report contract.
- CLI optimize has its own raw-path SARIF construction. Route that existing
  format through the same typed suggestion projection and canonical writer, so
  CLI and Action reports stay semantically identical and URI-safe.
- The real clean-consumer smoke failed at its frozen install with an empty error
  because the helper reads only stderr. Surface safe stdout/error/status details,
  diagnose the actual bootstrap failure, and fix its source contract without
  bypassing frozen install, build or process exit checks.
- Extend focused and actual consumer regressions for optimize and bootstrap.

## Out of scope

- New public CLI/SDK features, untrusted rule execution, network in product code,
  unrelated dependency upgrades, publication, permission or credential changes.

## Affected files

- `src/action/runtime.ts`, canonical SARIF input typing if required,
  `tests/unit/action/runtime.test.ts`, Action distribution contracts,
  `scripts/action-consumer-smoke.mjs`, `action.yml` only if the observed bootstrap
  contract requires correction, and affected CI guide/task evidence.
- `src/cli/commands/optimize.ts` for its existing SARIF format only; JSON and
  business logic remain unchanged.
- A small adjacent consumer-command helper to isolate real subprocess diagnostic
  testing from the expensive repository export/install fixture. The first full
  run had 771 passes/1 failure: the diagnostic test ended with empty stderr
  before its expected marker, while focused/real consumer checks passed. Test
  the same actual failing child/status/stdout/redaction boundary directly; do
  not raise timeouts, remove assertions or skip the full consumer check.

## Dependencies

TASK-0101 (including TASK-0098). TASK-0102 is temporarily pending on this task;
its existing version/docs/workflow changes are preserved on the same branch.

## Required tests

- Action/scanner/SARIF/parity contracts, real clean-source consumer including
  optimize; lint/format/typecheck/build and affected full tests; offline/ACKit
  doctor/task doctor/scan and `git diff --check`.

## Acceptance criteria

- [x] Optimize above/below-threshold and CLI-error cases return correct codes;
  original JSON remains unchanged and canonical SARIF has source IDs/locations.
- [x] Real exported source frozen-installs and builds, then scan/optimize work
  from an independent repository with no consumer dependencies/dist.
- [x] A failed consumer command reports a useful sanitized status/cause and
  remains a hard failure; no frozen/build/threshold test is skipped or masked.
- [x] SARIF artifact URIs encode reserved/Unicode path characters correctly.
- [x] Nonempty drift reports remain available, with documented severity mapping
  and valid location-free SARIF results for task-level findings.
- [x] Focused/full affected quality, offline and ACKit checks pass with evidence.

## Test steps

1. Add the optimize regression and record its failure against the current wrapper.
2. Improve only the consumer diagnostic, reproduce its frozen-install failure,
   then fix the verified cause at the owning bootstrap/export surface.
3. Validate optimize JSON/SARIF/thresholds and rerun the actual clean-consumer flow.
4. Run affected full gates; record real results before completion/commit, then
   immediately resume TASK-0102's final release preparation.

## Security considerations

No environment/credential dump. Redact scratch/source paths in diagnostics.
Only trusted Action source is installed/built; never consumer scripts. Preserve
offline execution, injection-safe argv, policy suppression and nonzero CLI codes.
No data migration, deployment, tag or publication operation.

## Risks

- Suggestions differ from scanner findings; projection must preserve their
  category/identity without weakening scanner schema validation.
- A bootstrap failure may be environmental; distinguish it using observed output
  rather than assuming a repository or dependency defect.

## Rollback plan

Forward corrective PR/commit only; preserve all existing work and immutable tags.

## Completion notes

Verified 2026-11-17 on Windows / Node 26.13.1 / pnpm 11.22.0.

- Before-fix optimize regression: expected exit 1, actual 0. Typed projections
  now handle scanner findings, optimize suggestions and drift code/detail data
  while preserving original JSON. Scan schemas remain strict; missing expected
  arrays fail closed. CLI nonzero codes win over threshold results.
- Drift blocking/warning map to high/medium only in the Action projection.
  Task-level SARIF omits invented file locations; check-active's successful
  silent legacy no-op is preserved. CLI optimize and Action share one canonical
  SARIF suggestion projection/writer. Reserved/Unicode path segments are encoded.
- Real clean export/frozen install/build/independent consumer PASS repeatedly
  at 0.5.5: scan/optimize/drift above/below thresholds, actual invalid-option
  CLI errors, legacy no-op, original reports, and CLI/Action optimize SARIF
  equality. Consumer supplies no node_modules or dist.
- The initial opaque install failure was not reproduced; original stdout was
  unavailable, so no source/environment root cause is invented. Frozen/build
  gates were unchanged. A bounded process helper now includes stdout/error/status
  and sanitizes source/fixture paths. Its real failing-child test asserts exact
  outer exit 1, inner exit 7, stdout cause and path redaction.
- First full run: 771 PASS / 1 diagnostic-test failure (empty stderr before its
  expected marker) / 3 existing skips. The diagnostic boundary was isolated from
  unnecessary full repository export; no timeout was raised and no assertion
  or consumer gate was removed. Final full run: 125 files PASS; 772 tests PASS,
  3 unchanged Windows privilege-dependent symlink skips (775 total).
- Focused Action/diagnostic/reporting/projection/drift suites: 5 files / 36 PASS.
  Root lint, format, typecheck, build, doctor/task doctor, scan --ci (exit 0),
  offline-egress and git diff --check PASS. A transient Windows Biome file-mapping
  write error cleared on the explicit rerun; final lint/format passed normally.
- Actual scan/optimize/drift SARIF documents validate against both current
  [OASIS 2.1.0 errata schema](https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json)
  and the producer-declared SchemaStore schema, with standard format validation.
  A deliberately invalid URI was rejected by both. No provider schema was edited
  and URI checks remained enabled.
- No new public SDK export, dependency, network/runtime capability, credential,
  permission, deployment, tag or publication change. Forward corrective commit
  is rollback. Resume TASK-0102 immediately, preserving its metadata/workflow work.

Dependencies: TASK-0101
