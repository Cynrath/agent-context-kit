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
Pending.
