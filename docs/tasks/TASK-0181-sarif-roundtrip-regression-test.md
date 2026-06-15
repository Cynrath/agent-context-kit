# TASK-0181: SARIF Roundtrip Regression Test

## Purpose
Add a guard test that scans a fixture repository, generates a SARIF file via the existing `ISarifReportWriter`, parses it back via `SarifDocument.Parse`, and asserts that every `RiskFinding` in the original `ScanResult` maps to a SARIF result with the expected `ruleId` and `level`. Catches drift between the catalog and the SARIF output, beyond just the rule-id-list check that already exists.

## Current State
- `ScannerRuleCatalogDocConsistencyTests` already asserts that `docs/SCANNER_RULES.md` and `docs/SARIF_OUTPUT.md` list every catalog rule id.
- No test currently parses the generated SARIF file back and asserts the actual `result.ruleId` and `result.level` per finding.

## Evidence
- `src/AgentContextKit.Core/Sarif.cs` — existing writer and parser.
- `tests/AgentContextKit.Tests/ScannerRuleCatalogDocConsistencyTests.cs` — existing doc test.

## Scope
- Add 3 tests that build a small fixture in a temp directory and run the full pipeline:
  - `SarifRoundtripMapsEveryFindingToExpectedRule` — for each finding in the scan, the matching SARIF result has `ruleId == RiskRuleCatalog.GetRuleId(finding)` and `level == severityToLevel(finding.Severity)`.
  - `SarifRoundtripPreservesSuppressionCounts` — the suppression summary count matches `ScanResult.Suppressions.Count`.
  - `SarifRoundtripHandlesEmptyFindings` — an empty fixture produces a SARIF file with `results: []` and `suppressions` counts all 0.

## Out of Scope
- Changing the SARIF schema.
- Adding new rule ids.

## Affected Files
- `tests/AgentContextKit.Tests/SarifRoundtripTests.cs` — new.

## Implementation Steps
1. Planning commit.
2. Write the 3 tests.
3. Implementation commit.
4. Gates.
5. Push.

## Security/Privacy Boundary
- Tests use a tmpdir fixture with synthetic, non-secret content.
- No new external network.

## Backward Compatibility
- New test file only; no production code changes.

## Acceptance Criteria
- 3 new tests pass; total >= 292.

## Tests
- SarifRoundtripTests (3 new).

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 292+ / 0 / 0.
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
- Test count: 292+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
