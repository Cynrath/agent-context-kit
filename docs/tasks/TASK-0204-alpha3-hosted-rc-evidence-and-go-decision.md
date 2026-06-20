# TASK-0204: alpha3 hosted rc evidence and go decision

## Purpose
Prepare and record the exact hosted release-candidate validation plan for `0.2.0-alpha.3` using the current `origin/master` commit as the candidate. If hosted evidence already exists for that exact commit/version/predecessor tuple, record the run evidence and make a GO/NO-GO decision. If it does not exist, record exact manual dispatch instructions and keep release status as hosted RC evidence pending.

This task does not publish, tag, create a GitHub Release, dispatch workflows, mutate owners/secrets/settings, or approve NuGet publication by itself.

## Scope
- Run required preflight checks before editing:
  - `ackit --help`
  - `git fetch origin`
  - `git status --porcelain=v1 --untracked-files=all 2>$null`
  - `git status --short`
  - `git rev-parse --short HEAD`
  - `git rev-parse --short origin/master`
  - `git log --oneline -n 20`
  - current-source `version`
  - current-source `--help`
- Verify local `HEAD` and `origin/master` are aligned at `195b933`.
- Verify the full candidate SHA from `origin/master`: `195b933df52ccba37e0edc8327e64aaecb5c5d8b`.
- Verify current source version/package metadata remains `0.2.0-alpha.3`.
- Verify the release-candidate workflow input contract:
  - manual `workflow_dispatch`;
  - required inputs `commit_sha`, `candidate_version`, and `predecessor_version`;
  - matrix includes `windows-2025`, `ubuntu-latest`, and `macos-latest`;
  - `scripts/check-release-candidate-inputs.ps1` validates exact commit/version inputs;
  - workflow installs the published predecessor package;
  - workflow packs and installs the source candidate package;
  - workflow runs upgrade, baseline, SARIF, and synthetic performance evidence.
- Use dispatch inputs that match the dispatch-time `origin/master` state:
  - `commit_sha=<post-TASK-0204 origin/master full SHA>`
  - `candidate_version=0.2.0-alpha.3`
  - `predecessor_version=0.2.0-alpha.2`
- Check read-only hosted run status for `release-candidate-evidence.yml`; record whether exact alpha.3 evidence already exists.
- Update release-candidate evidence docs and state/handoff docs with exact dispatch instructions and pending/GO/NO-GO decision state.
- Keep package metadata unchanged unless a real mismatch is found.
- Keep workflow YAML unchanged unless a real mismatch blocks hosted RC evidence and is documented first.

## Out of scope
- NuGet publish.
- GitHub Release creation or edit.
- Tag creation, movement, or deletion.
- Release workflow dispatch.
- Release-candidate workflow dispatch unless explicitly requested by a maintainer in the current session.
- Repository secret creation or mutation.
- Owner/account/recovery mutation.
- Branch ruleset or security setting mutation.
- Security advisory creation.
- Destructive NuGet action.
- Source feature work.
- Unrelated refactor.

## Affected files
- `docs/tasks/TASK-0204-alpha3-hosted-rc-evidence-and-go-decision.md`
- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/GITHUB_ACTIONS_USAGE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, hosted settings, release environment, branch rule, owner, repository setting, or NuGet account setting is changed.

## Security impact
Positive release-governance impact. This task records exact hosted RC evidence boundaries and prevents publication from being inferred from local preparation alone. It must not store secrets, private notification details, recovery secrets, API keys, tokens, or private advisory content.

## Permission/auth impact
No permission, auth, owner, environment, repository secret, GitHub setting, or NuGet account mutation is performed. The RC workflow dispatch instructions require a future maintainer action, but this task does not dispatch it.

## Localization impact
Documentation wording only. No runtime localization resources are expected to change.

## SEO/i18n impact
No SEO surface change. English project documentation is updated; no public package install wording should imply alpha.3 publication.

## UX impact
No runtime CLI UX change. Documentation improves maintainer release workflow clarity.

## Logging/audit impact
Adds task-first audit records for exact hosted RC evidence planning and release decision status. No telemetry, remote artifact upload, SARIF upload, workflow dispatch, or release action is introduced.

## Package/release impact
- Candidate source/package version remains `0.2.0-alpha.3`.
- Published predecessor for hosted RC evidence is `0.2.0-alpha.2`.
- Exact candidate commit is dispatch-time current `origin/master`. TASK-0204 preflight started from `195b933df52ccba37e0edc8327e64aaecb5c5d8b`, but TASK-0204 commits advance the branch before dispatch.
- Hosted RC evidence remains pending unless an exact passing run already exists.
- Publication remains not authorized and not performed.

## Acceptance criteria
- TASK-0204 plan is committed before other release-decision documentation edits.
- Exact preflight SHA and dispatch-time SHA handling are recorded; final pushed HEAD is reported after push.
- Candidate version `0.2.0-alpha.3` and predecessor version `0.2.0-alpha.2` are recorded.
- RC workflow contract is verified and documented.
- Hosted run status is checked read-only.
- If no exact hosted alpha.3 run exists, docs record exact manual dispatch instructions and the decision remains hosted RC evidence pending.
- If an exact hosted run exists and all OS jobs passed, docs record a GO for later publish preparation only, not publication.
- If an exact hosted run exists and failed, docs record NO-GO with the exact failure reason.
- Local validation and targeted scripts are run and recorded.
- No tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurs.
- Final raw porcelain is clean before push.

## Test steps
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- version`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `ackit doctor`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha <dispatch-time-origin-master-full-sha> -CandidateVersion 0.2.0-alpha.3 -PredecessorVersion 0.2.0-alpha.2 -RequireOriginMaster`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally treating local package preparation as hosted RC evidence.
- Accidentally treating hosted RC evidence planning as final publish approval.
- Dispatching the workflow without explicit maintainer instruction.
- Using predecessor `0.2.0-alpha.1` instead of the current published predecessor `0.2.0-alpha.2`.
- Recording `33e1897` as the hosted candidate when the workflow expects current `origin/master`.
- Recording preflight `195b933` as the final dispatch commit after TASK-0204 commits advance `origin/master`.
- Root `dotnet restore` can fail when both `.sln` and `.slnx` exist; use explicit `AgentContextKit.sln`.
- Global installed `ackit` may still be `0.2.0-alpha.2`, so global help/scan can differ from current-source behavior until alpha.3 is published.
- Some PowerShell gates may hit the known Windows `git status --short` unreadable-directory stderr warning even when raw porcelain is clean.
- `verify-release.ps1` or RC evidence scripts may fail only on the known Windows git stderr behavior; if so, record internal restore/build/test/current-source scan/doctor evidence separately.

## Rollback plan
Single `git revert <sha>` for TASK-0204 documentation/evidence commits if the hosted evidence plan must be replaced. No tag, release, NuGet package, workflow run, owner, secret, branch rule, security advisory, or remote setting cleanup should be needed because this task does not perform those actions.

## Completion notes
Completed locally on 2026-06-20.

Evidence summary:
- Plan commit: `4517893` (`docs: plan task 0204 hosted rc evidence`).
- Documentation preparation commit: `2fa9195` (`docs: prepare alpha3 hosted rc evidence`).
- Candidate version: `0.2.0-alpha.3`.
- Predecessor version: `0.2.0-alpha.2`.
- Preflight candidate SHA at task start: `195b933df52ccba37e0edc8327e64aaecb5c5d8b` (`195b933`).
- Dispatch candidate rule: use dispatch-time current `origin/master` full SHA, because `scripts/check-release-candidate-inputs.ps1 -RequireOriginMaster` requires `HEAD == commit_sha == origin/master`.
- Local verification finding: `check-release-candidate-inputs.ps1 -CommitSha 195b933df52ccba37e0edc8327e64aaecb5c5d8b -CandidateVersion 0.2.0-alpha.3 -PredecessorVersion 0.2.0-alpha.2 -RequireOriginMaster` failed after TASK-0204 plan commit because checked-out `HEAD` no longer matched the preflight SHA. This proves hard-coding `195b933` would fail once TASK-0204 commits are pushed.
- HEAD-only input validation passed for documentation preparation commit `4517893c5a6333e59fe5e5a1df8a8c79d650d639` with candidate `0.2.0-alpha.3` and predecessor `0.2.0-alpha.2`.
- Workflow contract verified: `workflow_dispatch`, required inputs, exact input validation through `scripts/check-release-candidate-inputs.ps1`, `windows-2025` / `ubuntu-latest` / `macos-latest` matrix, predecessor install, source candidate pack/install, upgrade/baseline/SARIF/performance evidence, no artifact upload, and no SARIF upload.
- Read-only hosted run check: only historical alpha.2 RC runs were found (`27478635057` success for `4c4fa64`, `27478415124` failure for earlier attempt). No alpha.3 hosted RC run exists yet.
- Required local validation passed: explicit `dotnet restore AgentContextKit.sln`, `dotnet build AgentContextKit.sln -c Release --no-restore`, `dotnet test AgentContextKit.sln -c Release --no-build` (`428/428`), current-source `version`, current-source `--help`, current-source `scan --ci`, `ackit doctor`, and `git diff --check`.
- Targeted gates passed: `check-tracked-vs-untracked-md.ps1`, `check-cli-contract.ps1`, `check-localization-parity.ps1`, `check-release-candidate-workflow.ps1`, and HEAD-only `check-release-candidate-inputs.ps1`.
- `check-release-candidate-evidence.ps1` exited `0` but reported subordinate gate issues caused by the known Windows `git status --short` unreadable-directory stderr warning and the dirty documentation working tree during pre-commit validation. Raw porcelain is checked separately before push.
- `verify-release.ps1` passed restore/build/test/current-source scan/doctor, then stopped in release blocker review because `check-release-blockers.ps1` hit the same known Windows `git status --short` unreadable-directory stderr warning.
- Hosted RC evidence status: pending.
- Release decision: pending; no exact-candidate GO and no NO-GO from hosted evidence.
- Release publication status: not authorized and not performed.
- Version/tag/GitHub Release/NuGet/workflow dispatch status: no tag, no GitHub Release, no NuGet publish, no release workflow dispatch, and no release-candidate workflow dispatch occurred.

Result: TASK-0204 records the hosted RC dispatch plan and keeps `0.2.0-alpha.3` unpublished with hosted RC evidence pending. The next action is maintainer manual dispatch of `release-candidate-evidence.yml` using the post-push `origin/master` full SHA, `candidate_version=0.2.0-alpha.3`, and `predecessor_version=0.2.0-alpha.2`.
