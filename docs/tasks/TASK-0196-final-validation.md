# TASK-0196: Final Validation and Hosted Check Sync

## Purpose
Run the final validation gate for PROJECT-CONTROL-0110: full Release build, full test suite, `ackit scan --ci`, `ackit doctor`, and the new command help surfaces. Record the results in this planning doc and a single docs-only commit. Push the final evidence commit.

This is the ninth and last task in PROJECT-CONTROL-0110.

## Current State
- `master` is at `c81ad67` (TASK-0195 evidence commit). 428/428 tests are green.
- TASK-0188 through TASK-0195 are complete and pushed.
- `0.2.0-alpha.3` remains NO-GO.
- RB-003 and RB-008 remain open (independent of this control).

## Evidence
- `docs/PROJECT-CONTROL-0110-mcp-step-2-watch-mode-local-hardening.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`

## Scope
- Run the full validation suite locally:
  - `dotnet build AgentContextKit.sln -c Release --no-restore`
  - `dotnet test AgentContextKit.sln -c Release --no-build`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- mcp --help`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --help`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --once`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- trim --help`
  - `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- trim --input .gitignore --output .ackit/cache/trim-out.md --max-chars 200`
  - `git status --short` to confirm the working tree is clean before the final commit.
  - `git diff --check` to confirm no whitespace-only errors.
- Append a final validation block to `docs/PROJECT-CONTROL-0110-mcp-step-2-watch-mode-local-hardening.md`.
- Close PROJECT-CONTROL-0110 in `docs/NEXT_TASKS.md` and `.codex/SESSION_HANDOFF.md`.
- Push the final commit.

## Out of Scope
- Hosted CI dispatch (TASK-0196 is local-only; hosted evidence is recorded by the nightly workflow if it picks up the new HEAD, but a manual hosted re-run is out of scope per `AGENTS.md`).
- New tests.
- Version bump or release actions.
- Closing `RB-003` or `RB-008`.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none.
- Audit/security impact: none; the final commit is docs-only.

## Affected Files
- `docs/PROJECT-CONTROL-0110-mcp-step-2-watch-mode-local-hardening.md` — append validation block.
- `docs/NEXT_TASKS.md` — close the control.
- `.codex/SESSION_HANDOFF.md` — close the control.

## Implementation Steps
1. Planning commit (this file).
2. Run the validation suite and capture results.
3. Append the validation block to the control doc.
4. Close the control in `docs/NEXT_TASKS.md` and `.codex/SESSION_HANDOFF.md`.
5. Commit and push.

## Acceptance Criteria
- All validation commands exit with the expected codes.
- The control doc has a final validation block with the actual outputs captured.
- `docs/NEXT_TASKS.md` and `.codex/SESSION_HANDOFF.md` both reference the closed PROJECT-CONTROL-0110 state.
- `git status` is clean after the final commit.

## Tests
- No new tests.

## Validation
- All commands listed in the Scope section run with the expected results.
- The working tree is clean at the end.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0196.

## Completion Evidence
- Commit hash(es) to be filled in after the implementation commit.

## Push
- `git push origin master` only.
