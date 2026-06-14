# TASK-0158 Turkish CLI Output Locale Fallback

## Purpose
Guard the Turkish `--lang tr` CLI output paths so future English-only additions to the text provider do not silently drop into English when Turkish is requested.

## Current State
- `LocalizationParityTests` already asserts Turkish JSON invariance and several locale parity scenarios.
- No focused test currently asserts that every Turkish human-readable CLI string is non-empty and uses UTF-8 Turkish characters or the documented fallback.

## Scope
- Add a focused xUnit test that asks the text provider for every documented `Get(key, "tr")` string and asserts the result is non-empty and differs from the English fallback.
- No new text provider keys, no CLI argument change.

## Out Of Scope
- Adding new text provider entries.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Enumerate the text provider keys that the CLI uses in human output.
2. Add a guard test that asserts the Turkish value is non-empty and not equal to the English value for each key.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 233+/233+ green.
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
- `test: add turkish cli output locale fallback guard`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
