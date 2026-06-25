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

## Evidence

### Current state
- Local HEAD: `f447b3d` (after plan commit `b2ae186` and implementation commit `f447b3d`)
- Origin HEAD: `82736cd` (no push performed)
- Working tree: clean after plan and implementation commits; TASK-0216 evidence added pending

### Files changed (implementation commit `f447b3d`)
- `.codex/CONTEXT_PACK.md` - current task updated to TASK-0216
- `.codex/NEXT_STEPS.md` - added TASK-0215 completion + TASK-0216 current
- `.codex/SESSION_HANDOFF.md` - current task updated with TASK-0215 done, TASK-0216 current
- `docs/ISSUE_BACKLOG.md` - item 14 marked completed; items 15-16 added
- `docs/MAINTAINER_GUIDE.md` - stale TASK-0213 reference updated
- `docs/NEXT_TASKS.md` - top summary + post-alpha3 + next task updated
- `docs/PROJECT_EXECUTION_QUEUE.md` - alpha.3 status + M8 row updated
- `docs/ROADMAP.md` - stale post-alpha3 maintenance text updated

### Files created (plan commit `b2ae186`)
- `docs/tasks/TASK-0216-docs-queue-simplification-and-stale-heading-cleanup.md` - this file

### Stale heading cleanup summary
- **NEXT_TASKS.md**: Top summary now mentions TASK-0215 (PR #1) as completed and TASK-0216 as current; post-alpha3 section updated; "unpublished" alpha.3 reference fixed; bottom "Next Task" section updated
- **PROJECT_EXECUTION_QUEUE.md**: TASK-0215 added as completed under Alpha.3 Status; M8 row updated from NO-GO to Published
- **ISSUE_BACKLOG.md**: Item 14 marked completed as TASK-0216; items 15-16 added for future TASK-0217/TASK-0218
- **.codex/SESSION_HANDOFF.md**: Current Task section updated with TASK-0215/PR #1 done and TASK-0216 active; TASK-0214 entry updated
- **.codex/CONTEXT_PACK.md**: Current Independent Task section updated to reference TASK-0215 done and TASK-0216 current
- **.codex/NEXT_STEPS.md**: TASK-0215 entry added; NEXT STEPS updated
- **ROADMAP.md**: Post-alpha3 maintenance text updated to reflect completed chain and current TASK-0216
- **MAINTAINER_GUIDE.md**: Stale "Observe next push-triggered cross-platform-smoke run after TASK-0213" reference removed

### TASK-0215/PR #1 current-state summary
- NuGet README rendering infrastructure is completed (new `README.nuget.md`, `PackageReadmeFile` wiring, agent docs, package metadata validation)
- No NuGet publish, tag mutation, GitHub Release mutation, or release workflow dispatch occurred in TASK-0215
- Visible nuget.org README changes require a later authorized package publish

### Current next-state summary
- Current task: TASK-0216 (this task)
- No immediate release task is active
- Maintainer-gated release/security track items are documented separately

### Preserved historical evidence
- All completed task docs (TASK-0206 through TASK-0215) remain intact
- Historical release evidence (alpha2, alpha3 publish records) remain unchanged
- Maintainer decision register remains unchanged
- RELEASE_CHECKLIST.md remains unchanged

### Validation results
| Check | Result |
|---|---|
| `git diff --check` | CRLF warnings only (normal on Windows) |
| `ackit --version` | `AgentContextKit 0.2.0-alpha.3` |
| `ackit doctor` | 13/13 PASS |
| `ackit scan --ci` | exit 0, Medium/Low findings only |
| `dotnet test -c Release --no-build` | 428/428 PASS |
| `check-tracked-vs-untracked-md.ps1` | Clean (only new task file was untracked) |
| `check-local-markdown-links.ps1 -FailOnIssues` | Clean, no broken targets |
| Windows Unicode temp dir guard | Cleaned 1 temp dir; no source impact |

### Protected file verification
- `README.nuget.md`: NOT modified (confirmed by `git diff --name-only`)
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`: NOT modified
- `scripts/check-package-metadata.ps1`: NOT modified
- `.github/workflows/`: NOT modified
- `README.md`: NOT modified

### Release status (unchanged)
- `AgentContextKit 0.2.0-alpha.3` is published and verified
- `v0.2.0-alpha.3` tag and GitHub prerelease target `92984c6448332aa24b7cff94647f627bf944e535`
- No version/tag/GitHub Release/NuGet/workflow dispatch mutation occurred in TASK-0216

### Recommended next task
- TASK-0217: investigate/fix Windows test-created Unicode temp directories
- TASK-0218: prepare 0.2.0-alpha.4 NuGet README rendering release
