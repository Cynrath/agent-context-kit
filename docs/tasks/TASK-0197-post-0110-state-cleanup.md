# TASK-0197: Post-0110 State Cleanup

## Purpose
PROJECT-CONTROL-0110 closed at TASK-0196 on 2026-06-19, but several state-sync docs still describe it as active in their top-level intro, `## Next Task` blocks, and `Context Compaction Resume Point` lines. This task makes the handoff docs internally consistent: PROJECT-CONTROL-0110 is closed, no new release is authorized, `0.2.0-alpha.3` remains NO-GO because RB-003 and RB-008 remain unresolved, and no next project control has been selected.

This is a docs-first state cleanup task. No source code changes unless a doc consistency check fails.

## Current State
- `master` is at `b073c3d` (TASK-0196 evidence commit). Local == origin == `b073c3d`. Working tree is clean.
- PROJECT-CONTROL-0110 (TASK-0188 through TASK-0196) is closed; cumulative suite is 428/428 green.
- `0.2.0-alpha.3` remains NO-GO.
- RB-003 and RB-008 remain open and are independent of this task.

## Stale Text Identified

1. `docs/NEXT_TASKS.md`
   - Top intro line: "PROJECT-CONTROL-0110 (TASK-0188 through TASK-0196) is now active as the next local product/code-quality/test/documentation/security pass".
   - `## Next Task` block at the bottom: "PROJECT-CONTROL-0110 is now active for TASK-0188 through TASK-0196."

2. `.codex/SESSION_HANDOFF.md`
   - `## Current Task` bullet: "PROJECT-CONTROL-0110 is now active for TASK-0188 through TASK-0196."
   - TASK-0186 closeout paragraph (line 19) still ends with: "PROJECT-CONTROL-0110 is now active for TASK-0188 through TASK-0196".
   - `## Context Compaction Resume Point` line 562 still says: "PROJECT-CONTROL-0110 is now active for TASK-0188 through TASK-0196 (MCP step 2 + watch mode + local hardening)."

3. `.codex/CONTEXT_PACK.md`
   - `## Active Control` block: "PROJECT-CONTROL-0110 is now active for TASK-0188 through TASK-0196."

4. `.codex/NEXT_STEPS.md`
   - Item 28 still reads "Local TASK-0195 in progress".
   - No item for TASK-0196 closeout and final validation.

These four files are the only ones that still claim PROJECT-CONTROL-0110 is active or are stale by one task step. The task planning docs under `docs/tasks/` are historical records of the completed work; they are not edited by this task.

## Evidence
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Scope
- Update the four files listed above so they agree that PROJECT-CONTROL-0110 is closed and that no next project control has been selected.
- The corrections are surgical: replace "now active" wording with "closed" wording, add a brief next-control-placeholder note that explicitly says "not yet selected / pending maintainer direction", and refresh the cumulative test count and HEAD pointer where appropriate.
- No source code changes.
- No tests added or modified.

## Out of Scope
- Architectural rewrites of any doc.
- Selecting or scoping PROJECT-CONTROL-0111.
- Closing `RB-003` or `RB-008`.
- Any release, tag, NuGet publish, or version bump.
- Touching `docs/PROJECT_MAP.md`, `docs/MAINTAINER_RELEASE_HANDOFF.md`, `docs/RELEASE_BLOCKER_BOARD.md`, or `docs/V020_ALPHA3_RELEASE_DECISION.md`. These files do not mention PROJECT-CONTROL-0110 or are out of scope for this audit (none of them claims the control is active).
- Touching `docs/AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc` (global rule docs).

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none; English docs surface only.
- Audit/security impact: none; the audit is read-only and reflects the actual local state.

## Affected Files
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Implementation Steps
1. Planning commit (this file).
2. Fix `docs/NEXT_TASKS.md` intro line and `## Next Task` block. Keep the closed-control block intact.
3. Fix `.codex/SESSION_HANDOFF.md` `## Current Task` bullet, the trailing line in the TASK-0186 closeout paragraph, and the `## Context Compaction Resume Point` line.
4. Fix `.codex/CONTEXT_PACK.md` `## Active Control` block. Rename to `## Last Closed Control` and state PROJECT-CONTROL-0110 + 428/428 + `b073c3d`. Add a `## Next Control (Placeholder)` block that says "not yet selected / pending maintainer direction".
5. Append a TASK-0196 final validation item to `.codex/NEXT_STEPS.md` and refresh the TASK-0195 item to completed.
6. Run the validation gates listed below.
7. Commit and push.

## Acceptance Criteria
- None of the four files claims PROJECT-CONTROL-0110 is active.
- All four files reference the same final pushed HEAD and test count.
- The `0.2.0-alpha.3` NO-GO and RB-003 / RB-008 unresolved notes remain visible.
- A `## Next Control (Placeholder)` block exists in at least one of the four files and explicitly says "not yet selected / pending maintainer direction".
- No source code or test changes.

## Tests
- No new tests.

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 428/428 green.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- `git diff --check` — clean.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — exit 0 (or record exact pre-existing failure).
- `powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues` — exit 0 (or record exact pre-existing failure).
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — exit 0 (or record exact pre-existing failure).
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1` — exit 0 (or record exact pre-existing failure).

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0197.

## Completion Evidence

- Planning commit: `d7aae06` — `docs: plan task 0197 post 0110 state cleanup`.
- Implementation commit: to be recorded after `docs(state): sync post 0110 handoff`.
- Final pushed HEAD (expected): `b073c3d` until the implementation commit lands.
- Cumulative test count: 428/428 green.
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 428/428 green (`AgentContextKit.Tests.dll`, net10.0).
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0 (existing `.remember` Medium log findings only).
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS (CLI Contract, Localization Parity, Memory, Tools, Web UI, CHANGELOG, Tests, CI, Sourcelink, Packaging, README, SECURITY, Repository Health).
- `git diff --check` — clean.
- PowerShell scripts `check-tracked-vs-untracked-md.ps1`, `check-cli-contract.ps1`, `check-localization-parity.ps1`, `verify-release.ps1` exit 1 in this environment due to a pre-existing PowerShell strict-mode interaction with `git`'s stderr warning for a transient non-UTF-8 directory created during earlier test runs; the xunit matrix `LocalizationParityTests` and `CliContractTests` covered by the same checks pass. Pre-existing environment issue, recorded in `docs/tasks/TASK-0193-post-0193-context.md` and earlier; not caused by TASK-0197.
- Release remained NO-GO: `0.2.0-alpha.3` NO-GO because RB-003 (independent backup security owner) and RB-008 (destructive NuGet recovery authority) remain unresolved.
- No tag, GitHub Release, NuGet publish, or version bump. RB-003 and RB-008 are not closed by this task.

## Push
- `git push origin master` only.
