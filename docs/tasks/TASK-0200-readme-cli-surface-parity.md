# TASK-0200: README CLI surface parity

## Purpose
Bring `README.md` and `README.tr.md` into parity with the current-source CLI help, `docs/CLI_CONTRACT.md`, and `docs/CLI_REFERENCE.md` for the newer command surface:

- `ackit scan --include <glob>` / `--exclude <glob>`
- `ackit mcp --stdio-server`
- `ackit mcp --stdio <json-request>`
- `ackit diff`
- `ackit trim`
- `ackit watch`

The published NuGet package remains `0.2.0-alpha.2`; this task must not imply a new published package or release approval.

## Scope
- Verify local `HEAD`/`origin/master`, current-source `--help`, and the existing CLI docs before editing.
- Update only the README and Turkish README command maps plus short feature/workflow text needed for parity.
- Use "current source" wording where a command surface is present in source docs/help but not proven to be in the published NuGet package.
- Sync `.codex` handoff docs and `docs/NEXT_TASKS.md` only if they still imply TASK-0199 is active or omit the current TASK-0200 handoff state.
- Record final TASK-0200 evidence in this task file.

## Out of scope
- Source code changes.
- Test additions or broad test refactors.
- Version or package metadata changes.
- Changelog release claims unless clearly unreleased/current-source and already required by project convention.
- Release GO decision.
- NuGet publish.
- GitHub Release creation or edit.
- Tag creation or movement.
- Release or release-candidate workflow dispatch.
- Closing `RB-003` or `RB-008`.
- New project control selection.

## Affected files
- `docs/tasks/TASK-0200-readme-cli-surface-parity.md`
- `README.md`
- `README.tr.md`
- `docs/NEXT_TASKS.md` if stale task state remains
- `.codex/SESSION_HANDOFF.md` if stale task state remains
- `.codex/CONTEXT_PACK.md` if stale task state remains
- `.codex/NEXT_STEPS.md` if stale task state remains

## Data/database impact
None.

## Security impact
Docs-only command-surface accuracy improvement. No secrets, private owner evidence, recovery evidence, account settings, or security-setting changes are recorded.

## Permission/auth impact
None. No owner, recovery, token, workflow permission, or repository setting change.

## Localization impact
README Turkish parity text is updated alongside English README text. No runtime localization files are changed.

## UX impact
Improves README discoverability for current-source CLI commands and scan glob filtering.

## Logging/audit impact
Adds a task evidence trail for README/current-source CLI surface parity.

## Plan
1. Verify Git state and current-source `ackit --help`.
2. Compare `Program.cs`, `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md`, `README.md`, and `README.tr.md`.
3. Commit this plan before README edits.
4. Apply minimal README and stale handoff/state wording edits.
5. Run required validation and targeted docs/contract scripts.
6. Commit implementation, record final evidence, and push only after validation.

## Acceptance criteria
- `README.md` command map includes current-source `scan --include/--exclude`, `mcp --stdio-server`, `mcp --stdio`, `diff`, `trim`, and `watch`.
- `README.tr.md` command map includes the same current-source command surface.
- Short README feature/workflow text mentions MCP, diff, trim, watch, and scan include/exclude where appropriate.
- Wording preserves that the published NuGet package is still `0.2.0-alpha.2`.
- Wording does not claim unproven current-source additions are published in NuGet.
- `RB-003` and `RB-008` remain open/partial.
- `0.2.0-alpha.3` remains NO-GO.
- No version, tag, GitHub Release, NuGet, workflow, security-setting, owner, or recovery action occurs.

## Test steps
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `ackit doctor`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally implying current-source commands are already published in NuGet.
- Over-expanding README changes beyond CLI parity.
- Existing Windows `git status --short` unreadable-directory stderr warning may make PowerShell guard scripts fail even when raw porcelain is clean.

## Rollback plan
Single `git revert <sha>` for each TASK-0200 commit. Docs-only changes; no migration or generated artifact cleanup required.

## Completion notes
Pending implementation and validation.
