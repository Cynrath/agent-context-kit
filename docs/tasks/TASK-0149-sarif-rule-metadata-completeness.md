# TASK-0149 SARIF Rule Metadata Completeness

## Purpose
Ensure that the SARIF rule catalog emitted by `ackit sarif` carries the full set of fields expected by GitHub Code Scanning, and add a guard test that asserts those fields are present per rule.

## Current State
- `src/AgentContextKit.Core/Sarif.cs` emits SARIF 2.1.0 with rule metadata.
- The published `0.2.0-alpha.2` package includes `ackit sarif`.
- No focused test currently asserts that every rule has help URI, short description, and full description.

## Scope
- Add a focused xUnit test that parses the SARIF output of a synthetic scan and asserts each rule entry has `id`, `name`, `shortDescription.text`, `fullDescription.text`, and `help.text`.
- If the SARIF writer is missing any field for any rule, add the field with sanitized content.
- No new rule IDs, no JSON schema change.

## Out Of Scope
- Adding new rule IDs.
- Changing the SARIF profile.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `src/AgentContextKit.Core/Sarif.cs` (only if missing fields are detected).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Inspect `Sarif.cs` to confirm each rule entry has all expected fields.
2. If a field is missing, add it using sanitized content from `RiskRuleCatalog`.
3. Add a focused test that asserts the metadata completeness per rule.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive test plus optional additive metadata. Public SARIF output remains identical for existing rules.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 210+/210+ green.
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
- `test: add sarif rule metadata completeness guard`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
