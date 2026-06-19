# TASK-0198: Investigate RB-003 and RB-008 closure evidence

## Purpose
Investigate the remaining release-blocker evidence for `RB-003` and `RB-008` after PROJECT-CONTROL-0110/TASK-0197, using only repository-local and read-only public evidence. Record the exact maintainer evidence still required before either blocker can be closed.

This is an investigation-only docs task. It must not move `0.2.0-alpha.3` from NO-GO to GO.

## Scope
- Verify the current local Git state before editing.
- Re-read the release blocker board, release decision, maintainer decision register, security notification ownership, package recovery procedure, and recent handoff/task docs.
- Record the current evidence boundary for:
  - `RB-003`: primary security owner exists, independent backup owner and notification coverage are not verified.
  - `RB-008`: package recovery procedure exists, destructive NuGet authority and backup recovery owner are not verified.
- Update the smallest set of docs needed to make the remaining evidence requirements explicit and hard to mistake for blocker closure.
- Update `.codex` handoff docs after the investigation so the next operator does not rely on stale blocker wording.
- Keep release status as `0.2.0-alpha.3 = NO-GO`.

## Out of scope
- Closing `RB-003` or `RB-008`.
- Assigning or fabricating a backup owner.
- Creating test advisories, private reports, or notification probes.
- Performing NuGet unlist, deprecate, owner, account-recovery, package, tag, release, or workflow-dispatch actions.
- Changing source/package metadata from `0.2.0-alpha.2` to `0.2.0-alpha.3`.
- Creating a tag, GitHub Release, NuGet package, release workflow run, or release-candidate workflow run.
- Changing runtime code unless a validation/doc gate exposes a narrowly scoped repository-local defect.

## Affected files
- `docs/tasks/TASK-0198-investigate-rb-003-and-rb-008-closure-evidence.md`
- `docs/RELEASE_BLOCKER_BOARD.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/NEXT_TASKS.md`

## Data/database impact
None. The project has no database or migration surface in this task.

## Admin impact
None locally. GitHub/NuGet administrative actions remain maintainer-only and out of scope.

## Security impact
Positive documentation-only impact: the task tightens the security/recovery evidence boundary without storing private reports, secrets, contact details, tokens, certificates, or recovery credentials.

## Permission/auth impact
No permission changes. The task records that verified permissions/authority are still missing for specific release-blocker criteria.

## Localization impact
None. Documentation-only English release/security records; no CLI localization strings change.

## SEO/i18n impact
None.

## UX impact
None for CLI/runtime UX. Maintainer docs become clearer.

## Logging/audit impact
Docs-only audit trail improvement. No logs, private notification payloads, or external service responses with sensitive data are committed.

## Plan
1. Commit this task plan before implementation.
2. Inspect current blocker evidence and exact doc wording.
3. Update the blocker board and release decision docs with explicit remaining evidence needed for `RB-003` and `RB-008`.
4. Update the decision register only if it can stay truthful: `Partial`, no closure, no GO.
5. Sync handoff/next-step docs with the investigation result.
6. Run required validation and targeted scripts.
7. Commit implementation/sync.
8. Add final evidence to this task and commit it.
9. Push only after validation and a clean working tree.

## Acceptance criteria
- The task plan is committed before implementation edits.
- `RB-003` remains open unless a second verified human owner and notification coverage record exist.
- `RB-008` remains open unless destructive NuGet authority and backup recovery coverage have a verified disposition.
- `docs/V020_ALPHA3_RELEASE_DECISION.md` still says `0.2.0-alpha.3` is NO-GO.
- No version, tag, release, NuGet, workflow-dispatch, owner, or security-setting mutation occurs.
- Final docs list exact remaining maintainer evidence, not vague "TBD" wording.
- Final working tree is clean.

## Test steps
- `dotnet restore`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `ackit scan --ci`
- `ackit doctor`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally implying release approval or blocker closure from docs-only evidence.
- Recording private contact, advisory, credential, or recovery-secret details.
- Treating maintainer-only remote authority as locally verified.
- Existing local PowerShell/git stderr warning may cause targeted scripts to exit non-zero; if so, record exact behavior and compare with the previously documented TASK-0193/TASK-0197 environment issue.

## Rollback plan
Single `git revert <sha>` for each TASK-0198 commit. No source/runtime migration is involved.

## Validation checklist
- [ ] Task plan committed.
- [ ] Blocker docs updated without claiming closure.
- [ ] Handoff docs synced.
- [ ] Restore/build/test complete.
- [ ] `ackit scan --ci` and `ackit doctor` recorded.
- [ ] Targeted scripts recorded.
- [ ] `git diff --check` clean.
- [ ] Working tree clean.
- [ ] Push completed only after validation.

## Evidence
- Current local and origin HEAD at takeover: `194480a`.
- `docs/SECURITY_NOTIFICATION_OWNERSHIP.md` says backup security triage owner is not assigned and notification delivery is unverified.
- `docs/PACKAGE_RECOVERY.md` says NuGet unlist/deprecate/account-recovery authority and backup recovery owner are unverified.

## Final status
Planned. No blocker is closed by this plan.

## Completion notes
Pending implementation and validation.
