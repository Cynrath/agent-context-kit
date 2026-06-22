# TASK-0213: published package workflow pin status sync

## Purpose
Synchronize published-package workflow examples and status documentation with the current published `AgentContextKit` package version `0.2.0-alpha.3`.

The task focuses especially on any active smoke workflow or documentation example that still installs the historical `0.2.0-alpha.2` package when it is intended to validate the current published package.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, `git fetch origin`, status, HEAD/origin, and recent-log checks.
- Stop before edits if `git fetch origin` fails with `.git/FETCH_HEAD` permission denied or any `.git` write error.
- Read current state, release/status, packaging, GitHub Actions, example workflow, active workflow, and README files before edits.
- Create and commit this TASK-0213 plan before implementation changes.
- Audit current published-package pins and current/past release references.
- Classify `0.2.0-alpha.2` references as either:
  - `UPDATE_TO_ALPHA3` for current public install commands, current published-package smoke pins, current examples, and status docs that describe the current published package.
  - `KEEP_ALPHA2` for historical release evidence, predecessor package evidence, alpha2-specific release body/scope docs, historical task records, and immutable recovery verification.
- If `.github/workflows/cross-platform-smoke.yml` is the active workflow that verifies the current published package, update its install pin to `0.2.0-alpha.3`.
- If that workflow is intentionally historical, leave it unchanged and document why.
- Update affected state/status docs with validation evidence, preserved historical references, and the next recommended task.

## Out of scope
- No source feature work.
- No package metadata changes.
- No version bump.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No package artifact deletion.
- No broad scan suppression.
- No alpha4 or v0.3.0 planning.

## Affected files
- `docs/tasks/TASK-0213-published-package-workflow-pin-status-sync.md`
- Likely, if stale pins/status are found:
  - `.github/workflows/cross-platform-smoke.yml`
  - `docs/examples/github-actions-published-tool-smoke.yml`
  - `docs/GITHUB_ACTIONS_USAGE.md`
  - `docs/RELEASE_VALIDATION.md`
  - `docs/PACKAGING.md`
  - `docs/NUGET_METADATA.md`
  - `docs/NEXT_TASKS.md`
  - `.codex/SESSION_HANDOFF.md`
  - `.codex/CONTEXT_PACK.md`
  - `.codex/NEXT_STEPS.md`
  - `docs/ISSUE_BACKLOG.md`
- Do not change `.github/workflows/release.yml` unless the audit proves a stale current-package smoke pin exists there.

## Data/database impact
None. The repository has no database, migrations, or runtime data store in this task scope.

## Admin impact
None. No admin UI, repository settings, release settings, package ownership, security settings, or maintainer permissions are changed.

## Security/audit impact
Positive governance impact. The task reduces stale current-package workflow/status guidance while preserving historical alpha2 release evidence. No secrets, package credentials, release assets, or remote security settings are changed.

## Permission/auth impact
Normal git fetch/commit/push only after validation. No package, release, tag, workflow dispatch, owner, secret, security-setting, or recovery-state mutation is authorized.

## Localization impact
None expected. Runtime localized strings should not change.

## SEO/i18n impact
No SEO surface change. Public English/Turkish README install/status wording may be touched only if stale, and should remain aligned with the published `0.2.0-alpha.3` package.

## UX impact
No product UX change. Maintainer/user workflow UX improves by making published-package smoke guidance match the current published version.

## Logging/audit impact
Adds a durable task evidence record for:
- current HEAD/origin;
- which active workflow pin changed or stayed unchanged;
- which example/status docs changed;
- exact alpha2 references intentionally preserved;
- validation results;
- confirmation that no release/package/tag/GitHub Release/NuGet/workflow dispatch occurred.

## Acceptance criteria
- TASK-0213 plan is committed before implementation/status-sync edits.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- Required docs/workflows are read before edits.
- Audit search records current `0.2.0-alpha.2` and `0.2.0-alpha.3` pins/status references.
- Current public install commands and published-package smoke examples use `0.2.0-alpha.3`.
- If the active cross-platform published-package smoke workflow is meant to test the current published package, it installs `AgentContextKit` `0.2.0-alpha.3`.
- If any active workflow keeps `0.2.0-alpha.2`, the reason is documented.
- Historical/predecessor alpha2 references remain intact.
- `.github/workflows/release.yml` is unchanged unless a stale current-package smoke pin is proven there.
- Validation commands are run and results are recorded.
- No publish, release, tag, NuGet, package metadata, version, package artifact, or workflow dispatch mutation occurs.
- Final raw porcelain is clean before push.

## Test steps
Required first checks:

```powershell
ackit --help
ackit --version
git fetch origin
git status --porcelain=v1 --untracked-files=all 2>$null
git status --short
git rev-parse --short HEAD
git rev-parse HEAD
git rev-parse --short origin/master
git rev-parse origin/master
git log --oneline -n 40
```

Audit current published-package pins/status:

```powershell
rg -n "0\.2\.0-alpha\.2|0\.2\.0-alpha\.3|published package|published-package|dotnet tool install.*AgentContextKit|cross-platform-smoke|github-actions-published-tool-smoke" `
  README.md README.tr.md docs .github/workflows .codex `
  -g "*.md" -g "*.yml" -g "*.yaml"
```

Validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
dotnet test AgentContextKit.sln -c Release --no-build
```

If `.github/workflows/cross-platform-smoke.yml` changes, run focused static verification:

```powershell
rg -n "0\.2\.0-alpha\.2|0\.2\.0-alpha\.3" .github/workflows/cross-platform-smoke.yml docs/examples/github-actions-published-tool-smoke.yml docs/GITHUB_ACTIONS_USAGE.md docs/RELEASE_VALIDATION.md
```

## Risks
- Accidentally changing historical alpha2 release evidence that should remain immutable.
- Mutating release/package/tag/GitHub Release/NuGet/workflow state outside the task scope.
- Leaving an active current-package smoke workflow on a stale package pin.
- Updating docs without updating active workflow status, creating inconsistent maintainer guidance.
- Triggering workflow or package publication behavior by touching release automation unnecessarily.

## Rollback plan
Before push, correct documentation/workflow pins with normal commits. After push, use normal `git revert <sha>` for TASK-0213 commits if the sync was wrong.

Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, mutate GitHub Release/NuGet state, or delete retained release evidence as rollback.

## Completion notes
Completed as a focused active workflow pin and status-doc sync.

Commits:

- Plan: `647853c` (`docs: plan task 0213 published package pin sync`)
- Implementation: `a18152d` (`ci: sync published package smoke pin to alpha3`)
- Final evidence: this commit

Current HEAD/origin at final evidence collection before this final evidence commit:

- Local HEAD: `a18152d84e96dfb24ea852aa678ed2ba2b5e1033`
- Local HEAD short: `a18152d`
- `origin/master`: `5d063108f6e2d76169b9540cf6031e47c22c5e9e`
- `origin/master` short: `5d06310`

Required first checks:

- `ackit --help`: passed and showed the current command set.
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `git fetch origin`: passed; no `.git/FETCH_HEAD` permission error or `.git` write error occurred.
- Initial local HEAD and `origin/master`: both `5d063108f6e2d76169b9540cf6031e47c22c5e9e`, matching the expected TASK-0212 state.
- `git status --porcelain=v1 --untracked-files=all 2>$null`: clean at start.
- `git status --short`: exited `0` but printed the known Windows unreadable-directory warning; raw porcelain was clean.
- `git log --oneline -n 40`: confirmed TASK-0212 final evidence at `5d06310`.

Read/inspection notes:

- Required state, release/status, packaging, GitHub Actions, example workflow, active workflow, and README files were read before edits.
- Project structure remains .NET 10 CLI/tool: `src/AgentContextKit.Cli`, `src/AgentContextKit.Core`, and `tests/AgentContextKit.Tests`.
- No database, migrations, admin UI, auth/permission system, runtime SEO surface, or runtime localization source was changed.

Audit and classification:

- `UPDATE_TO_ALPHA3`: `.github/workflows/cross-platform-smoke.yml` still installed `AgentContextKit` `0.2.0-alpha.2` while repository docs define it as the active published-package smoke workflow. It now installs `0.2.0-alpha.3`.
- `UPDATE_TO_ALPHA3`: README.tr and maintainer/release status docs still described the active workflow pin sync as a follow-up. They now record that TASK-0213 syncs the active workflow pin and that hosted validation should be observed after push.
- `ALREADY_ALPHA3`: `docs/examples/github-actions-published-tool-smoke.yml`, `docs/examples/github-actions-scan-ci.yml`, `docs/examples/github-actions-sarif-upload.yml`, `docs/GITHUB_ACTIONS_USAGE.md`, `docs/PACKAGING.md`, `docs/NUGET_METADATA.md`, and README public install examples already used `0.2.0-alpha.3`.
- `KEEP_ALPHA2`: README previous-release notes, README.tr previous-release note, `release-candidate-evidence.yml` predecessor default, RC predecessor examples, `docs/RELEASE_VALIDATION.md` alpha2 publication/smoke evidence, `docs/MAINTAINER_RELEASE_HANDOFF.md` previous-release and historical alpha2 handoff sections, `.codex` historical task records, and historical `TASK-*` records.

Active workflow pin:

- Changed. `.github/workflows/cross-platform-smoke.yml` now installs the current published `AgentContextKit` `0.2.0-alpha.3` package.

Example/docs pin:

- Documentation-only public examples already installed `0.2.0-alpha.3`; no example YAML pin change was needed.
- Status docs now state that the active workflow pin sync is complete locally and that the next push-triggered hosted run should be observed.

Validation results:

- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `ackit doctor`: passed all checks.
- `ackit scan --ci`: exited `0`; remaining findings are `2` Medium retained package artifacts and `5` Low local-path references.
- `git diff --check`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`: passed, with the expected warning that the working tree had uncommitted changes during pre-commit validation.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues`: passed.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.
- Focused pin verification passed: active `cross-platform-smoke.yml`, published-tool example, GitHub Actions usage docs, and release validation docs show current-package installs as `0.2.0-alpha.3`; remaining `0.2.0-alpha.2` references in that focused set are predecessor or historical evidence.
- Some final validation commands printed a transient shell startup warning that oh-my-posh could not write an init script because the file was in use. The affected commands still exited `0`; this did not change repository files, release state, or validation outcomes.

Out-of-scope confirmation:

- No source feature work.
- No package metadata change.
- No version bump.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No manual workflow dispatch.
- No package artifact deletion.
- No `.ackit` baseline mutation.
- No broad scan suppression.
- No owner/account/secret/security-setting/recovery mutation.

Recommended next task:

- TASK-0214 docs/queue simplification and stale-heading cleanup, unless maintainers want hosted workflow-result follow-up after the TASK-0213 push first.
