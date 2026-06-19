# TASK-0183: Catalog Rule Id and Severity Stability Test

## Purpose
Add a guard test that pins the (ruleId, severity, name, category) tuple for every entry in `RiskRuleCatalog.All`. The previous regression test only checked that rule ids are listed in `docs/SCANNER_RULES.md` and `docs/SARIF_OUTPUT.md`; this also pins severities, names, and category names so an accidental reordering or rename is caught.

## Current State
- `ScannerRuleCatalogDocConsistencyTests` exists.
- No test previously pinned the catalog to a fixed (id, severity, name, category, description, recommendation) shape.

## Evidence
- `src/AgentContextKit.Core/Models.cs` — `RiskRuleCatalog`.
- `tests/AgentContextKit.Tests/ScannerRuleCatalogDocConsistencyTests.cs`.

## Scope
- One new test class with two tests:
  - `CatalogRuleShapeMatchesStructuralInvariants` — every rule id matches `^ACKIT\d{3}$`, no duplicate ids, no duplicate (id, defaultSeverity) pairs, every `DefaultSeverity` is a defined `RiskSeverity` enum value, every `Name`/`Description`/`Recommendation` is non-empty.
  - `CatalogRuleBaselineJsonDoesNotDrift` — embeds an indented JSON baseline for `RiskRuleCatalog.All` (ordered by id) and compares the live serialization to that baseline via `JsonNode.DeepEquals`. On drift, the test writes the actual baseline to a disposable temp path and includes both actual and expected in the failure message so the new baseline can be regenerated and committed alongside any intentional catalog change.

## Out of Scope
- Renaming existing rules.
- Adding or removing rules (those are explicit task changes).

## Affected Files
- `tests/AgentContextKit.Tests/CatalogRuleStabilityTests.cs` — new.

## Implementation Steps
1. Implementation commit.
2. Gates.
3. Push.

## Security/Privacy Boundary
- New test file only.

## Backward Compatibility
- New test file only.

## Acceptance Criteria
- 2 new tests pass; total >= 303.
- Baseline JSON is committed alongside the test.
- The full suite reports 305/305 green after this task (303 baseline after TASK-0182 + 2 new).

## Tests
- CatalogRuleStabilityTests (2 new):
  - `CatalogRuleShapeMatchesStructuralInvariants`
  - `CatalogRuleBaselineJsonDoesNotDrift`

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- Focused `CatalogRuleStabilityTests` — 2/2 green.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 305/305 green.
- Source `ackit scan --ci` — exit 0; existing `.remember` Medium findings only.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean after implementation commit.
- `git diff --check` — clean.
- `scripts/verify-release.ps1` — passed.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: `tests/AgentContextKit.Tests/CatalogRuleStabilityTests.cs` (new).
- Commit hash(es): implementation `4aaa157`.
- Test count: 305/305 (2 new).
- Hosted checks for pushed HEAD `4aaa157`:
  - `ci` run `27826714694` — success.
  - `cross-platform-smoke` run `27826714743` — success.
  - `cross-platform-source-smoke` run `27826714656` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for pushed HEAD `4aaa157`.
