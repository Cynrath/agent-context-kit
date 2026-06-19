# TASK-0184: Scan `--include` / `--exclude` Glob Filters

## Purpose
Add `--include <glob>` and `--exclude <glob>` flags to `ackit scan`. The flags are evaluated against relative file paths and can be repeated. They are applied on top of the existing `AckitConfig.IgnorePaths` (which remains the project-wide config) and the built-in scanner ignore list. The new flags are intended for ad-hoc CLI use, not for persistent config.

## Current State
- `ackit scan` previously accepted `--baseline`, `--lang`, `--json`, and `--ci`.
- No include/exclude flags existed.
- The scanner already supported `AckitConfig.IgnorePaths` for project-wide ignores.

## Evidence
- `src/AgentContextKit.Cli/Program.cs` — `RunScan`.
- `src/AgentContextKit.Core/Scanning.cs` — `RepositoryScanner.Scan` and new `GlobMatcher`.
- `src/AgentContextKit.Core/Abstractions.cs` — extended `IRepositoryScanner.Scan`.
- `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md`.

## Scope
- Add `--include <glob>` (repeatable): if any `--include` is set, only matching relative paths are kept.
- Add `--exclude <glob>` (repeatable): drop any matching relative path.
- Globs support `*` (single segment), `**` (any depth), and `?` (single character) via a glob-to-regex helper.
- Empty/whitespace glob is rejected with an "Invalid argument" error and returns exit code `1`. The task spec mentioned exit `2`, but `2` is reserved for critical risk conditions per `docs/EXIT_CODES.md`; `1` matches the existing invalid-invocation convention for `task` without title, unknown commands, and unhandled runtime errors.
- New optional `IReadOnlyList<string>? includeGlobs, excludeGlobs` parameters on `IRepositoryScanner.Scan` (preferred over changing `AckitConfig`).
- Add `invalidArgument` text-provider key (en/tr) for localized CLI error output.

## Out of Scope
- Persistent include/exclude config (only CLI flags).
- Regex globs.
- Negative lookahead / lookbehind.

## Affected Files
- `src/AgentContextKit.Core/Abstractions.cs` — extend `IRepositoryScanner.Scan`.
- `src/AgentContextKit.Core/Scanning.cs` — `GlobMatcher`, glob-aware `RepositoryScanner.Scan`.
- `src/AgentContextKit.Cli/Program.cs` — `RunScan` parses `--include` / `--exclude`, prints localized error on invalid glob, `OptionConsumesValue` extended.
- `src/AgentContextKit.Core/Templates.cs` — `invalidArgument` localization.
- `docs/CLI_CONTRACT.md` — update command surface and Global Options.
- `docs/CLI_REFERENCE.md` — add `--include` / `--exclude` examples.
- `scripts/check-cli-contract.ps1` — expected help-line updated.
- `tests/AgentContextKit.Tests/ScanIncludeExcludeTests.cs` — new.

## Implementation Steps
1. Implementation commit.
2. Gates.
3. Push.

## Security/Privacy Boundary
- Globs are evaluated locally; no network.
- No new external dependencies.

## Backward Compatibility
- Default (no `--include`, no `--exclude`) keeps current behavior.

## Acceptance Criteria
- 8 new tests pass (5 required + 3 defensive: empty include, empty exclude, no-match, default-unchanged).
- Total >= 313.
- Full suite reports 313/313 green after this task (305 baseline + 8 new).

## Tests
- ScanIncludeExcludeTests (8 new):
  - `IncludeGlobKeepsOnlyMatchingFiles`
  - `ExcludeGlobDropsMatchingFiles`
  - `IncludeAndExcludeCombine`
  - `DoubleStarGlobMatchesNestedFiles`
  - `EmptyIncludeGlobIsRejected`
  - `EmptyExcludeGlobIsRejected`
  - `IncludeGlobWithNoMatchProducesEmptyFiles`
  - `DefaultScanIsUnchangedWhenNoGlobsProvided`

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- Focused `ScanIncludeExcludeTests` — 8/8 green.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 313/313 green.
- Source `ackit scan --ci` — exit 0; existing `.remember` Medium findings only.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-cli-contract.ps1` — passed after help-line update.
- `scripts/check-localization-parity.ps1` — passed.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean after implementation commit.
- `git diff --check` — clean.
- `scripts/verify-release.ps1` — passed.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): implementation `f5873eb`; evidence `f2594d0`.
- Test count: 313/313 (8 new).
- Hosted checks for pushed HEAD `f5873eb`:
  - `ci` run `27829523172` — success.
  - `cross-platform-smoke` run `27829523186` — success.
  - `cross-platform-source-smoke` run `27829523206` — success.
- Hosted checks for evidence commit `f2594d0`:
  - `ci` run `27829870759` — success.
  - `cross-platform-smoke` run `27829870772` — success.
  - `cross-platform-source-smoke` run `27829870785` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for both pushed HEAD `f5873eb` and evidence commit `f2594d0`.
