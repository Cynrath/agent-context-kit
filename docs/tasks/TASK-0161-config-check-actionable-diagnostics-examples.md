# TASK-0161 Config-check Actionable Diagnostics Examples

## Purpose
Provide and test small, copy-ready `.ackit/config.yml` examples that demonstrate valid, warning, and error conditions, plus the recommended starter fields, so operators can act on `ackit config-check` without rereading the source.

## Current State
- `docs/CONFIGURATION.md` lists five example config files under `docs/examples/config/`.
- `docs/CONFIGURATION.md` includes a small "Diagnostic Cookbook" added in TASK-0147.
- The current example files cover a few scenarios; no example explicitly demonstrates a "warning" or "error" `ackit config-check` outcome.
- The `AckitConfigValidator` already returns sanitized diagnostics for `UnknownKey`, `MalformedValue`, `CriticalSuppression`, and other codes.

## Scope
- Add a small "Actionable Examples" section to `docs/CONFIGURATION.md` that links to two new example files.
- Add a new `docs/examples/config/with-warning.yml` that triggers one warning and no error.
- Add a new `docs/examples/config/with-error.yml` that triggers one error.
- Add a focused guard test that asserts both new example files are non-empty, parse with the validator, and produce the expected diagnostic summary.
- No validator change, no schema change.

## Out Of Scope
- Changing the validator's behavior.
- Adding new diagnostic codes.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/CONFIGURATION.md` (additive link section only).
- `docs/examples/config/with-warning.yml` (new file).
- `docs/examples/config/with-error.yml` (new file).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Write the two new example files with safe starter content.
2. Add a short link section to `docs/CONFIGURATION.md`.
3. Add the guard test that asserts the validator accepts the warning example, rejects the error example, and surfaces the expected diagnostic summary.

## Security/Privacy Boundary
- Use only clearly non-real placeholder values.
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus example files and a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 240+/240+ green.
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
- `docs: add actionable config diagnostics examples`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
