# TASK-0139 Ackit006 And Ackit007 End To End Coverage Test

## Purpose
Add a focused integration test that exercises the full repository scanner on a synthetic disposable fixture containing a `ProductionConfig`-category path and a `DocumentationGap`-category wording marker, asserting both findings surface with the correct `ACKIT006` and `ACKIT007` rule IDs in the JSON command output. This guarantees the TASK-0137 catalog extension propagates end-to-end into JSON, SARIF, and the redact-check command.

## Current State
- TASK-0137 added `ACKIT006` `ProductionConfigLike` and `ACKIT007` `DocumentationGap` to `RiskRuleCatalog` and the `GetRuleId` mapping in `src/AgentContextKit.Core/Models.cs`.
- The catalog test (`RiskRuleCatalogExposesNewProductionConfigAndDocumentationRules`) and the updated `RepositoryPathFixturesMapToStableRules` row cover the catalog and the path-based scanner.
- No test currently exercises the end-to-end path: a real fixture scanned via the Core `RepositoryScanner`, with findings emitted with the new rule IDs, JSON command output, and redact-check filtering.

## Scope
- Add one new xUnit test class with a small set of tests covering:
  - JSON command output for `ackit scan` shows `ruleId: ACKIT006` on a `ProductionConfig` finding.
  - JSON command output for `ackit scan` shows `ruleId: ACKIT007` on a `DocumentationGap` finding.
  - `redact-check` includes the `ProductionConfig` finding (already filtered today) and the new ruleId flows into its JSON.
- No scanner regex, allowlist, or rule body changes.
- No CLI argument or exit code changes.

## Out Of Scope
- Adding a new scanner detection category beyond the existing path-based and category-mapped rules.
- Modifying the published `0.2.0-alpha.2` package.
- Changing default CLI flags, JSON schema, or SARIF profile.

## Affected Files
- `tests/AgentContextKit.Tests/` (one new test class).
- `docs/SCANNER_RULES.md` (no change; existing rows already cover `ACKIT006` and `ACKIT007`).
- `CHANGELOG.md` (small `[Unreleased]` addendum).

## Implementation
1. Add a `Ackit006Ackit007EndToEndTests.cs` test class that:
   - Creates a `TempRepository` with `config/appsettings.Production.json` and `docs/README.draft.md` containing a clear `TODO:` marker.
   - Runs the Core `RepositoryScanner` directly.
   - Asserts at least one finding per new ruleId.
   - Asserts a `redact-check` style filter (Secret or Pii or Brand or LocalPath or ProductionConfig) still includes the `ACKIT006` finding.
2. Run the focused test, then the full test suite.
3. Run `ackit scan --ci` and `ackit doctor` to confirm no regression on the current repository.
4. Update `CHANGELOG.md` under `[Unreleased]` to note the new end-to-end coverage.

## Security/Privacy Boundary
- Fixture content uses synthetic, non-real placeholder strings that match the existing fixture convention.
- No real secrets, PII, or production values are introduced.

## Compatibility
- Pure additive test coverage. Public CLI, JSON schema, SARIF, and package surface remain identical.

## Database Impact
None.

## Admin Impact
None.

## Permission Impact
None.

## SEO/I18n Impact
None.

## Audit/Security Impact
- Strengthens evidence that the new `ACKIT006` and `ACKIT007` rule IDs reach user-facing JSON and the redact-check command.
- Does not modify scanner regex set or detection thresholds.

## Acceptance Criteria
- New test class added and passing.
- `dotnet test AgentContextKit.sln -c Release` reports at least 195/195 green.
- `ackit scan --ci` and `ackit doctor` remain clean.
- `CHANGELOG.md` `[Unreleased]` mentions the new end-to-end coverage.

## Tests
- One new xUnit test class with three or more focused tests.
- Full `dotnet test` must remain green.

## Validation
- `dotnet build` clean, 0 warnings, 0 errors.
- `dotnet test` green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Risks
None. Pure additive test coverage.

## Rollback
- Revert the single commit; no package, tag, or release state to roll back.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `test: add end-to-end coverage for new scanner rule IDs`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
