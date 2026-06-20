# TASK-0211: scan finding classification

## Purpose
Classify the remaining `ackit scan --ci` Medium/Low findings after TASK-0210 without auto-redacting, deleting artifacts, hiding findings, changing scanner suppression policy, or accepting a new baseline.

The output should be a human-readable classification and next-action record that maintainers can review before deciding whether any future cleanup, ignore, suppression, or artifact policy change is appropriate.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, fetch/status, HEAD/origin, and recent-log checks.
- Stop before edits if `git fetch origin` fails with a `.git/FETCH_HEAD` permission error or any `.git` write error.
- Read current state docs, release/security policy docs, TASK-0209, and TASK-0210 before implementation evidence collection.
- Record a docs-first plan commit before collecting detailed scan JSON evidence.
- Run `ackit scan --ci` and `ackit scan --json` evidence collection.
- Use scan JSON fields where available: severity, file/path, line, rule/id, category, and sanitized message/snippet fields.
- Run targeted text searches for `.remember`, package-validation artifacts, local paths, and secret-like terms.
- Classify findings into:
  - `ACCEPTED_RETAINED_ARTIFACT`
  - `LOCAL_PATH_REFERENCE`
  - `MEMORY_LOG_REVIEW`
  - `FALSE_POSITIVE_OR_LOW_RISK`
  - `NEEDS_FOLLOW_UP`
  - `BLOCKING`
- Add a table with finding group, severity, file/path pattern, classification, rationale, and next action.
- Update `docs/ISSUE_BACKLOG.md` only if new follow-up items are needed beyond the existing scan-classification backlog item.
- Update `docs/NEXT_TASKS.md` with the recommended next task.
- Update `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, and `.codex/NEXT_STEPS.md` with current state.
- Record final evidence in this task file.

## Out of scope
- No source feature work.
- No scanner rule change.
- No `.ackit` baseline mutation.
- No ignore/suppression policy mutation unless evidence proves a purely false-positive policy update is safe; default is to plan such work as a follow-up.
- No automatic redaction.
- No broad artifact deletion.
- No package-validation artifact deletion.
- No `.remember` cleanup unless separately authorized.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No package owner, repository secret, branch protection, security setting, or recovery-state mutation.

## Affected files
- `docs/tasks/TASK-0211-scan-finding-classification.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- Optional, only if new follow-up work must be tracked:
  - `docs/ISSUE_BACKLOG.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, repository settings, package ownership, security settings, or release settings are changed.

## Audit/security impact
Positive governance impact. This task keeps all findings visible, classifies residual Medium/Low scan results, and records whether any item is release-blocking or needs follow-up without copying secret values into docs.

## Permission/auth impact
No privileged operation is required beyond normal authenticated Git fetch/push if final validation passes. No package, release, tag, workflow, owner, secret, security-setting, or recovery mutation is authorized.

## Localization impact
None expected. Documentation uses stable technical classification labels. No runtime localization resources or CLI output strings should change.

## SEO/i18n impact
None. Public package/readme status remains `0.2.0-alpha.3` published and unchanged.

## UX impact
No product UX change. The user-visible outcome is clearer maintenance guidance for scan findings.

## Logging/audit impact
Adds task evidence for local/current remote HEAD, scan command results, classification rationale, accepted retained artifacts, local-path findings, `.remember` findings, blocking status, validation results, and release-state immutability.

## Acceptance criteria
- TASK-0211 plan is committed before detailed scan evidence collection.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- `ackit scan --ci` result is recorded with exit code and finding summary.
- `ackit scan --json` is captured to a temporary artifact for evidence review, then removed before final commit unless repository policy allows tracking it.
- Findings are classified into the required categories.
- The classification table includes finding group, severity, file/path pattern, classification, rationale, and next action.
- No finding is hidden by suppression, baseline acceptance, ignore rule change, deletion, or redaction.
- No secrets are printed into docs; sensitive values, if any, are summarized only by category and file/line.
- `docs/NEXT_TASKS.md` records the recommended next task.
- `.codex` handoff files record current TASK-0211 state.
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

- Detailed scan evidence:

```powershell
ackit scan --ci
ackit scan --json > artifacts/task-0211-scan.json
ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20

rg -n "\.remember|package-validation|artifacts/package-validation|C:\\|O:\\|Users\\|/home/|local path|token|api[_-]?key|secret|password|credential" . `
  -g "*.md" -g "*.txt" -g "*.json" -g "*.yml" -g "*.yaml" -g "*.ps1" -g "*.cs" `
  -g "!bin/**" -g "!obj/**"
```

- Validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
dotnet test AgentContextKit.sln -c Release --no-build
```

## Risks
- Copying sensitive scan content into docs instead of summarizing it.
- Mistaking retained release evidence for generated junk and deleting it.
- Treating local-path examples or fixtures as automatically safe without a documented rationale.
- Mutating scanner policy or `.ackit` baseline under a classification-only task.
- Letting generated `artifacts/task-0211-scan.json` remain untracked or accidentally committed.
- Accidentally implying a new release, version, tag, package, or workflow action is authorized.

## Rollback plan
Before push, correct the docs with normal commits and remove any temporary scan artifact from `artifacts/`. After push, use normal `git revert <sha>` for TASK-0211 docs commits if the classification record is wrong. Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, mutate GitHub Release/NuGet state, or destructively clean retained evidence.

## Completion notes
