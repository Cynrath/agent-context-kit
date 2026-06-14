# TASK-0142 Scanner Rule Doc Contract Consistency

## Purpose
Verify that the `ACKIT006` and `ACKIT007` scanner rules are described consistently across the Core catalog, tests, JSON/SARIF contract docs, `SECURITY_MODEL.md`, `CHANGELOG.md`, and any other place that documents the rule catalog. Add documentation or test coverage for any drift without changing runtime behavior.

## Current State
- `src/AgentContextKit.Core/Models.cs` defines `ACKIT006` `ProductionConfigLike` (High) and `ACKIT007` `DocumentationGap` (Medium).
- `docs/SCANNER_RULES.md` lists both new rules and narrows `ACKIT001` and `ACKIT005`.
- `docs/SARIF_OUTPUT.md` lists both new rules after the PROJECT-CONTROL-0105 audit fix.
- `docs/JSON_OUTPUT.md` mentions `ACKIT003` in examples but does not currently mention `ACKIT006` or `ACKIT007` by name.
- `docs/SECURITY_MODEL.md` mentions `ProductionConfig` in the rule category list but does not mention `ACKIT006`/`ACKIT007` by name.
- `CHANGELOG.md` records the catalog change under `[Unreleased]`.
- `tests/AgentContextKit.Tests/Ackit006Ackit007EndToEndTests.cs` exercises the new rules end-to-end.

## Scope
- Documentation and test additions only. No scanner regex, allowlist, or rule body changes.
- Add explicit references to `ACKIT006` and `ACKIT007` in `docs/JSON_OUTPUT.md` and `docs/SECURITY_MODEL.md`.
- Confirm the `docs/SARIF_OUTPUT.md` and `docs/SCANNER_RULES.md` rows are byte-for-byte equivalent for the new rules.
- Add a focused consistency test that asserts the rule catalog table in `SCANNER_RULES.md` matches the Core catalog.

## Out Of Scope
- Adding a new scanner detection category or content-based rule.
- Changing the default scanner severity, JSON schema, or SARIF profile.
- Modifying the published `0.2.0-alpha.2` package.

## Affected Files
- `docs/JSON_OUTPUT.md` (additive mention only).
- `docs/SECURITY_MODEL.md` (additive mention only).
- `tests/AgentContextKit.Tests/` (one new consistency test).
- `CHANGELOG.md` (small `[Unreleased]` addendum if needed).

## Implementation
1. In `docs/JSON_OUTPUT.md`, add a short note that the scanner finding `ruleId` field can be `ACKIT001`–`ACKIT007` or `ACKIT999` per `docs/SCANNER_RULES.md`.
2. In `docs/SECURITY_MODEL.md`, add a short note that the stable `ACKIT` rule IDs and their categories are documented in `docs/SCANNER_RULES.md`.
3. Add a focused xUnit test that reads `docs/SCANNER_RULES.md` and asserts every `ACKIT` row referenced there also exists in `RiskRuleCatalog.All`.
4. Add a short `[Unreleased]` line to `CHANGELOG.md` if not already present.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- Pure additive doc and test coverage. Public CLI, JSON schema, SARIF, and package surface remain identical.

## Acceptance Criteria
- The new test passes.
- `dotnet test` reports at least 198/198 green.
- `ackit scan --ci` and `ackit doctor` remain clean.
- `git diff --check` is clean.

## Tests
- One new xUnit test.
- Full `dotnet test` must remain green.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Rollback
- Revert the single commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: align scanner rule contract documentation`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
