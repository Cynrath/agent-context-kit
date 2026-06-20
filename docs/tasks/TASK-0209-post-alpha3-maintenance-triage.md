# TASK-0209: post-alpha3 maintenance triage

## Purpose
Inspect the remaining maintenance backlog after the successful `0.2.0-alpha.3` release and TASK-0208 release-provenance hardening, then produce a prioritized, evidence-backed next-task plan.

This is a planning and triage task. It should not implement analyzer cleanup or scan-finding fixes unless a tiny docs-only correction is clearly necessary and explicitly justified in the evidence.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, fetch/status, HEAD/origin, and recent-log checks.
- Confirm local `HEAD` and `origin/master` are aligned with expected post-TASK-0208 state before editing.
- Read the current queue, handoff, release, readiness, backlog, roadmap, and targeted test files before implementation work.
- Classify xUnit analyzer warnings observed during hosted RC/release:
  - `xUnit1051` in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`.
  - `xUnit2013` in `tests/AgentContextKit.Tests/WatchCommandTests.cs`.
- Classify current `ackit scan --ci` Medium/Low findings as real follow-up work, accepted local artifact review findings, or false positives.
- Audit public/current-state docs after alpha.3:
  - README/public docs say alpha3 is current.
  - Release docs no longer say alpha3 is pending or unpublished.
  - Provenance hardening is marked complete.
  - No stale current-state "next task: provenance hardening" remains outside historical/task evidence.
- Decide the next actual work item, expected to be one of:
  - analyzer-warning cleanup;
  - scan-finding classification;
  - workflow pin/status cleanup;
  - alpha4 planning;
  - v0.3.0 planning;
  - docs/queue simplification.
- Update current-state docs with the triage result and recommended next task.
- Record final evidence in this task file.

## Out of scope
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No unrelated source feature work.
- No large refactor.
- No destructive cleanup of release evidence.
- No automatic redaction or baseline acceptance.

## Affected files
- `docs/tasks/TASK-0209-post-alpha3-maintenance-triage.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- Optional, only if triage evidence belongs there:
  - `docs/ISSUE_BACKLOG.md`
  - `docs/ROADMAP.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No application admin UI or repository/package settings are changed.

## Security impact
Positive governance impact. The task classifies scan findings without auto-fixing or hiding them, and preserves immutable release boundaries for `0.2.0-alpha.3`.

## Permission/auth impact
No privileged operation is required beyond normal authenticated Git fetch/push if final local validation passes. No package, release, tag, workflow, owner, secret, security-setting, or recovery mutation is authorized.

## Localization impact
Documentation only. No runtime localization resources should change.

## SEO/i18n impact
Public README/current-state wording should remain correct for the published `0.2.0-alpha.3` package. No SEO content expansion is expected.

## UX impact
No CLI UX change. The user-facing outcome is clearer maintenance sequencing for the next task.

## Logging/audit impact
Adds audit evidence for local/current remote HEAD, release status, analyzer-warning classification, scan-finding classification, stale-current-state audit, validation results, and out-of-scope release mutation confirmation.

## Acceptance criteria
- TASK-0209 task plan is committed before any triage-result edits.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- Local `HEAD` and `origin/master` are recorded.
- Release status is recorded as `0.2.0-alpha.3` published and unchanged.
- xUnit analyzer warnings are classified with file-level evidence and a recommended follow-up.
- `ackit scan --ci` Medium/Low findings are classified without auto-redaction.
- Stale current-state audit distinguishes real stale docs from historical evidence/task text.
- The next recommended task is explicit, scoped, and safe.
- No release assets, tags, GitHub Release, NuGet package state, workflow dispatches, version, or package metadata are changed.
- Final raw porcelain is clean before push.

## Test steps
- Required first checks:

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

- Triage validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
dotnet test AgentContextKit.sln -c Release --no-build
```

- Targeted searches:

```powershell
rg -n "xUnit1051|xUnit2013|CancellationToken|Assert\.Equal\(1|Assert\.Equal\(.*Count|TestContext\.Current\.CancellationToken" tests/AgentContextKit.Tests

rg -n "provenance hardening remains|hardening remains a follow-up|alpha3 pending|alpha3 unpublished|0\.2\.0-alpha\.3.*NO-GO|0\.2\.0-alpha\.2.*current published|Current release.*0\.2\.0-alpha\.2" README.md README.tr.md docs .codex AGENTS.md CLAUDE.md .github/copilot-instructions.md .cursor/rules/project.mdc

rg -n "TODO|FOLLOW-UP|follow-up|TASK-0209|alpha4|0\.2\.0-alpha\.4|v0\.3\.0|V030|V100" docs .codex README.md README.tr.md
```

## Risks
- Treating historical task evidence as stale current state and rewriting valuable audit history.
- Under-classifying scan findings that need human review.
- Starting source implementation under a planning-only task.
- Accidentally implying a new release, version, tag, package, or workflow action is authorized.

## Rollback plan
Before push, correct the docs with normal commits. After push, revert TASK-0209 docs commits with normal `git revert <sha>` if the triage record is wrong. Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, or mutate GitHub Release/NuGet state.

## Completion notes
Pending.
