# TASK-0154 MVP Readme Usage Examples Polish

## Purpose
Tighten the README and README.tr copy-paste blocks so every example shows the exact repository-relative command, never relies on `dotnet run` to discover the project, and is grouped by reader intent (first time, repo audit, CI, published tool).

## Current State
- README.md and README.tr.md are well organized but contain a few command examples that predate the v0.2.0-alpha.2 surface.
- The "Run from source" section already uses `dotnet run --project src/AgentContextKit.Cli/...`.

## Scope
- Review every command block in `README.md` and `README.tr.md` for accuracy against the current `ackit --help` surface.
- Add a small "First five minutes" pointer at the top of both files so the first example a reader sees matches the install command in the Quick Start section.
- No new command, no behavior change.

## Out Of Scope
- Modifying the published `0.2.0-alpha.2` package.
- Adding new CLI commands.

## Affected Files
- `README.md` (additive polish only).
- `README.tr.md` (additive polish only).
- `tests/AgentContextKit.Tests/` (guard test).

## Implementation
1. Review the command blocks.
2. Add the "First five minutes" pointer and update any drift.
3. Add a guard test that asserts every dotnet run example uses the explicit `--project` path.

## Security/Privacy Boundary
- No credential, raw finding, or recovery secret may be printed.

## Backward Compatibility
- Pure additive documentation plus a guard test.

## Acceptance Criteria
- New test passes.
- `dotnet test` is 226+/226+ green.
- `ackit scan --ci` and `ackit doctor` clean.

## Tests
- One new xUnit test.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- `ackit scan --ci` clean.
- `ackit doctor` PASS.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: polish readme usage examples`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
