# TASK-0184: Scan `--include` / `--exclude` Glob Filters

## Purpose
Add `--include <glob>` and `--exclude <glob>` flags to `ackit scan`. The flags are evaluated against relative file paths and can be repeated. They are applied on top of the existing `AckitConfig.IgnorePaths` (which remains the project-wide config) and the built-in scanner ignore list. The new flags are intended for ad-hoc CLI use, not for persistent config.

## Current State
- `ackit scan` currently takes `--repo <path>`, `--lang en|tr`, `--format json|table|sarif`, `--output <path>`, `--ci`.
- No include/exclude flags exist.
- The scanner already supports `AckitConfig.IgnorePaths` for project-wide ignores.

## Evidence
- `src/AgentContextKit.Cli/Program.cs` — `RunScan` (existing).
- `src/AgentContextKit.Core/Scanning.cs` — `RepositoryScanner.IsIgnoredByConfig` (existing).
- `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md`.

## Scope
- Add `--include <glob>` (repeatable): if any `--include` is set, only matching relative paths are kept.
- Add `--exclude <glob>` (repeatable): drop any matching relative path.
- Globs are simple `*` and `**` patterns, evaluated by converting to a regex (`*` -> `[^/]*`, `**` -> `.*`, `?` -> `[^/]`).
- Reject empty glob with a clear error and exit 2.
- Update `AckitConfig` with an `IncludeGlobs` and `ExcludeGlobs` list, or pass them as a separate argument to `IRepositoryScanner.Scan` (preferred — do not change config shape; extend the `Scan` signature or add a new optional parameter).

## Out of Scope
- Persistent include/exclude config (only CLI flags).
- Regex globs.
- Negative lookahead / lookbehind.

## Affected Files
- `src/AgentContextKit.Core/Abstractions.cs` — add optional `IReadOnlyList<string>? includeGlobs, excludeGlobs` parameter to `IRepositoryScanner.Scan`.
- `src/AgentContextKit.Core/Scanning.cs` — implement glob matching.
- `src/AgentContextKit.Cli/Program.cs` — parse `--include` / `--exclude`, pass through.
- `docs/CLI_CONTRACT.md` — update.
- `docs/CLI_REFERENCE.md` — examples.
- `tests/AgentContextKit.Tests/ScanIncludeExcludeTests.cs` — new.

## Implementation Steps
1. Planning commit.
2. Extend `IRepositoryScanner.Scan` signature.
3. Implement glob matching.
4. CLI plumbing.
5. 5 new tests:
   - `--include 'src/**'` keeps only `src/...` files.
   - `--exclude 'tests/**'` drops tests.
   - Both flags combine: include then exclude.
   - Empty `--include ''` returns exit 2.
   - Glob `**/*.cs` matches nested `.cs` files.
6. CLI doc updates.
7. Implementation commit.
8. Gates.
9. Push.

## Security/Privacy Boundary
- Globs are evaluated locally; no network.
- No new external dependencies.

## Backward Compatibility
- Default (no `--include`, no `--exclude`) keeps current behavior.

## Acceptance Criteria
- 5 new tests pass; total >= 303.

## Tests
- ScanIncludeExcludeTests (5 new).

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 303+ / 0 / 0.
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
- Test count: 303+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
