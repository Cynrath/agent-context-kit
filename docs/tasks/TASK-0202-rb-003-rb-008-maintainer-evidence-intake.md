# TASK-0202: RB 003 RB 008 maintainer evidence intake

## Purpose
Record maintainer-provided external evidence that `ShadowFlameC` is the independent backup security notification owner and NuGet backup package recovery owner for planned `0.2.0-alpha.3`.

Update release-blocker state from the new evidence without performing release preparation, publication, workflow dispatch, owner mutation, security-setting mutation, or destructive NuGet action.

## Scope
- Verify local Git state, global `ackit --help`, and current-source help before editing.
- Read release workflow, blocker, release decision, ownership/recovery, state/handoff, and TASK-0201 evidence files.
- Record maintainer-provided evidence dated 2026-06-20 from `Cynrath`:
  - GitHub repository `Cynrath/agent-context-kit`;
  - primary repository owner `Cynrath`;
  - backup user `ShadowFlameC`;
  - repository permission `write` collaborator;
  - backup security notification owner and backup maintainer contact scope;
  - NuGet package `AgentContextKit`;
  - primary NuGet owner `Cyranth`;
  - backup NuGet package owner `ShadowFlameC`;
  - `nuget-release` environment as trusted-publishing release environment configuration, not a mandatory external approval gate;
  - no repository secret required for NuGet publishing because `release.yml` uses `NuGet/login@v1`.
- Mark `RB-003` closed from backup security notification owner evidence.
- Mark `RB-008` closed from NuGet backup package recovery owner evidence.
- Record that `ShadowFlameC` is backup/recovery coverage, not a mandatory release approver.
- Change `0.2.0-alpha.3` from NO-GO to release-preparation eligible / pending release preparation validation.
- Update only minimal docs/state needed for a clean release-preparation handoff.

## Out of scope
- Source code changes.
- Version bump or package metadata change.
- Tag creation or movement.
- GitHub Release creation or edit.
- NuGet publish.
- Release workflow dispatch.
- Release-candidate workflow dispatch.
- Security advisory creation.
- Branch ruleset mutation.
- Repository secret creation.
- Owner removal.
- Account/recovery mutation.
- Destructive NuGet action.
- Actual release preparation.
- Workflow YAML changes unless a real mismatch is found and documented first.
- Making `ShadowFlameC` a required release approver.

## Affected files
- `docs/tasks/TASK-0202-rb-003-rb-008-maintainer-evidence-intake.md`
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
Positive docs-only release-governance impact. The task records backup security and package recovery ownership without storing private contact details, advisory content, credentials, recovery secrets, API keys, tokens, or private notification endpoints.

## Permission/auth impact
Documentation-only. The maintainer-provided external permission/owner evidence is recorded, but this task performs no GitHub, NuGet, repository environment, branch ruleset, repository secret, owner, account recovery, or package state mutation.

## Localization impact
None. Release/security docs only; no runtime localization files.

## UX impact
None for CLI/runtime UX. Maintainer release handoff clarity improves.

## Logging/audit impact
Adds a task-first audit record for external maintainer evidence intake and blocker disposition changes.

## Evidence
Maintainer-provided evidence to record:
- Date: 2026-06-20.
- Release scope: planned `0.2.0-alpha.3`.
- Provided by: `Cynrath`.
- GitHub repository: `Cynrath/agent-context-kit`.
- Primary repository owner: `Cynrath`.
- Backup user: `ShadowFlameC`.
- Repository permission: `write` collaborator.
- Backup repository purpose: independent backup security notification owner and backup maintainer contact.
- Backup repository coverage: repository security notifications, private vulnerability reporting, future security advisory escalation, direct maintainer escalation.
- Release approval role: `ShadowFlameC` is not a mandatory reviewer; backup/recovery coverage only.
- NuGet package: `AgentContextKit`.
- Primary NuGet/package owner: `Cyranth`.
- Backup NuGet owner: `ShadowFlameC`.
- NuGet status: `ShadowFlameC` appears in the current NuGet package owner list.
- Backup NuGet purpose: backup package recovery owner, package owner continuity, unlist/deprecate coordination, recovery escalation, successor release coordination.
- GitHub Actions environment: `nuget-release`.
- Environment purpose: release environment for trusted publishing.
- Required external approval: not required for primary owner-driven release preparation.
- Repository secrets: none required for NuGet publish because `.github/workflows/release.yml` uses `NuGet/login@v1` trusted publishing.

## Plan
1. Commit this task plan before evidence implementation edits.
2. Verify `release.yml` matches the trusted-publishing facts and does not require repo secrets.
3. Update blocker board, release decision, decision register, security notification ownership, package recovery, and state/handoff docs with minimal evidence wording.
4. Keep source code, package metadata, release workflows, tags, GitHub Releases, NuGet publication, and owner/security settings unchanged.
5. Run required validation and targeted docs/contract scripts.
6. Commit implementation.
7. Record final evidence and commit it.
8. Push only after validation and clean raw porcelain.

## Acceptance criteria
- TASK-0202 plan is committed before implementation edits.
- `RB-003` is closed with `ShadowFlameC` recorded as independent backup security notification owner for `0.2.0-alpha.3`.
- `RB-008` is closed with `ShadowFlameC` recorded as NuGet backup package recovery owner for `0.2.0-alpha.3`.
- `ShadowFlameC` is clearly backup/recovery coverage, not a mandatory release approver.
- Primary owner-driven release preparation remains allowed for `Cynrath` / `Cyranth`.
- `0.2.0-alpha.3` becomes release-preparation eligible, not published.
- Next task is release preparation, not publish.
- No version, tag, GitHub Release, NuGet publish, workflow dispatch, security advisory, ruleset, repository secret, owner removal, account/recovery mutation, or destructive NuGet action occurs.
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
- Accidentally treating backup/recovery ownership as a mandatory release-approval gate.
- Accidentally starting release preparation or publication in an evidence-intake task.
- Recording private contact details, advisory content, credentials, recovery secrets, API keys, tokens, or private notification endpoints.
- Overstating publication state: alpha.3 is not published and no candidate package exists in this task.
- Known Windows `git status --short` unreadable-directory stderr warning may make PowerShell guard scripts fail even when raw porcelain is clean.

## Rollback plan
Single `git revert <sha>` for each TASK-0202 commit. Docs-only changes; no source/runtime migration, package cleanup, tag cleanup, release cleanup, NuGet cleanup, or workflow cleanup required.

## Completion notes
Pending implementation and validation.
