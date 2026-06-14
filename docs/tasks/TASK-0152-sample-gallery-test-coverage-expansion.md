# TASK-0152 Sample Gallery Test Coverage Expansion

## Purpose
Add focused tests that exercise `ackit scan`, `ackit report`, `ackit webui`, and `ackit sarif` against each safe sample repository under `samples/` so the sample gallery stays a reliable, copy-ready smoke reference.

## Current State
- `samples/` contains several safe sample repositories (dotnet-console, dotnet-minimal-api, generic-empty-repo, node-tooling, security-fixture-repo).
- `scripts/test-samples.ps1` runs `ackit scan --ci` and `ackit redact-check` on each sample.
- No focused xUnit test currently runs the Core scanner against each sample to assert stable stack and risk signatures.

## Scope
- Add a small xUnit test class that runs the Core scanner against each safe sample and asserts the expected stack and risk summary.
- No sample files are modified; no scanner changes.

## Out Of Scope
- Modifying the safe sample repositories.
- Adding new sample repositories.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `tests/AgentContextKit.Tests/` (new sample coverage test).

## Implementation
1. Inspect each `samples/*` directory and confirm it exists in the repository.
2. Add a focused test that runs the Core scanner against each sample and asserts at least the expected stack name appears.
3. Confirm `scripts/test-samples.ps1` still passes.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive guard test. No scanner or sample change.

## Acceptance Criteria
- New test passes for every existing sample.
- `dotnet test` is 213+/213+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- One new xUnit test class with one focused test per safe sample.

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
- `test: add sample gallery coverage tests`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
