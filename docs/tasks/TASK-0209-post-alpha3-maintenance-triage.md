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

## Triage result
Prioritized maintenance plan:

1. TASK-0210 analyzer-warning cleanup.
   - Evidence: hosted RC/release annotations and local build evidence show `xUnit1051` in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` and `xUnit2013` in `tests/AgentContextKit.Tests/WatchCommandTests.cs`.
   - Scope: pass `TestContext.Current.CancellationToken` to async `RunAsync` calls that accept cancellation tokens, and replace the single `Assert.Equal(1, report.SeverityChangedSample.Count)` with the xUnit-preferred collection assertion.
   - Reason: this is small, local, behavior-preserving test-source cleanup and removes recurring hosted annotations.
2. TASK-0211 scan-finding classification.
   - Evidence: `ackit scan --ci` exits `0` with Medium review findings for `.remember/logs/**/*.log` and `artifacts/package-validation/0.2.0-alpha.3/*.{nupkg,snupkg}`, plus Low local-path findings in `docs/CLI_REFERENCE.md`, `docs/tasks/TASK-0203-v020-alpha3-release-preparation.md`, and `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`.
   - Scope: classify each finding as accepted local artifact review evidence, real cleanup work, or false positive. Do not auto-redact, delete release evidence, or accept a new baseline without explicit review.
3. TASK-0212 workflow pin/status cleanup.
   - Evidence: `docs/MAINTAINER_GUIDE.md` records published-package smoke workflow pin sync as a follow-up, and `.github/workflows/cross-platform-smoke.yml` still installs `AgentContextKit` `0.2.0-alpha.2`.
   - Scope: decide whether to update the workflow pin to `0.2.0-alpha.3`, then run focused workflow/static checks. This is lower priority than analyzer cleanup because it touches workflow behavior.
4. TASK-0213 docs/queue simplification.
   - Evidence: `docs/PROJECT_EXECUTION_QUEUE.md` still has old active-section headings for completed controls.
   - Scope: docs-only cleanup of queue headings and stale "next release work should harden provenance" wording without rewriting historical evidence.
5. Defer alpha4 and v0.3.0 planning.
   - Reason: the immediate backlog contains smaller, evidence-backed maintenance work that should be cleared before selecting the next package scope.

Current-state cleanup performed in this task:

- Replaced stale current-state provenance-hardening follow-up wording with TASK-0208-complete wording in current release/queue docs.
- Kept historical TASK-0206/TASK-0207/TASK-0208 evidence intact.
- Did not change source code, tests, workflows, package metadata, release assets, tags, GitHub Release, NuGet package state, or workflow dispatch state.

## Completion notes
Completed as post-alpha3 planning/triage only.

Commits:
- Plan: `a7d0135` (`docs: plan task 0209 post-alpha3 triage`)
- Triage result: `5919de6` (`docs: record post-alpha3 maintenance triage`)
- Final evidence: this commit

Current HEAD/origin at final evidence collection:
- Local HEAD before this final evidence commit: `5919de61f233f0dd6ba8ad7a336efe1918da5d98`
- Local HEAD short before this final evidence commit: `5919de6`
- `origin/master`: `f9675d58069a8024b32b8d004e102ffe0b1433b9`
- `origin/master` short: `f9675d5`
- Working tree before this final evidence edit: clean.

Release status:
- `AgentContextKit` `0.2.0-alpha.3` remains the current published GitHub/NuGet prerelease.
- NuGet package, tag `v0.2.0-alpha.3`, and GitHub prerelease remain unchanged.
- TASK-0208 provenance hardening remains complete for future releases.
- No release workflow dispatch, release-candidate dispatch, NuGet publish, tag mutation, GitHub Release mutation, package metadata change, version bump, or alpha.3 artifact mutation occurred.

Validation results:
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `ackit doctor`: passed all checks.
- `ackit scan --ci`: exited `0`; reported existing Medium/Low review findings only.
- `git diff --check`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed; working tree clean and no missing Markdown/source commits detected.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.
- Additional build check: a concurrent build/test run reproduced the existing xUnit analyzer warnings, but also produced transient MSB3026 file-lock retry warnings because tests were running at the same time. A later standalone `dotnet build AgentContextKit.sln -c Release --no-restore` completed with `0` warnings and `0` errors due the already-built incremental state.

xUnit analyzer warning classification:
- `xUnit1051` in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`: real test-code responsiveness warning. Most calls to `McpStdioTransport.RunAsync(...)` should pass `TestContext.Current.CancellationToken`; the intentional cancellation-behavior test needs careful handling so the semantic canceled-token assertion remains covered.
- `xUnit2013` in `tests/AgentContextKit.Tests/WatchCommandTests.cs`: real test-style warning at `Assert.Equal(1, report.SeverityChangedSample.Count)`. Preferred follow-up is `Assert.Single(report.SeverityChangedSample)`.
- Recommendation: TASK-0210 should fix these warnings as focused test-source cleanup, then run Release build/test/scan. This task did not start implementation.

Scan finding classification:
- Medium `.remember/logs/**/*.log` findings: accepted local artifact review findings for now; classify retention/ignore/cleanup in a dedicated task before any deletion.
- Medium `artifacts/package-validation/0.2.0-alpha.3/*.nupkg` and `*.snupkg` findings: accepted local release/package validation artifacts for now; do not delete as part of triage because they may be evidence.
- Low local-path findings in `docs/CLI_REFERENCE.md`, `docs/tasks/TASK-0203-v020-alpha3-release-preparation.md`, and `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`: likely documentation/test-fixture path references or scanner false positives, but require human-readable classification before suppression/redaction.
- Recommendation: TASK-0211 should record this classification without automatic redaction, destructive cleanup, or baseline acceptance.

Stale current-state audit result:
- README/public docs show `0.2.0-alpha.3` as current and published.
- Release docs no longer say alpha3 is pending or unpublished as current state.
- TASK-0208 provenance hardening is marked complete in current-state docs.
- Stale current-state provenance follow-up wording was corrected in `docs/ROADMAP.md`, `docs/RELEASE_CHECKLIST.md`, `docs/PROJECT_EXECUTION_QUEUE.md`, and `docs/MAINTAINER_DECISION_REGISTER.md`.
- The exact stale-provenance search returned no matches after cleanup.
- Remaining `0.2.0-alpha.3` NO-GO / unpublished matches are historical task/control evidence or command text, not current release status.
- Remaining workflow-pin evidence is real but separate: `.github/workflows/cross-platform-smoke.yml` still installs `0.2.0-alpha.2`, and `docs/MAINTAINER_GUIDE.md` records this as a follow-up. This is classified as lower-priority TASK-0212 workflow pin/status cleanup, not an alpha3 release-state error.

Recommended next task:
- TASK-0210 analyzer-warning cleanup.
- Scope: `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` and `tests/AgentContextKit.Tests/WatchCommandTests.cs`.
- Expected validation: `dotnet build AgentContextKit.sln -c Release --no-restore`, `dotnet test AgentContextKit.sln -c Release --no-build`, `ackit scan --ci`, `ackit doctor`, `git diff --check`, and the Markdown completeness guard.

Out-of-scope confirmation:
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
