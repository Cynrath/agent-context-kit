# TASK-0183: Catalog Rule Id and Severity Stability Test

## Purpose
Add a guard test that pins the (ruleId, severity, name, category) tuple for every entry in `RiskRuleCatalog.All`. The previous regression test only checked that rule ids are listed in `docs/SCANNER_RULES.md` and `docs/SARIF_OUTPUT.md`; this also pins severities, names, and category names so an accidental reordering or rename is caught.

## Current State
- `ScannerRuleCatalogDocConsistencyTests` exists.
- No test currently pins the catalog to a fixed (id, severity, name, category) shape.

## Evidence
- `src/AgentContextKit.Core/Models.cs` — `RiskRuleCatalog`.
- `tests/AgentContextKit.Tests/ScannerRuleCatalogDocConsistencyTests.cs`.

## Scope
- One new test class with one test that asserts the catalog's structural invariants:
  - All rule ids match `^ACKIT\d{3}$`.
  - No duplicate ids.
  - No duplicate (id, severity) pairs.
  - `DefaultSeverity` is one of the `RiskSeverity` enum values.
  - `Description` and `Recommendation` are non-empty.
- A second test that pins the current exact set of rules as a baseline JSON in the test file; on first run the baseline is written and committed; on subsequent runs the test fails if the baseline drifts.

## Out of Scope
- Renaming existing rules.
- Adding or removing rules (those are explicit task changes).

## Affected Files
- `tests/AgentContextKit.Tests/CatalogRuleStabilityTests.cs` — new.

## Implementation Steps
1. Planning commit.
2. Write the 2 tests.
3. Implementation commit.
4. Gates.
5. Push.

## Security/Privacy Boundary
- New test file only.

## Backward Compatibility
- New test file only.

## Acceptance Criteria
- 2 new tests pass; total >= 298.
- Baseline JSON is committed alongside the test.

## Tests
- CatalogRuleStabilityTests (2 new).

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 298+ / 0 / 0.
- `ackit scan --ci` — exit 0.
- `ackit doctor` — 14/14 PASS.
- `scripts/verify-release.ps1` — pass.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` — clean.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): planning + implementation.
- Test count: 298+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
