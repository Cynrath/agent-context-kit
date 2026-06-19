# TASK-0181: SARIF Roundtrip Regression Test

## Purpose
Add a guard test that scans a fixture repository, generates a SARIF file via the existing `ISarifReportWriter`, parses it back via `JsonSerializer.Deserialize<SarifReport>` against the public `SarifReport` model, and asserts that every `RiskFinding` in the original `ScanResult` maps to a SARIF result with the expected `ruleId` and `level`. Catches drift between the catalog and the SARIF output, beyond just the rule-id-list check that already exists.

## Current State
- `ScannerRuleCatalogDocConsistencyTests` already asserts that `docs/SCANNER_RULES.md` and `docs/SARIF_OUTPUT.md` list every catalog rule id.
- `SarifRuleIdAlignmentGuardTests` already asserts that the SARIF `tool.driver.rules` set matches `RiskRuleCatalog.All`.
- No test currently parses the generated SARIF file back and asserts the actual `result.ruleId` and `result.level` per finding.
- The current SARIF writer does not emit a SARIF `suppressions` property on the run or document root. A suppression roundtrip test must document that contract rather than fake suppression counts.

## Evidence
- `src/AgentContextKit.Core/Sarif.cs` — existing writer.
- `src/AgentContextKit.Core/Models.cs` — `SarifReport`/`SarifRun`/`SarifResult` deserialization model.
- `tests/AgentContextKit.Tests/ScannerRuleCatalogDocConsistencyTests.cs` — existing doc test.
- `tests/AgentContextKit.Tests/SarifRuleIdAlignmentGuardTests.cs` — existing SARIF rule-id guard test.

## Scope
- Add 3 tests in a single new file:
  - `SarifRoundtripMapsEveryFindingToExpectedRule` — build a synthetic `ScanResult` with one finding per stable severity and category, generate SARIF via `SarifReportWriter.Generate`, parse it back with `JsonSerializer.Deserialize<SarifReport>`, and assert that for every `finding` the matching `result` has `ruleId == RiskRuleCatalog.GetRuleId(finding)` and `level == severityToSarifLevel(finding.Severity)`.
  - `SarifRoundtripHandlesEmptyFindings` — an empty `ScanResult.Findings` produces a SARIF file with an empty `results` array.
  - `SarifRoundtripWriterDoesNotSerializeSuppressions` — when `ScanResult.Suppressions` is non-empty, finding roundtrip still works and the generated SARIF contains no `suppressions` field at the run or document root. This documents the current no-suppression-output contract.

## Out of Scope
- Changing the SARIF schema.
- Adding new rule ids.
- Inventing a `SarifDocument.Parse` abstraction.

## Affected Files
- `tests/AgentContextKit.Tests/SarifRoundtripTests.cs` — new.

## Implementation Steps
1. Planning commit (state-sync first; covered by `docs: sync task 0181 handoff state`).
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
- 3 new tests pass; total >= 296 (296 was the baseline after TASK-0187).
- The full suite reports 299/299 green after this task.

## Tests
- SarifRoundtripTests (3 new):
  - `SarifRoundtripMapsEveryFindingToExpectedRule`
  - `SarifRoundtripHandlesEmptyFindings`
  - `SarifRoundtripWriterDoesNotSerializeSuppressions`

## Validation
- `dotnet restore AgentContextKit.sln` — clean.
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- Focused `SarifRoundtripTests` — 3/3 green.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 299/299 green.
- Source `ackit scan --ci` — exit 0; existing `.remember` Medium findings only.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-cli-contract.ps1` — passed.
- `scripts/check-localization-parity.ps1` — passed.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean after implementation commit.
- `git diff --check` — clean.
- `scripts/verify-release.ps1` — passed.
- `git status --short --branch` — clean; ahead of `origin/master` before push, aligned after push.

## Rollback
Single `git revert <sha>` (or revert the two commits in reverse order).

## Completion Evidence
- File list: `tests/AgentContextKit.Tests/SarifRoundtripTests.cs` (new).
- Commit hashes:
  - State sync: `f63f7a6` (`docs: sync task 0181 handoff state`).
  - Implementation: `52399d5` (`test: add sarif roundtrip regression`).
  - Evidence: `59c1217` (`docs: record task 0181 validation`).
- Test count: 299/299 (3 new: `SarifRoundtripMapsEveryFindingToExpectedRule`, `SarifRoundtripHandlesEmptyFindings`, `SarifRoundtripWriterDoesNotSerializeSuppressions`).
- Hosted checks for pushed HEAD `52399d5`:
  - `ci` run `27823838324` — success.
  - `cross-platform-smoke` run `27823838358` — success.
  - `cross-platform-source-smoke` run `27823838341` — success.
- Hosted checks for evidence commit `59c1217`:
  - `ci` run `27824183780` — success.
  - `cross-platform-smoke` run `27824183648` — success.
  - `cross-platform-source-smoke` run `27824183739` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for both pushed HEAD `52399d5` and evidence commit `59c1217`.
