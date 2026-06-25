# TASK-0216: Docs queue simplification and stale heading cleanup

## Purpose
Simplify and clean stale queue/status headings after the completed alpha3 release, post-alpha3 maintenance chain (TASK-0209 through TASK-0214), and PR #1 / TASK-0215 NuGet README rendering infrastructure fix. Keep historical evidence intact, but make current-state docs easier to read and less misleading.

## Scope
- **docs-only**: Markdown edits to queue, handoff, status, and planning docs.
- Update `docs/NEXT_TASKS.md` to reduce stale wording, mark TASK-0215 as completed by PR #1, and point clearly at TASK-0216 as the current task.
- Update `docs/PROJECT_EXECUTION_QUEUE.md` to move completed alpha3 chain references under archive-style headings and add TASK-0215 as completed NuGet README rendering infrastructure.
- Update `docs/ISSUE_BACKLOG.md` to mark completed maintenance items clearly, separate open follow-ups, and add recommended future items after TASK-0216.
- Update `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, and `.codex/NEXT_STEPS.md` to reflect current state and point at TASK-0216.
- Update `docs/ROADMAP.md`, `docs/RELEASE_CHECKLIST.md`, `docs/MAINTAINER_DECISION_REGISTER.md`, `docs/NUGET_METADATA.md`, `docs/PACKAGING.md`, `docs/MAINTAINER_GUIDE.md` stale headings if they reference TASK-0215 as pending or misrepresent current state.

## Out of scope (absolute prohibitions)
- No source code changes.
- No test changes.
- No workflow changes.
- No release workflow dispatch or release-candidate workflow dispatch.
- No NuGet/tag/GitHub Release mutation.
- No version bump or package metadata changes.
- Do not change `README.nuget.md`.
- Do not change `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`.
- Do not change `scripts/check-package-metadata.ps1`.
- No changes to release workflows.
- No broad historical rewrite or deletion of task docs.
- TASK-0215 is referenced only as completed current state.

## Affected files
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/ISSUE_BACKLOG.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/ROADMAP.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/NUGET_METADATA.md`
- `docs/PACKAGING.md`
- `docs/MAINTAINER_GUIDE.md`

## Not affected
- `README.nuget.md` (read-only for TASK-0216)
- `README.md` (no change needed; already correct)
- `README.tr.md` (no change needed)
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` (read-only)
- `scripts/check-package-metadata.ps1` (read-only)
- `.github/workflows/` (read-only)

## Acceptance criteria
- Current docs no longer point to TASK-0213/TASK-0214/TASK-0215 as pending.
- Completed alpha3 maintenance chain is clearly readable.
- PR #1 / TASK-0215 NuGet README rendering infrastructure is represented as completed current state.
- Open follow-ups are separated from completed work.
- Historical release/task evidence remains intact.
- `0.2.0-alpha.3` remains published and unchanged.
- No external release state changes occur.
- `README.nuget.md`, `.csproj` package metadata, version fields, release workflows, tags, GitHub Releases, and NuGet package state are not changed.

## Validation commands

```powershell
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues
dotnet test AgentContextKit.sln -c Release --no-build
ackit doctor
ackit scan --ci
```

## Completion notes
TASK-0216 is a docs-only queue simplification task. It does not change any release, package, or workflow state. Visible NuGet README fixes (from TASK-0215) require a later authorized package publish.

After TASK-0216:
- TASK-0217: investigate/fix Windows test-created Unicode temp directories
- TASK-0218: prepare 0.2.0-alpha.4 NuGet README rendering release
