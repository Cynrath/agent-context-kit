# TASK-0219: Alpha4 hosted release-candidate evidence

## Purpose
Verify the exact alpha4 candidate commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde` through hosted release-candidate evidence before any authorized alpha4 publish.

## Scope
- Create TASK-0219 task doc.
- Inspect existing push-triggered CI and release-candidate runs for exact commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde`.
- Dispatch the release-candidate-evidence workflow for the exact commit if no valid hosted RC run exists.
- Record hosted RC evidence.
- Update docs/handoff/current state.

## Out of scope (absolute prohibitions)
- No NuGet publish.
- No release publish workflow dispatch (`release.yml`).
- No tag creation, movement, or deletion.
- No GitHub Release creation or mutation.
- No GitHub Release asset mutation.
- No package metadata changes.
- No version bump.
- No source feature work.
- No README public sync.
- No update to `README.md` / `README.tr.md` to claim alpha4 is published.
- No broad docs refactor.
- No deletion of release evidence artifacts.

## Affected files

### New file
- `docs/tasks/TASK-0219-alpha4-hosted-release-candidate-evidence.md` - this file

### Docs/handoff updates
- `docs/NEXT_TASKS.md`
- `docs/ISSUE_BACKLOG.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Not affected (protected)
- `README.md` - describes published alpha3; no change
- `README.tr.md` - describes published alpha3; no change
- `README.nuget.md` - package README; no change
- `AGENTS.md`, `CLAUDE.md` - historical artifacts; no change
- Source code, tests, scripts, workflows - no change
- `CHANGELOG.md` - no change
- Published alpha3 package/tag/release state - no change

## Acceptance criteria
- Task doc is created before any workflow dispatch.
- Existing push-triggered CI runs for exact commit are inspected and recorded.
- Release-candidate evidence workflow is dispatched for exact commit with correct inputs.
- Hosted RC run completes; job results are recorded.
- Decision is clearly GO / NO-GO / PENDING.
- If GO, alpha4 hosted RC evidence is recorded and TASK-0220 can be an authorized alpha4 publish task.
- `0.2.0-alpha.4` remains NOT published.
- No tag is created.
- No GitHub Release is created or mutated.
- No NuGet package state is changed.
- No release publish workflow is dispatched.
- Validation scripts pass.

## Validation commands

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
dotnet test AgentContextKit.sln -c Release --no-build
```

## Completion notes

### Initial state
- Local HEAD: `b8e8fce68f803c50f708d1566f1a38aab4b34bde`
- Origin HEAD: `b8e8fce68f803c50f708d1566f1a38aab4b34bde`
- Working tree: clean
- `0.2.0-alpha.3` remains published
- `0.2.0-alpha.4` is prepared locally, not published

### Existing runs for exact commit b8e8fce
| Run ID | Workflow | Event | Conclusion |
|--------|----------|-------|------------|
| 28208179383 | ci | push | success |
| 28208179366 | cross-platform-smoke | push | success |
| 28208179392 | cross-platform-source-smoke | push | success |

### Release-candidate workflow
- Workflow file: `.github/workflows/release-candidate-evidence.yml`
- Inputs: `commit_sha`, `candidate_version`, `predecessor_version`
- Dispatch tuple for alpha4:
  - `commit_sha`: `b8e8fce68f803c50f708d1566f1a38aab4b34bde`
  - `candidate_version`: `0.2.0-alpha.4`
  - `predecessor_version`: `0.2.0-alpha.3`

### Hosted RC evidence
(Recorded after dispatch completion)

### Decision
(Recorded after hosted RC evidence review)
