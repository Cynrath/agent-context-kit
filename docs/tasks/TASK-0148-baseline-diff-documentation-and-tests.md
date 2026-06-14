# TASK-0148 Baseline Diff Documentation And Tests

## Purpose
Document and test how `ackit baseline` reports existing versus new findings, including a copy-ready before/after example for `scan --baseline <path> --ci`.

## Current State
- `src/AgentContextKit.Core/Baseline.cs` and `BaselinePolicy.cs` implement the baseline model and policy.
- `docs/BASELINE_MODEL.md` describes the model.
- No focused public cookbook or guard test covers the existing-versus-new classification output.

## Scope
- Add a short cookbook section in `docs/BASELINE_MODEL.md` with a copy-ready `scan --baseline` example.
- Add a focused test that asserts the baseline classification is preserved in JSON output.
- No new baseline schema, no fingerprint change.

## Out Of Scope
- Changing the baseline schema.
- Changing the default exit code.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/BASELINE_MODEL.md` (additive cookbook only).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Add a short example showing how `existing` versus `new` findings appear in JSON output.
2. Add a focused test that creates a baseline, modifies the fixture, and asserts the classification changes.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 209+/209+ green.
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
- `test: add baseline classification cookbook test`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
