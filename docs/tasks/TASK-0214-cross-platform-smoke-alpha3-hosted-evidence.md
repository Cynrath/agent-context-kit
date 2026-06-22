# TASK-0214: cross-platform smoke alpha3 hosted evidence

## Purpose
Verify the push-triggered hosted GitHub Actions result for TASK-0213 after the active `cross-platform-smoke.yml` published-package pin changed to `AgentContextKit` `0.2.0-alpha.3`.

The task records whether the hosted run for exact TASK-0213 HEAD `fc002a08be83821a3b164c53256cdedab4621fc6` actually passed with the alpha3 package pin.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, `git fetch origin`, status, HEAD/origin, and recent-log checks.
- Stop before edits if `git fetch origin` fails with `.git/FETCH_HEAD` permission denied or any `.git` write error.
- Read current queue, handoff, context, TASK-0213, active workflow, release validation, GitHub Actions usage, maintainer handoff, and backlog docs before edits.
- Create and commit this TASK-0214 plan before hosted evidence/status edits.
- Use read-only `gh` commands to inspect GitHub Actions runs.
- Find the `cross-platform-smoke` push run on branch `master` for head SHA `fc002a08be83821a3b164c53256cdedab4621fc6`.
- Record run ID, URL, event, branch, head SHA, conclusion, job names, job conclusions, alpha3 install/version proof, and warnings.
- Classify the result as `PASS`, `PENDING`, or `FAIL` using the task decision rules.
- Update only evidence/status documentation needed to preserve the result.

## Out of scope
- No NuGet publish.
- No tag creation, movement, or deletion.
- No GitHub Release mutation.
- No NuGet package state mutation.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No source feature work.
- No broad documentation refactor.
- No manual workflow dispatch unless a maintainer explicitly authorizes it after no push-triggered run exists.

## Affected files
- `docs/tasks/TASK-0214-cross-platform-smoke-alpha3-hosted-evidence.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- Optionally `docs/ISSUE_BACKLOG.md` if the backlog status needs a focused hosted-evidence note.

No source, package metadata, workflow YAML, release workflow, tag, or package artifact file should change in this task.

## Data/database impact
None. The repository has no database, migrations, or runtime data store in this task scope.

## Admin impact
None. No admin UI, repository settings, release settings, package ownership, security settings, or maintainer permissions are changed.

## Permission/auth impact
Read-only GitHub CLI access is used for run inspection. Normal git commit/push is allowed after validation. No package, release, tag, workflow dispatch, owner, secret, security-setting, or recovery-state mutation is authorized.

## SEO/i18n impact
No SEO or runtime localization change. Documentation wording should remain English and preserve existing historical alpha2 references.

## Audit/security impact
Positive audit impact. The task creates durable evidence for the hosted published-package smoke result after the alpha3 pin sync. It must not dump large logs, expose secrets, or mutate release/package state.

## Logging/audit impact
The task records:
- current HEAD and `origin/master`;
- inspected hosted run ID and URL;
- event, branch, and head SHA;
- run and job conclusions;
- exact alpha3 install/version proof summarized from logs;
- warnings, if any;
- validation results;
- confirmation that no package/release/tag/workflow-dispatch mutation occurred.

## Acceptance criteria
- TASK-0214 plan is committed before evidence/status edits.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- Required docs/workflows are read before edits.
- Read-only `gh run list` identifies whether a push-triggered `cross-platform-smoke` run exists for `fc002a08be83821a3b164c53256cdedab4621fc6`.
- If a matching run exists, read-only `gh run view` and logs are inspected.
- Result is classified:
  - `PASS`: push-triggered run exists for the exact full SHA, all required jobs succeeded, and logs prove alpha3 install/version smoke.
  - `PENDING`: no run exists yet or the run is still in progress; no manual dispatch occurs without maintainer authorization.
  - `FAIL`: run exists and failed; root cause is classified without source fixes unless docs-only evidence correction is needed.
- Documentation is updated with concise evidence, not large raw log dumps.
- Validation commands are run and results are recorded.
- No publish, release, tag, NuGet, version, package metadata, package artifact, release workflow dispatch, release-candidate workflow dispatch, or manual workflow dispatch mutation occurs.
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

Hosted workflow inspection:

```powershell
$expectedSha = "fc002a08be83821a3b164c53256cdedab4621fc6"

gh run list `
  --repo Cynrath/agent-context-kit `
  --workflow cross-platform-smoke.yml `
  --limit 20 `
  --json databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName

gh run list `
  --repo Cynrath/agent-context-kit `
  --commit $expectedSha `
  --limit 20 `
  --json databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName

gh run view <RUN_ID> --repo Cynrath/agent-context-kit

gh run view <RUN_ID> `
  --repo Cynrath/agent-context-kit `
  --json databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName,jobs

gh run view <RUN_ID> --repo Cynrath/agent-context-kit --log
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
- Mistaking a manual or pull-request run for the required push-triggered `master` run.
- Recording evidence for the wrong commit SHA.
- Claiming alpha3 smoke without log/version proof.
- Dumping excessive hosted logs into documentation.
- Accidentally dispatching a workflow or mutating release/package/tag state.
- Missing a failed or pending hosted run because only workflow-filtered or only commit-filtered output was inspected.

## Rollback plan
Before push, correct documentation with normal commits. After push, use normal `git revert <sha>` for TASK-0214 documentation commits if the evidence classification was wrong.

Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, mutate GitHub Release/NuGet state, delete retained release evidence, or rewrite history as rollback.

## Completion notes
Pending hosted evidence inspection.
