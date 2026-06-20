# TASK-0212: remember log retention and local artifact policy

## Purpose
Decide and document the retention policy for ignored `.remember` memory/autonomous logs and local release/package-validation artifacts after TASK-0211 classified the current `ackit scan --ci` findings.

The task should reduce recurring scan noise only when the decision is safe, policy-backed, and does not hide real secrets or delete release evidence.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, `git fetch origin`, status, HEAD/origin, and recent-log checks.
- Stop before edits if `git fetch origin` fails with `.git/FETCH_HEAD` permission denied or any `.git` write error.
- Read current state docs, TASK-0211, issue backlog, security model, suppression audit, supply-chain/release docs, `.gitignore`, and `.ackit/config.yml` if present before implementation edits.
- Inspect ignored/tracked/local storage state for `.remember` and `artifacts/package-validation/0.2.0-alpha.3` without printing raw `.remember` log contents.
- Create this TASK-0212 plan and commit it before detailed implementation/evidence updates.
- Run scan and search evidence after the plan commit:
  - `ackit scan --ci`
  - `ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20`
  - targeted `rg` search for `.remember`, package-validation artifacts, local-path terms, and secret-like terms.
- Classify:
  - `REMEMBER_LOGS`
  - `PACKAGE_VALIDATION_ARTIFACTS`
  - `LOCAL_PATH_REFERENCES`
- Prefer documentation and explicit local cleanup guidance over broad suppression.
- Update task/state docs with the final policy, evidence, validation, and next recommended task.
- Perform local-only cleanup only if evidence proves the target files are ignored/untracked, not release evidence, and safe to remove from the workspace.

## Out of scope
- No source feature work.
- No package metadata change.
- No version bump.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No broad artifact deletion.
- No package-validation artifact deletion unless a documented policy explicitly marks the files disposable.
- No automatic redaction.
- No `.ackit` baseline mutation.
- No suppression or scan-scope mutation unless this task proves the change is policy-correct and does not hide secrets.
- No `.gitignore` change unless current ignore policy is proven incomplete.

## Affected files
- `docs/tasks/TASK-0212-remember-log-retention-and-local-artifact-policy.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/ISSUE_BACKLOG.md`
- Optional, only if the policy belongs there:
  - `docs/SUPPRESSION_AUDIT.md`
  - `docs/SECURITY_MODEL.md`
  - `docs/RELEASE_VALIDATION.md`
  - `docs/MAINTAINER_RELEASE_HANDOFF.md`
- Optional only if evidence proves policy gaps:
  - `.gitignore`
  - `.ackit/config.yml`

## Data/database impact
None. The repository has no database, migrations, or runtime data store in this task scope.

## Admin impact
None. No admin UI, repository settings, release settings, package ownership, security settings, or maintainer permissions are changed.

## Security/audit impact
Positive governance impact. The task documents whether local memory logs may be cleaned and whether alpha3 package-validation artifacts remain retained evidence, while avoiding raw log disclosure, blind deletion, broad suppression, or baseline acceptance.

## Permission/auth impact
Normal git fetch/commit/push only after validation. No package, release, tag, workflow, owner, secret, security-setting, or recovery-state mutation is authorized.

## Localization impact
None expected. Documentation uses stable technical labels and no runtime localization resources should change.

## SEO/i18n impact
None. Public release/install messaging remains `0.2.0-alpha.3` and unchanged.

## UX impact
No product UX change. Maintainer UX improves through explicit local retention and cleanup guidance.

## Logging/audit impact
Adds a durable task evidence record for:
- current HEAD/origin;
- storage state for `.remember` logs;
- storage state for package-validation artifacts;
- scan result before/after any local-only cleanup;
- retained-artifact rationale;
- policy decisions;
- validation results;
- confirmation that no release/package/tag/workflow mutation occurred.

## Acceptance criteria
- TASK-0212 plan is committed before implementation/evidence updates.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- `.ackit/config.yml` presence or absence is recorded.
- `.remember` state is recorded without raw log contents: tracked/untracked/ignored, count, size, category, and whether cleanup was performed.
- Package-validation artifact state is recorded: tracked/untracked/ignored, count, size, release-evidence rationale, and retention decision.
- Local-path references are classified as safe examples, historical evidence, test fixtures, or follow-up work.
- `.remember` policy is explicit: local-only ignored runtime/memory logs may be cleaned from local workspaces after count/size summary if they are ignored/untracked and not required as evidence.
- Package-validation policy is explicit: alpha3 package-validation artifacts remain retained local release evidence unless a maintainer explicitly changes release-evidence retention policy.
- No secrets, tokens, private URLs, local personal paths, or raw `.remember` snippets are pasted into docs.
- No tracked files are deleted.
- No release/package/tag/GitHub Release/NuGet/workflow mutation occurs.
- No suppression, baseline, `.ackit/config.yml`, or `.gitignore` mutation occurs unless the task evidence explicitly proves the change is narrow, policy-correct, and safe.
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

Pre-edit local artifact inspection:

```powershell
git check-ignore -v .remember/logs/**/*.log 2>$null
git check-ignore -v artifacts/package-validation/0.2.0-alpha.3/* 2>$null
git status --ignored --short .remember artifacts/package-validation
Get-ChildItem -Recurse -Force .remember -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime
Get-ChildItem -Recurse -Force artifacts/package-validation/0.2.0-alpha.3 -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime
```

Implementation evidence:

```powershell
ackit scan --ci
ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20
rg -n "\.remember|package-validation|artifacts/package-validation|C:\\|O:\\|Users\\|/home/|local path|token|api[_-]?key|secret|password|credential" . `
  -g "*.md" -g "*.txt" -g "*.json" -g "*.yml" -g "*.yaml" -g "*.ps1" -g "*.cs" `
  -g "!bin/**" -g "!obj/**"
```

Validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
dotnet test AgentContextKit.sln -c Release --no-build
```

## Risks
- Accidentally copying raw `.remember` memory log contents into docs.
- Hiding real secrets by broad scan exclusion, suppression, or baseline acceptance.
- Deleting retained package-validation evidence needed for alpha3 release/package validation history.
- Treating all ignored artifacts as disposable without checking tracked state and evidence role.
- Introducing new scan noise through required command text and local-path examples.
- Mutating release/package/tag/workflow state outside the task scope.

## Rollback plan
Before push, correct documentation with normal commits and restore any incorrectly removed local ignored files from local backup only if available. After push, use normal `git revert <sha>` for TASK-0212 documentation commits if the policy record is wrong.

Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, mutate GitHub Release/NuGet state, or destructively clean retained release evidence as rollback.

## Completion notes
Pending.
