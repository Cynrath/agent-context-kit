# TASK-0203: v020 alpha3 release preparation

## Purpose
Prepare the exact local `0.2.0-alpha.3` release candidate by updating package metadata and release-preparation documentation, then validating the package locally with pack, package verification, and installed-tool smoke checks.

This task makes the repository ready for hosted release-candidate evidence in a later task. It does not publish, tag, dispatch workflows, create a GitHub Release, mutate owners/secrets/settings, or approve final release publication.

## Scope
- Run the required preflight checks before editing:
  - `ackit --help`
  - `git fetch origin`
  - `git status --porcelain=v1 --untracked-files=all 2>$null`
  - `git status --short`
  - `git rev-parse --short HEAD`
  - `git rev-parse --short origin/master`
  - `git log --oneline -n 20`
  - current-source `--help`
- Confirm local `HEAD` and `origin/master` start at `8077d02`.
- Read the project, release, workflow, CLI, blocker, handoff, and TASK-0202 evidence docs before implementation edits.
- Update `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`:
  - `<Version>0.2.0-alpha.3</Version>`
  - `<PackageReleaseNotes>` accurately summarizing the alpha.3 candidate scope from actual repository evidence.
- Review README install/version snippets and update only where appropriate for a prepared local `0.2.0-alpha.3` candidate, without claiming NuGet publication.
- Update release-preparation state docs:
  - `docs/V020_ALPHA3_RELEASE_DECISION.md`
  - `docs/RELEASE_CHECKLIST.md` if needed
  - `docs/RC_HOSTED_EVIDENCE.md` if needed
  - `docs/NEXT_TASKS.md`
  - `.codex/SESSION_HANDOFF.md`
  - `.codex/CONTEXT_PACK.md`
  - `.codex/NEXT_STEPS.md`
- Record that `RB-003` and `RB-008` were closed by TASK-0202 and are not blockers for local release preparation.
- Record that `0.2.0-alpha.3` becomes a prepared local candidate only after local validation passes.
- Pack the local candidate and run package verification plus installed-tool smoke checks from a local package source.
- Record final TASK-0203 evidence, candidate commit, package path, validation results, hosted RC evidence status, and publication status.

## Out of scope
- NuGet publish.
- GitHub Release creation or edit.
- Tag creation, movement, or deletion.
- Release workflow dispatch.
- Release-candidate workflow dispatch.
- Repository secret creation or mutation.
- Owner/account/recovery mutation.
- Branch ruleset or security setting mutation.
- Security advisory creation.
- Destructive NuGet action.
- Source feature work beyond package metadata and release-preparation docs.
- Unrelated refactor.
- Workflow YAML changes unless a real mismatch blocks release preparation and is documented first.

## Affected files
- `docs/tasks/TASK-0203-v020-alpha3-release-preparation.md`
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`
- `src/AgentContextKit.Cli/Program.cs`
- `src/AgentContextKit.Core/Templates.cs`
- `.github/workflows/cross-platform-source-smoke.yml`
- `.github/ISSUE_TEMPLATE/*.yml`
- `scripts/check-package-metadata.ps1`
- `scripts/check-release-candidate-inputs.ps1`
- `scripts/verify-release.ps1`
- `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs`
- `tests/AgentContextKit.Tests/IssueTemplateVersionPlaceholderTests.cs`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/project.mdc`
- `.github/copilot-instructions.md`
- `README.md`
- `README.tr.md`
- `docs/RELEASE_BLOCKER_BOARD.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/V020_ALPHA3_PLAN.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/NUGET_METADATA.md`
- `docs/PACKAGING.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md`
- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/GITHUB_ACTIONS_USAGE.md`
- `docs/HTML_REPORTS.md`
- `docs/JSON_OUTPUT.md`
- `docs/MCP_STDIO_DESIGN.md`
- `docs/ROADMAP.md`
- `docs/TROUBLESHOOTING.md`
- `docs/WEB_UI_PROTOTYPE.md`
- `docs/examples/github-actions-source-package-smoke.yml`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, hosted settings, release environment, branch rule, owner, or repository setting is changed.

## Security impact
Positive release-governance impact. This task keeps publication disabled while preparing an exact local candidate and recording evidence boundaries. It must not expose secrets, private notification details, recovery secrets, API keys, tokens, or private advisory content.

## Permission/auth impact
No permission, auth, owner, environment, repository secret, GitHub setting, or NuGet account mutation is performed. Existing TASK-0202 evidence keeps `RB-003` and `RB-008` closed for release-preparation entry only.

## Localization impact
Documentation wording only. No runtime localization resources are expected to change.

## SEO/i18n impact
No SEO surface change. README and README.tr version/install wording may change, with English/Turkish parity preserved at the documentation level.

## UX impact
No runtime CLI UX change beyond the package version reported by packaged metadata.

## Logging/audit impact
Adds task-first audit records for local release-candidate preparation, package validation, and install smoke evidence. No telemetry or remote artifact upload is introduced.

## Package/release impact
- Package metadata changes from `0.2.0-alpha.2` to `0.2.0-alpha.3`.
- CLI runtime version and source-package smoke install pin change to `0.2.0-alpha.3`; `scripts/prepare-release.ps1` requires these to match the requested candidate version, so this workflow YAML change is a release-preparation parity fix, not a workflow dispatch or publication action.
- Local `.nupkg` and `.snupkg` are created under `artifacts/package-validation/0.2.0-alpha.3`.
- Hosted RC evidence remains pending.
- Publication remains not authorized and not performed.

## Acceptance criteria
- TASK-0203 plan is committed before implementation edits.
- Package metadata is bumped to `0.2.0-alpha.3`.
- Package release notes accurately reflect actual alpha.3 candidate changes without overclaiming publication.
- README install/version wording remains clear that `0.2.0-alpha.2` is the published package until alpha.3 is published, while `0.2.0-alpha.3` is a prepared local candidate after validation.
- Release-preparation docs record:
  - `RB-003` closed by TASK-0202;
  - `RB-008` closed by TASK-0202;
  - local candidate prepared after validation;
  - hosted RC evidence pending;
  - publication not approved and not performed.
- Local restore/build/test/current-source help/current-source scan/doctor/diff checks pass or any known pre-existing caveat is explicitly recorded with supporting evidence.
- Local package pack and package verification pass for `0.2.0-alpha.3`.
- Temporary tool-path install smoke passes for the local `0.2.0-alpha.3` package.
- Targeted release/contract scripts are run and results recorded.
- Final evidence commit records candidate commit, package path, package verification, install smoke, validation results, hosted RC status, and release publication status.
- Final raw porcelain is clean.
- Push occurs only after validation and clean raw porcelain.
- No tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurs.

## Test steps
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `ackit doctor`
- `git diff --check`
- `dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -o artifacts/package-validation/0.2.0-alpha.3`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3 -PackageSource artifacts/package-validation/0.2.0-alpha.3`
- `dotnet tool install AgentContextKit --version 0.2.0-alpha.3 --add-source artifacts/package-validation/0.2.0-alpha.3 --tool-path <temp-tool-path>`
- `<temp-tool-path>/ackit --help`
- `<temp-tool-path>/ackit doctor`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally implying `0.2.0-alpha.3` is published when it is only locally prepared.
- Accidentally treating local validation as hosted RC evidence or final release GO.
- README version wording can confuse users if install examples point at an unpublished package.
- Package release notes can overclaim features if not grounded in actual source/docs evidence.
- Root `dotnet restore` can fail when both `.sln` and `.slnx` exist; use explicit `AgentContextKit.sln`.
- Global installed `ackit` may still be `0.2.0-alpha.2`, so global `ackit scan --ci` can differ from current-source scan.
- Some PowerShell gates may hit the known Windows `git status --short` unreadable-directory stderr warning even when raw porcelain is clean.
- `verify-release.ps1` may fail only on the known Windows git stderr behavior; if so, record internal restore/build/test/current-source scan/doctor/package evidence separately.

## Rollback plan
Single `git revert <sha>` for the TASK-0203 implementation and evidence commits if the candidate must be abandoned. The plan commit can remain as historical task record or be reverted separately if required. Delete local untracked package-validation artifacts only if they were not committed; no tag, release, NuGet package, workflow run, owner, secret, or remote setting cleanup should be needed because this task does not perform those actions.

## Completion notes
Pending.
