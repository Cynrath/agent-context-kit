# TASK-0146 Scanner Severity Explanation Polish

## Purpose
Improve the human-readable explanation strings for each `ACKIT` rule so the scanner output makes the severity and remediation path clearer, without changing the default severity, schema, or detection rules.

## Current State
- `RiskRuleCatalog` in `src/AgentContextKit.Core/Models.cs` defines `ACKIT001` through `ACKIT007` and `ACKIT999`.
- The `Description` and `Recommendation` strings for several rules mention "Secret" or "PII" generically.
- No test currently guards the catalog text against regression.

## Scope
- Add a small test that asserts each catalog rule has a non-empty `Name`, `Description`, and `Recommendation`.
- Optionally add a one-line "Why this severity" hint to a few high-impact rules.
- No regex, allowlist, JSON schema, or SARIF profile change.

## Out Of Scope
- Changing any default severity.
- Adding or removing rule IDs.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `src/AgentContextKit.Core/Models.cs` (catalog text only).
- `tests/AgentContextKit.Tests/` (new guard test).
- `docs/SCANNER_RULES.md` (if catalog text changes).

## Implementation
1. Review each `ACKIT` rule description and recommendation for clarity.
2. Add a guard test that asserts the catalog text is non-empty and uses the expected `Name` and `Id` for each rule.
3. Run the full test suite, `ackit scan --ci`, and `ackit doctor` to confirm no regression.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive polish. Public catalog surface remains identical.

## Acceptance Criteria
- New guard test passes.
- `dotnet test` is 207+/207+ green.
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
- `docs: polish scanner severity explanations`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
