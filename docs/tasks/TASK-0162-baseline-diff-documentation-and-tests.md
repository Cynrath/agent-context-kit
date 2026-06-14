# TASK-0162 Baseline Diff Documentation And Tests

## Purpose
Document and test the baseline diff workflow so a reader can understand when a finding is `existing` versus `new`, and so a regression test confirms the existing classification behaviour is preserved.

## Current State
- `docs/BASELINE_MODEL.md` describes the baseline model and the existing-versus-new cookbook added in TASK-0148.
- The Core `BaselineClassifier` and `BaselinePolicy` are already tested.
- `docs/CI_USAGE.md` may not currently link to the baseline workflow.

## Scope
- Add a short reference to `docs/BASELINE_MODEL.md` from `docs/CI_USAGE.md` and `docs/JSON_OUTPUT.md`.
- Add a focused regression test that creates a baseline, modifies a finding's severity, and asserts the escalation is treated as a new finding.
- No baseline schema change, no fingerprint change, no exit code change.

## Out Of Scope
- Changing the baseline schema or fingerprint algorithm.
- Changing the default `scan --baseline <path> --ci` exit code.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/CI_USAGE.md` (additive link only).
- `docs/JSON_OUTPUT.md` (additive link only).
- `tests/AgentContextKit.Tests/` (regression test).

## Implementation
1. Add a short link to the baseline section.
2. Add a regression test that asserts a severity escalation reclassifies the finding as `new`.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a regression test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 241+/241+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- One new xUnit test.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: clarify baseline diff workflow`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
