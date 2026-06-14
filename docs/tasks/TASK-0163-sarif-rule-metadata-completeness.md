# TASK-0163 SARIF Rule Metadata Completeness

## Purpose
Verify that the SARIF rule catalog emitted by `ackit sarif` is complete and aligned with `docs/SCANNER_RULES.md` and the Core `RiskRuleCatalog`. Add a focused guard test that asserts the SARIF rule metadata for every catalog rule.

## Current State
- TASK-0149 added a `SarifRuleMetadataCompletenessTests` class that asserts each SARIF rule carries `id`, `name`, `shortDescription`, `fullDescription`, and `help`.
- `docs/SARIF_OUTPUT.md` lists the SARIF rule IDs.

## Scope
- Add a focused guard test that asserts the SARIF rule IDs are exactly the Core `RiskRuleCatalog.All` IDs (no extras, no missing).
- Add a short note to `docs/SARIF_OUTPUT.md` that the rule IDs are derived from the Core catalog.
- No SARIF schema change, no new rule IDs.

## Out Of Scope
- Adding new rule IDs.
- Changing the SARIF profile.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/SARIF_OUTPUT.md` (additive note only).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Add a focused xUnit test that asserts the SARIF rule IDs match `RiskRuleCatalog.All` IDs.
2. Add a small note to `docs/SARIF_OUTPUT.md` referencing the Core catalog.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 242+/242+ green.
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
- `test: verify sarif rule metadata completeness`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
