# TASK-0206: alpha3 publish

## Purpose
Publish `AgentContextKit` `0.2.0-alpha.3` through the existing OIDC/trusted-publishing `release.yml` workflow, then verify the immutable NuGet package, Git tag, GitHub pre-release, global tool smoke, and release evidence docs.

This task is authorized by the maintainer to perform verification, GitHub Actions checks, `release.yml` workflow dispatch, run monitoring, and post-publish verification for `0.2.0-alpha.3` without repeated confirmation, provided all release gates pass and no package/tag/release conflict exists.

## Scope
- Start with mandatory `ackit --help`, repo fetch/status, HEAD/origin checks, and required release file inspection.
- Use `ackit task` to create this task file before publish work.
- Commit the task plan before release preflight work.
- Select the publish SHA from the current `origin/master` full SHA because `.github/workflows/release.yml` requires `automation_commit_sha == release_commit_sha` for `operation=publish` and runs `scripts/prepare-release.ps1 -RequireOriginMaster`.
- Compare hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` to the selected publish SHA.
- Classify all changed files between the hosted RC evidence commit and publish SHA as package/source-impacting or docs/handoff/governance-only.
- Stop before publish if any package/source-impacting file changed, unless a new hosted RC evidence run is recorded for the selected publish SHA.
- Verify current source version, package metadata, remote package/tag/release absence, local validation, and release gates.
- Record pre-dispatch evidence and explicit publish authorization in release docs, then commit it.
- Recompute final `origin/master` SHA after the pre-dispatch evidence commit and repeat the RC-to-publish diff classification.
- Dispatch `release.yml` with `operation=publish`, `version=0.2.0-alpha.3`, `automation_commit_sha=<publishSha>`, `release_commit_sha=<publishSha>`, and `prerelease=true`.
- Monitor the release workflow run to completion.
- If the workflow waits on `nuget-release` environment approval, use only allowed owner-account approval paths; otherwise report the exact wait state and stop.
- After successful workflow completion, verify the NuGet package, global tool install, `ackit version`, `ackit --help`, `ackit doctor`, tag target, GitHub Release prerelease state, and workflow success.
- Update release decision, release checklist, hosted evidence, validation, packaging, NuGet metadata, maintainer handoff, queue, handoff, context, next-step, and TASK-0206 docs with immutable publish evidence.
- Commit final publish evidence and push `master` after raw porcelain and whitespace checks are clean.

## Out of scope
- Manual tag creation outside `release.yml`.
- Manual GitHub Release creation outside `release.yml`.
- Manual NuGet package upload outside `release.yml`.
- Repository secret creation or use.
- NuGet API key handling outside trusted publishing output.
- Tag movement, version reuse, force push, history rewrite, or destructive Git/NuGet actions.
- Source feature work or package metadata changes unless a blocking release defect requires a new task/evidence cycle.
- Security setting, branch ruleset, owner/account/recovery, or advisory mutation.
- SARIF upload or repository content upload outside the existing workflow behavior.

## Affected files
- `docs/tasks/TASK-0206-alpha3-publish.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/PACKAGING.md`
- `docs/NUGET_METADATA.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
No application admin UI impact. GitHub Actions `nuget-release` environment behavior may require environment approval depending on repository settings; no repository environment, secret, owner, or setting mutation is in scope.

## Security impact
Positive release-governance impact. The task verifies immutable release state, package/tag/release absence before publish, OIDC trusted-publishing boundary, and post-publish package integrity without exposing secrets or using repository secrets.

## Permission/auth impact
Requires authenticated `gh` and repository permission sufficient to dispatch and monitor `release.yml`; environment approval may be required by GitHub environment policy. Requires NuGet trusted publishing configured for `NuGet/login@v1` user `Cyranth` inside the workflow. No local secret, API key, or manual credential is created or used.

## Localization impact
Documentation only. No runtime localization resources are expected to change.

## SEO/i18n impact
No SEO surface change. English release documentation and install/version wording may be updated after publication; README public install wording must only claim `0.2.0-alpha.3` after NuGet availability is verified.

## UX impact
No runtime CLI UX change. Published global tool smoke verifies the existing CLI command surface and current version output.

## Logging/audit impact
Adds release audit records for publish SHA selection, RC-to-publish diff classification, workflow run ID/URL, NuGet verification, tag verification, GitHub Release verification, installed global tool smoke, and immutable release rule compliance.

## Acceptance criteria
- Task plan commit exists before publish preflight evidence edits.
- `origin/master` and local HEAD start from the expected pushed state or any drift is recorded before proceeding.
- Current source reports `AgentContextKit 0.2.0-alpha.3`.
- Package metadata gate passes for `0.2.0-alpha.3`.
- NuGet package `AgentContextKit` `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and GitHub Release `v0.2.0-alpha.3` do not already exist before publish.
- Hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` to selected publish SHA diff is classified.
- If the selected publish SHA is later than the hosted RC evidence commit, only docs/handoff/governance files changed; otherwise stop for a new hosted RC or NO-GO.
- Local validation and release gates pass, or any known Windows `git status --short` stderr caveat is bounded by clean raw porcelain and non-source-impacting evidence.
- Pre-dispatch docs record selected publish SHA, reason, RC evidence SHA, diff classification, validation result, and explicit publish authorization.
- `release.yml` publish workflow succeeds for the exact selected publish SHA.
- NuGet package exists and verifies through `scripts/verify-published-package.ps1`.
- Global tool install of `AgentContextKit` `0.2.0-alpha.3` succeeds and `ackit version` reports `AgentContextKit 0.2.0-alpha.3`.
- Tag `v0.2.0-alpha.3` exists and points to the intended publish SHA.
- GitHub Release `v0.2.0-alpha.3` exists and is a prerelease.
- Final release docs record immutable evidence and no manual package/tag/release mutation occurred.
- Final raw porcelain is clean before push, final docs commit is pushed, and no generated junk is committed.

## Test steps
- `ackit --help`
- `ackit doctor`
- `ackit scan --ci`
- `git fetch origin`
- `git status --porcelain=v1 --untracked-files=all 2>$null`
- `git status --short`
- `git rev-parse --short HEAD`
- `git rev-parse HEAD`
- `git rev-parse --short origin/master`
- `git rev-parse origin/master`
- `git log --oneline -n 30`
- `git diff --name-only beaa14deed3dbc55ac98d216679f9a9799261801..$publishSha`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- version`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -ExpectedVersion 0.2.0-alpha.3 -FailOnIssues`
- NuGet HEAD absence check for `https://api.nuget.org/v3-flatcontainer/agentcontextkit/0.2.0-alpha.3/agentcontextkit.0.2.0-alpha.3.nupkg`
- `git fetch --tags origin`
- local tag absence check for `v0.2.0-alpha.3`
- `gh release view v0.2.0-alpha.3 --repo Cynrath/agent-context-kit`
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-release.ps1 -Version 0.2.0-alpha.3 -CommitSha $publishSha -RequireOriginMaster -FailOnIssues`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1 -Version 0.2.0-alpha.3`
- `gh workflow run release.yml --repo Cynrath/agent-context-kit --ref master -f operation=publish -f version=0.2.0-alpha.3 -f automation_commit_sha=$publishSha -f release_commit_sha=$publishSha -f prerelease=true`
- `gh run watch <RUN_ID> --repo Cynrath/agent-context-kit --exit-status`
- `gh run view <RUN_ID> --repo Cynrath/agent-context-kit --json databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName,jobs`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3`
- `dotnet tool uninstall -g AgentContextKit`
- `dotnet tool install -g AgentContextKit --version 0.2.0-alpha.3`
- `ackit version`
- `ackit --help`
- `ackit doctor`
- `git rev-parse v0.2.0-alpha.3`
- `gh release view v0.2.0-alpha.3 --repo Cynrath/agent-context-kit`

## Risks
- Publishing a docs-only successor commit without proving package/source files are unchanged from the hosted RC evidence commit.
- Accidentally using the older hosted RC evidence commit as `release_commit_sha` when the workflow requires current `origin/master`.
- Existing NuGet package/tag/release conflict for `0.2.0-alpha.3`.
- Environment approval wait in `nuget-release`.
- NuGet trusted publishing configuration failure.
- GitHub Actions hosted runner or NuGet availability flake.
- Known Windows `git status --short` stderr warning causing local wrapper scripts to fail even when raw porcelain is clean.
- Global tool cache/path behavior after uninstall/install.
- Immutable release actions cannot be undone without successor-release procedures.

## Rollback plan
Before workflow dispatch, revert TASK-0206 docs commits with normal `git revert <sha>` if the publish decision changes. After workflow dispatch, do not move tags, reuse versions, delete or replace published packages, or mutate release artifacts manually. If publication succeeds but docs need correction, commit a docs-only follow-up. If publication partially succeeds, use the existing release recovery/verify-existing path and immutable successor-release policy; never overwrite the published version.

## Completion notes
In progress on 2026-06-20.

Plan and preflight:
- Plan commit: `85383a9321566f9e0989a0db5429fb7d72d6109a` (`docs: plan task 0206 alpha3 publish`).
- Plan commit was pushed to `origin/master` so release workflow exact-commit checks can use remote state.
- Hosted RC evidence SHA: `beaa14deed3dbc55ac98d216679f9a9799261801`.
- Initial publish SHA candidate after the plan push: `85383a9321566f9e0989a0db5429fb7d72d6109a`.
- Publish SHA policy: use the final `origin/master` full SHA at dispatch time for both `automation_commit_sha` and `release_commit_sha`.
- Reason: `.github/workflows/release.yml` requires `automation_commit_sha == release_commit_sha` for `operation=publish`, and the workflow runs `scripts/prepare-release.ps1 -RequireOriginMaster`.

RC-to-publish bridge classification:
- Command: `git diff --name-only beaa14deed3dbc55ac98d216679f9a9799261801..85383a9321566f9e0989a0db5429fb7d72d6109a`.
- Changed files: 16.
- Package/source-impacting files: 0.
- Classification: docs/handoff/governance-only successor to the hosted RC evidence commit.
- Changed paths were limited to `.codex/*`, release/governance docs under `docs/`, and task docs `TASK-0205` / `TASK-0206`.
- No `src/**`, `tests/**`, `scripts/**`, release workflow YAML, RC workflow YAML, README, solution/build metadata, `global.json`, or `NuGet.config` changed.

Pre-publish validation:
- Current-source version: `AgentContextKit 0.2.0-alpha.3`.
- Package metadata gate for `0.2.0-alpha.3`: passed.
- NuGet package absence check: `0.2.0-alpha.3` did not exist before publish.
- Local tag absence check: `v0.2.0-alpha.3` did not exist before publish.
- GitHub Release absence check: `v0.2.0-alpha.3` did not exist before publish.
- `dotnet restore AgentContextKit.sln`: passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore`: passed with existing xUnit analyzer warnings only (`xUnit1051`, `xUnit2013`) and 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.
- Current-source `version`, `--help`, and `scan --ci`: passed; scan reported known Medium/Low review findings only.
- `ackit doctor`: passed.
- `git diff --check`: passed.
- `check-tracked-vs-untracked-md`, `check-cli-contract`, `check-localization-parity`, `check-release-candidate-workflow`, and `check-package-metadata`: passed under `pwsh`.
- `prepare-release.ps1 -Version 0.2.0-alpha.3 -CommitSha 85383a9321566f9e0989a0db5429fb7d72d6109a -RequireOriginMaster -FailOnIssues`: passed, with the known Windows git unreadable-directory stderr warning printed before the successful result.
- `verify-release.ps1 -Version 0.2.0-alpha.3`: restore/build/test/source scan/doctor passed, then release blocker review stopped on the known Windows `git status --short` unreadable-directory stderr warning. Raw porcelain was separately clean, the Markdown completeness guard passed under `pwsh`, package metadata passed, and historical `v0.2.0-alpha.2` tag resolved to `f540479a92cbe66097f6796553828ee49ddd5512`.

Pre-dispatch decision:
- GO to proceed to the release workflow dispatch if the recomputed post-evidence `origin/master` remains a docs/handoff/governance-only successor to hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801`.
- Explicit publish authorization is the maintainer instruction in TASK-0206: publish `0.2.0-alpha.3` only through `release.yml` if all gates pass and no package/tag/release conflict exists.
- Do not manually create tags or GitHub Releases outside `release.yml`; do not use repository secrets.
- Final publish SHA must be recomputed after this pre-dispatch evidence commit is pushed.
