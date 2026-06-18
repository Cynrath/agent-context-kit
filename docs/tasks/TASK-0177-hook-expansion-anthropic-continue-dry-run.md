# TASK-0177: Hook Expansion (Anthropic + Continue + Dry-Run Preview)

## Purpose
Extend `ackit hooks` to support Anthropic and Continue targets, and add a dry-run preview that lists which hooks would be installed without writing anything. Keep the existing `--shell pwsh|sh`, `--install`, `--output`, `--lang`, and `--json` flags. The current `ackit hooks` ships with Codex and Claude targets only; Anthropic and Continue are documented generator targets but their hook files were never written.

## Current State
- `ackit hooks --target codex|claude --shell pwsh|sh --install --output <path> --lang en|tr --json` exists.
- Anthropic and Continue are present in `AgentTarget` enum and in `Generation.cs` output builders.
- `Templates.cs` has hooks template keys (`hooksPreview`, `hooksInstalled`, `hooksSkipped`, `hooksNotGitRepo`).
- No tests cover Anthropic or Continue hooks; no dry-run preview is implemented.

## Evidence
- `src/AgentContextKit.Core/Models.cs` line ~28: `AgentTarget.Anthropic`, `AgentTarget.Continue` exist.
- `src/AgentContextKit.Core/Generation.cs` emits system prompt and rendered files for all targets including Anthropic and Continue.
- `src/AgentContextKit.Core/Templates.cs` defines the four hooks template keys.
- `src/AgentContextKit.Cli/Program.cs` `RunHooks` does not branch on Anthropic or Continue; it currently only knows Codex and Claude.

## Scope
- Add Anthropic hook rendering: a single shell-agnostic instruction file (`.claude/settings.json` already handles Claude; Anthropic will use a sibling path `.anthropic/hooks/installed.txt` for the marker and a simple shell script for the `pre-commit` style reminder).
- Add Continue hook rendering: `.continue/hooks/installed.txt` marker and a `hooks.json` describing a `pre-prompt` step that just prints the reminder.
- Add `--dry-run` flag: print the list of files that would be written and the marker, exit 0, do not touch disk.
- Reject `--target anthropic` paired with `--shell sh` only on Windows when no sh is present (clear error). Continue is shell-agnostic; only `pwsh` and `sh` are supported.

## Out of Scope
- Real-time hook execution. `ackit hooks` only writes config and reminder files; it does not register listeners with Claude Code, Anthropic CLI, or Continue.
- HTTP or remote registration.
- Replacing the existing Codex/Claude paths.

## Affected Files
- `src/AgentContextKit.Core/Templates.cs` — add Anthropic and Continue hook templates.
- `src/AgentContextKit.Core/Generation.cs` — add `BuildAnthropicHooks` and `BuildContinueHooks` returning a small `record struct` of `(string Path, string Content)` pairs.
- `src/AgentContextKit.Cli/Program.cs` — extend `RunHooks` to dispatch by target, support `--dry-run`, surface unsupported combinations.
- `tests/AgentContextKit.Tests/HookExpansionTests.cs` — new.
- `docs/CLI_CONTRACT.md` — update target list and flag matrix.
- `docs/CLI_REFERENCE.md` — add `--dry-run` example.

## Implementation Steps
1. Planning commit with this task file.
2. Add template keys and the two new `Build*Hooks` helpers in `Templates.cs` and `Generation.cs`.
3. Extend `RunHooks` to dispatch by target; default to Codex for back-compat.
4. Add `--dry-run` to `RunHooks`; print paths and content length, no writes.
5. Add 6 tests:
   - Codex hooks install creates the expected marker + script under tmpdir.
   - Claude hooks install creates the expected marker + script under tmpdir.
   - Anthropic hooks install creates the expected marker + script under tmpdir.
   - Continue hooks install creates the expected marker + JSON under tmpdir.
   - Dry-run does not write any file (asserts path does not exist after invocation).
   - `--target anthropic --shell pwsh` on a non-Windows test still runs; `--target continue --shell sh` on Windows is rejected with a clear error.
6. Update CLI docs.
7. Implementation commit.
8. Run gates: build, test, scan, doctor, verify-release, check-tracked-vs-untracked-md.
9. Push.

## Security/Privacy Boundary
- Hook scripts are deterministic and contain no user data, no tokens, no machine paths.
- Output paths are always under the resolved repository root.

## Backward Compatibility
- Default target stays Codex. Existing CLI invocations behave identically.

## Acceptance Criteria
- `ackit hooks --target codex --shell pwsh --install` continues to behave exactly as before.
- `ackit hooks --target anthropic --shell pwsh --install` writes a marker and a small shell script.
- `ackit hooks --target continue --shell pwsh --install` writes a marker and a `hooks.json`.
- `ackit hooks --target anthropic --shell pwsh --dry-run` lists paths and contents without writing.
- New tests pass; total test count >= 276.

## Tests
- HookExpansionTests (6 new).
- Existing tests stay green.

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 276+ / 0 / 0.
- `ackit scan --ci` — exit 0.
- `ackit doctor` — 14/14 PASS.
- `scripts/verify-release.ps1` — pass.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` — clean.

## Rollback
Single `git revert <sha>` removes all TASK-0177 changes; no other task depends on it.

## Completion Evidence
- Implemented hook target expansion for `codex`, `claude`, `anthropic`, and `continue`.
- Added dry-run precedence over `--install`; dry-run reports planned paths and content lengths without writing files.
- Added six focused `HookExpansionTests`; focused run passed 6/6 and full test suite passed 276/276.
- Validation on 2026-06-18: Release build 0 warnings/0 errors; source `scan --ci` exit 0 with existing Medium `.remember` log findings only; `doctor` 13/13 PASS; `scripts/verify-release.ps1` passed; CLI contract and localization parity gates passed.
- Commit hash(es): planning `b224c20`; state-sync `d9b9a5d`; implementation is recorded in this commit and the final hash is reported by `git`.
- Test count: 276.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; hosted CI runs on push and is verified by GitHub Actions.
