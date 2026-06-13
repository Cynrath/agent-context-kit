# TASK-0128 Hosted Release-Candidate Evidence Hardening

## Purpose
Make hosted candidate evidence exact-SHA, privacy-safe, permission-minimal, and suitable for future GO/NO-GO decisions.

## Current State
The manual RC workflow existed without reviewed exact-SHA hosted evidence.

## Scope
Harden workflow inputs/concurrency/permissions/output summaries, static gates, and execute read-only hosted evidence for an exact reviewed commit.

## Out Of Scope
Publishing, tagging, release editing, settings changes, or artifact upload unless explicitly safe and required.

## Affected Files
RC workflow/scripts/tests/docs/evidence/queue/handoff files.

## Implementation
Require exact commit/version inputs, verify master ancestry/state, preserve no-upload boundaries, add negative static checks, dispatch and record results.

## Security/Privacy Boundary
No raw findings, secrets, local paths, package credentials, SARIF upload, or repository write permissions.

## Compatibility
No product contract change.

## Acceptance Criteria
Workflow gate passes and exact commit completes Windows/Ubuntu/macOS evidence with documented results.

## Tests
Static permission/input checks, invalid SHA/version tests, local evidence scripts.

## Validation
Full local gates and hosted run inspection.

## Rollback
Revert workflow hardening; retain previous evidence as historical.

## Completion Evidence
Completed on 2026-06-13. Exact SHA/candidate/predecessor inputs, current origin/master validation, per-commit/version concurrency, read-only permissions, no-upload boundaries, and positive/negative input tests are enforced. First hosted run `27478415124` exposed a null `$env:TEMP` portability defect on Ubuntu/macOS. Commit `4c4fa64` added portable temp fallback without changing the 2,000-file/30-second threshold, passed standard 8/8, and hosted run `27478635057` then passed Windows, Ubuntu, and macOS. Benchmarks were 1.265s, 0.957s, and 0.684s respectively.

## Commit
`ci: harden hosted release candidate evidence`

## Push
Normal push after validation.

## Hosted Checks
Standard 8/8 plus dedicated RC workflow jobs.
