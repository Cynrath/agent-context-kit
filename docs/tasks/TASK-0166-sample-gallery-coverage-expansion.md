# TASK-0166 Sample Gallery Coverage Expansion

## Purpose
Expand the sample gallery coverage tests so every safe sample under `samples/` is asserted against the Core scanner and the `ackit config-check` command.

## Current State
- TASK-0152 added a `SampleGalleryCoverageTests` class that asserts the Core scanner stack and risk signatures for each safe sample.
- `scripts/test-samples.ps1` runs `ackit scan --ci` and `ackit redact-check` on each sample.

## Scope
- Add a focused test that runs the Core scanner against each safe sample and asserts the expected risk count is within a documented bound.
- Add a focused test that runs the `AckitConfigValidator` against any `samples/*/ackit/config.yml` file and asserts no errors.
- No new sample files, no scanner changes.

## Out Of Scope
- Modifying the safe sample repositories.
- Adding new sample repositories.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `tests/AgentContextKit.Tests/` (additional sample coverage tests).

## Implementation
1. Inspect each `samples/*` directory and confirm the existing tests.
2. Add a focused test that asserts the scanner finding count is within a documented bound.
3. Add a focused test that asserts the Core validator accepts any `samples/*/ackit/config.yml` if present.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive guard tests.

## Acceptance Criteria
- New tests pass.
- `dotnet test` is 245+/245+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- Two new xUnit tests.

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
- `test: expand sample gallery coverage`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
