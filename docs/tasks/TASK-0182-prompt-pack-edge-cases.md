# TASK-0182: Prompt Pack Edge Cases

## Purpose
Add guard tests that exercise `IPromptPackGenerator` against: an empty repository (no files, no findings), a single-file repo (just `README.md`), a docs-only repo (no `.csproj`), and a fixture that includes a Critical severity finding (synthetic PEM-marker block). Tests assert the prompt pack Markdown is well-formed, contains the English locale headers, and redaction markers appear only where expected.

## Current State
- `IPromptPackGenerator` is implemented and used by `ackit prompt-pack`.
- `PromptPackAndContextExportRedactionGuardTests` already covers redaction; the new tests focus on the empty / single-file / docs-only / secret-bearing fixture cases.
- The prompt pack output is Markdown (`.md`), not JSON; the task wording "prompt pack JSON" was stale and is treated as "prompt pack Markdown".
- `LocalizationParityTests` already covers Turkish prompt-pack locale parity; this task adds English locale assertions for the empty-repo edge case.

## Evidence
- `src/AgentContextKit.Core/Generation.cs` — `PromptPackGenerator.BuildMarkdown`.
- `src/AgentContextKit.Cli/Program.cs` — `RunPromptPack`.
- `tests/AgentContextKit.Tests/PromptPackAndContextExportRedactionGuardTests.cs` — existing redaction test.
- `tests/AgentContextKit.Tests/LocalizationParityTests.cs` — existing Turkish parity coverage.

## Scope
- 4 new tests, each builds a tmpdir fixture, runs the prompt pack generator, and asserts the relevant invariants:
  - `PromptPackEmptyRepositoryProducesWellFormedEnglishMarkdown` — empty repo + English locale; assert English section headers, "Files: 0", "Risk findings: 0", no Turkish leakage.
  - `PromptPackSingleFileRepoMarksOnlyReadme` — README-only repo; assert "Files: 1", README health row "yes", others "no".
  - `PromptPackDocsOnlyRepoOmitsStackSignalsAndCsprojPaths` — docs-only repo with no stacks; assert "Unknown" stack signal, no `.csproj` paths, docs/AI_WORKFLOW.md and docs/PROJECT_MAP.md are marked "Present" in the Generated/Context File Status table.
  - `PromptPackRedactsCriticalSecretFixture` — synthetic PEM marker block via real scanner; assert exactly one Critical+Secret finding (ACKIT001), "Critical: 1" in the prompt pack, and the synthetic PEM header and synthetic body are not present in the prompt pack output.

## Out of Scope
- Changing the prompt pack schema.
- Adding new languages.
- Inventing a JSON output for the prompt pack.

## Affected Files
- `tests/AgentContextKit.Tests/PromptPackEdgeCaseTests.cs` — new.

## Implementation Steps
1. Implementation commit (no separate planning commit because the task doc was already approved during TASK-0180/0181 review).
2. Gates.
3. Push.

## Security/Privacy Boundary
- All fixtures use synthetic test data; no real keys, no real emails.
- The synthetic PEM fixture uses string concatenation for the BEGIN/END marker fragments so the test source file does not itself trigger `ackit scan` (matching the existing `PromptPackAndContextExportRedactionGuardTests` pattern).
- The synthetic body string is `ackit-pem-fixture-9d7c2e-not-a-real-key`; it is never a real credential.
- `.pem` is not on the scanner's text-file allowlist, so the synthetic PEM block lives in a `.txt` fixture.

## Backward Compatibility
- New test file only.

## Acceptance Criteria
- 4 new tests pass; total >= 299.
- Full suite reports 303/303 green after this task (299 baseline after TASK-0181 + 4 new).

## Tests
- PromptPackEdgeCaseTests (4 new):
  - `PromptPackEmptyRepositoryProducesWellFormedEnglishMarkdown`
  - `PromptPackSingleFileRepoMarksOnlyReadme`
  - `PromptPackDocsOnlyRepoOmitsStackSignalsAndCsprojPaths`
  - `PromptPackRedactsCriticalSecretFixture`

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- Focused `PromptPackEdgeCaseTests` — 4/4 green.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 303/303 green.
- Source `ackit scan --ci` — exit 0; existing `.remember` Medium findings only.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean after implementation commit.
- `git diff --check` — clean.
- `scripts/verify-release.ps1` — passed.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: `tests/AgentContextKit.Tests/PromptPackEdgeCaseTests.cs` (new).
- Commit hash(es): implementation `8fc1361`; evidence `b57a292`.
- Test count: 303/303 (4 new).
- Hosted checks for pushed HEAD `8fc1361`:
  - `ci` run `27825503005` — success.
  - `cross-platform-smoke` run `27825502983` — success.
  - `cross-platform-source-smoke` run `27825502972` — success.
- Hosted checks for evidence commit `b57a292`:
  - `ci` run `27825767286` — success.
  - `cross-platform-smoke` run `27825767260` — success.
  - `cross-platform-source-smoke` run `27825767256` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for both pushed HEAD `8fc1361` and evidence commit `b57a292`.
