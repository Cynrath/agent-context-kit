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
- Use expected dispatch inputs:
  - `commit_sha=195b933df52ccba37e0edc8327e64aaecb5c5d8b`
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
- Exact candidate commit is current `origin/master`, `195b933df52ccba37e0edc8327e64aaecb5c5d8b`.
- Hosted RC evidence remains pending unless an exact passing run already exists.
- Publication remains not authorized and not performed.

## Acceptance criteria
- TASK-0204 plan is committed before other release-decision documentation edits.
- Exact candidate full SHA and short SHA are recorded.
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
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha 195b933df52ccba37e0edc8327e64aaecb5c5d8b -CandidateVersion 0.2.0-alpha.3 -PredecessorVersion 0.2.0-alpha.2 -RequireOriginMaster`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally treating local package preparation as hosted RC evidence.
- Accidentally treating hosted RC evidence planning as final publish approval.
- Dispatching the workflow without explicit maintainer instruction.
- Using predecessor `0.2.0-alpha.1` instead of the current published predecessor `0.2.0-alpha.2`.
- Recording `33e1897` as the hosted candidate when the workflow expects current `origin/master` commit `195b933`.
- Root `dotnet restore` can fail when both `.sln` and `.slnx` exist; use explicit `AgentContextKit.sln`.
- Global installed `ackit` may still be `0.2.0-alpha.2`, so global help/scan can differ from current-source behavior until alpha.3 is published.
- Some PowerShell gates may hit the known Windows `git status --short` unreadable-directory stderr warning even when raw porcelain is clean.
- `verify-release.ps1` or RC evidence scripts may fail only on the known Windows git stderr behavior; if so, record internal restore/build/test/current-source scan/doctor evidence separately.

## Rollback plan
Single `git revert <sha>` for TASK-0204 documentation/evidence commits if the hosted evidence plan must be replaced. No tag, release, NuGet package, workflow run, owner, secret, branch rule, security advisory, or remote setting cleanup should be needed because this task does not perform those actions.

## Completion notes
Pending.
