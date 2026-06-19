# TASK-0201: RB 003 RB 008 release blocker closure preflight

## Purpose
Perform a docs-only release-blocker closure preflight for `RB-003` and `RB-008`.

Determine whether the repository already contains enough evidence to close either blocker. If evidence is missing, keep the blocker open and record the exact maintainer-provided evidence required for closure. Do not fabricate evidence, infer ownership, mutate accounts/settings, or change release status without direct supporting records.

## Scope
- Verify local Git state and current-source CLI help before editing.
- Read the current release/blocker/handoff/task evidence files.
- Inspect repository-local evidence for `RB-003`:
  - primary security owner;
  - independent backup human owner;
  - notification coverage path;
  - review date;
  - exact release scope.
- Inspect repository-local evidence for `RB-008`:
  - destructive NuGet unlist/deprecate/account-recovery authority;
  - backup recovery owner;
  - recovery trigger criteria;
  - successor/unlist/deprecate steps;
  - review date;
  - exact release scope.
- Create a precise maintainer evidence checklist for missing closure criteria.
- Update only minimal docs needed to make the release path clear.
- Keep `0.2.0-alpha.3 = NO-GO` unless both blockers are genuinely closed with evidence.

## Out of scope
- Source code changes.
- Version bump.
- Package metadata change.
- Tag creation or movement.
- GitHub Release creation or edit.
- NuGet publish.
- Release workflow dispatch.
- Release-candidate workflow dispatch.
- Security setting mutation.
- Owner/account/recovery mutation.
- Destructive NuGet action.
- Fake backup owner or placeholder evidence treated as closure.
- Release preparation unless `RB-003` and `RB-008` are actually closed.

## Affected files
- `docs/tasks/TASK-0201-rb-003-rb-008-release-blocker-closure-preflight.md`
- `docs/RELEASE_BLOCKER_BOARD.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`
- `docs/PACKAGE_RECOVERY.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact
None.

## Security impact
Positive docs-only release governance impact. The task must not store private contact details, advisory content, credentials, recovery secrets, API keys, tokens, or private notification endpoints.

## Permission/auth impact
None. No GitHub, NuGet, package owner, security setting, workflow permission, or account recovery state changes.

## Localization impact
None. Release/security docs only; no runtime localization files.

## UX impact
None for CLI/runtime UX. Maintainer release handoff clarity improves.

## Logging/audit impact
Adds a task-first audit record for `RB-003`/`RB-008` closure preflight and exact remaining maintainer evidence.

## Plan
1. Commit this task plan before implementation edits.
2. Search and inspect repository-local `RB-003`/`RB-008` evidence after the required file reads.
3. Record found/missing closure criteria for each blocker without changing blocker status to closed unless direct evidence exists.
4. Update the blocker board, release decision, decision register, ownership/recovery docs, and handoff docs only where needed for a clear maintainer checklist.
5. Run required validation and targeted scripts.
6. Commit the preflight documentation update.
7. Record final evidence in this task and commit it.
8. Push only after validation and clean raw porcelain.

## Acceptance criteria
- TASK-0201 plan is committed before implementation edits.
- `RB-003` has a clear found/missing closure matrix.
- `RB-008` has a clear found/missing closure matrix.
- Missing maintainer evidence is recorded as an actionable checklist.
- No blocker is closed without direct repository evidence.
- `0.2.0-alpha.3` remains NO-GO unless both blockers are genuinely closed.
- No version, tag, GitHub Release, NuGet publish, workflow dispatch, security-setting, owner/account/recovery, or destructive NuGet action occurs.
- Final working tree is clean.

## Test steps
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `ackit doctor`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Treating `Cynrath` primary ownership as sufficient for independent backup coverage.
- Treating successful OIDC publish as proof of destructive NuGet unlist/deprecate/account-recovery authority.
- Treating documented procedure/tabletop as proof of actual recovery authority or backup owner assignment.
- Accidentally moving release status from NO-GO to GO.
- Existing Windows `git status --short` unreadable-directory stderr warning may make PowerShell guard scripts fail even when raw porcelain is clean.

## Rollback plan
Single `git revert <sha>` for each TASK-0201 commit. Docs-only changes; no source/runtime migration or generated artifact cleanup required.

## Preflight findings

### RB-003
Status after implementation preflight: open/partial.

Found:
- primary security owner: `Cynrath`;
- private disclosure channel: GitHub private vulnerability reporting, previously verified enabled;
- existing status/review date: 2026-06-14;
- applicable planning scope: repository / planned `0.2.0-alpha.3`, with no exact candidate prepared.

Missing:
- second verified human backup security owner or role;
- non-secret notification coverage path for primary and backup review;
- notification coverage evidence;
- completed-coverage review date;
- exact release scope tied to completed backup/coverage evidence.

Closure conclusion: insufficient evidence to close `RB-003`.

### RB-008
Status after implementation preflight: open/partial.

Found:
- decision owner: `Cynrath`;
- successful alpha.2 OIDC Trusted Publishing as normal publication evidence;
- recovery activation trigger criteria;
- successor, unlist, and deprecate procedure steps;
- tabletop/review date: 2026-06-14;
- applicable planning scope: package lifecycle / planned `0.2.0-alpha.3`, with no exact candidate prepared.

Missing:
- maintainer-verifiable NuGet unlist/deprecate/account-recovery authority;
- backup recovery owner or role;
- owner-linked recovery trigger, unlist/deprecate, successor-release, and communication coverage;
- completed authority/backup review date;
- exact release scope tied to completed recovery authority evidence.

Closure conclusion: insufficient evidence to close `RB-008`.

## Completion notes
Pending implementation and validation.
