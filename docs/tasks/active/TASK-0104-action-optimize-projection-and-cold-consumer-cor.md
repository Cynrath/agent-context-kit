---
id: "TASK-0104"
title: "Action optimize projection and cold consumer corrective verification"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0101"
createdAt: "2026-11-17"
completedAt: null
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

## Dependencies

TASK-0101 (including TASK-0098). TASK-0102 is temporarily pending on this task;
its existing version/docs/workflow changes are preserved on the same branch.

## Required tests

- Action/scanner/SARIF/parity contracts, real clean-source consumer including
  optimize; lint/format/typecheck/build and affected full tests; offline/ACKit
  doctor/task doctor/scan and `git diff --check`.

## Acceptance criteria

- [~] Optimize above/below-threshold and CLI-error cases return correct codes;
  original JSON remains unchanged and canonical SARIF has source IDs/locations.
- [ ] Real exported source frozen-installs and builds, then scan/optimize work
  from an independent repository with no consumer dependencies/dist.
- [ ] A failed consumer command reports a useful sanitized status/cause and
  remains a hard failure; no frozen/build/threshold test is skipped or masked.
- [ ] SARIF artifact URIs encode reserved/Unicode path characters correctly.
- [ ] Nonempty drift reports remain available, with documented severity mapping
  and valid location-free SARIF results for task-level findings.
- [ ] Focused/full affected quality, offline and ACKit checks pass with evidence.

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

CLI-allocated plan created 2026-11-17 from the final clean-consumer failure and
source review. No implementation for this corrective task before this plan.

The optimize regression was run before its fix: expected failure code 1, actual
0. A repeat clean install/build passed without changing bootstrap gates; the
earlier opaque install failure is not reproducible and its original stdout was
lost. Preserve that uncertainty; improve future failure visibility and require
fresh successful consumer checks. URI requirement verified against the
[OASIS SARIF 2.1.0 specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html).

Dependencies: TASK-0101
