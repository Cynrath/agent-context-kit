# TASK-0182: Prompt Pack Edge Cases

## Purpose
Add guard tests that exercise `IPromptPackGenerator` against: an empty repository (no files, no findings), a single-file repo (just `README.md`), a docs-only repo (no `.csproj`), and a fixture that includes a Critical severity finding (synthetic PEM-marker block). Tests assert the prompt pack JSON is well-formed, contains the locale, and redaction markers appear only where expected.

## Current State
- `IPromptPackGenerator` is implemented and used by `ackit prompt-pack`.
- `PromptPackAndContextExportRedactionGuardTests` already covers redaction; the new tests focus on the empty / single-file / docs-only / secret-bearing fixture cases.

## Evidence
- `src/AgentContextKit.Core/Generation.cs` — `BuildPromptPack`.
- `src/AgentContextKit.Cli/Program.cs` — `RunPromptPack`.
- `tests/AgentContextKit.Tests/PromptPackAndContextExportRedactionGuardTests.cs` — existing redaction test.

## Scope
- 4 new tests, each builds a tmpdir fixture, runs the prompt pack generator, parses the JSON output, and asserts the relevant invariants.

## Out of Scope
- Changing the prompt pack JSON schema.
- Adding new languages.

## Affected Files
- `tests/AgentContextKit.Tests/PromptPackEdgeCaseTests.cs` — new.

## Implementation Steps
1. Planning commit.
2. Write 4 tests.
3. Implementation commit.
4. Gates.
5. Push.

## Security/Privacy Boundary
- All fixtures use synthetic test data; no real keys, no real emails.
- The synthetic fixture uses a clearly fake value shaped like a "BEGIN" / "END" PEM-style key marker block; the existing Core scanner detects this and emits a Critical finding for the test runner to assert.

## Backward Compatibility
- New test file only.

## Acceptance Criteria
- 4 new tests pass; total >= 296.

## Tests
- PromptPackEdgeCaseTests (4 new).

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 296+ / 0 / 0.
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
- Test count: 296+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
