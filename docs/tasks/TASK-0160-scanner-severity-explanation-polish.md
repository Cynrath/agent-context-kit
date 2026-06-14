# TASK-0160 Scanner Severity Explanation Polish

## Purpose
Make the severity explanations in the scanner rule catalog clearer and add a user-action table so the next reader knows what to do for each severity without parsing the source code.

## Current State
- `RiskRuleCatalog` in `src/AgentContextKit.Core/Models.cs` defines `ACKIT001` through `ACKIT007` and `ACKIT999`.
- `docs/SCANNER_RULES.md` lists each rule with a one-line "What it detects", "Why it matters", and "How to fix".
- No focused user-action table summarising "what to do" per severity is currently in any of the public docs.

## Scope
- Add a small "User Action Per Severity" table to `docs/SCANNER_RULES.md` that says what to do for each severity (Critical/High/Medium/Low/Info).
- Cross-reference the table from `docs/SECURITY_MODEL.md`.
- Add a focused guard test that asserts the table exists and is non-empty.
- No scanner regex, allowlist, or rule body changes.

## Out Of Scope
- Adding new scanner rules or rule IDs.
- Changing default severity values.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/SCANNER_RULES.md` (additive table only).
- `docs/SECURITY_MODEL.md` (additive cross-reference only).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Add a small markdown table to `docs/SCANNER_RULES.md`.
2. Cross-reference it from `docs/SECURITY_MODEL.md`.
3. Add a focused xUnit test that asserts the table is present and non-empty.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 239+/239+ green.
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
- `docs: polish scanner severity guidance`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
