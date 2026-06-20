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

## Policy decision
Evidence collected before this policy decision:

- Plan commit: `e30c32f` (`docs: plan task 0212 remember log retention`).
- Local HEAD and `origin/master` matched the expected TASK-0211 HEAD before plan creation: `73e5baa14c22bebc1d92494536c807064110212e`.
- `.ackit/config.yml`: not present in the current workspace, so no project config suppression exists to review or mutate.
- `.remember` storage state:
  - tracked files: none under `.remember`.
  - ignored/untracked files: `23` files, `469892` bytes total.
  - ignored log files: `17` files, `467589` bytes total.
  - ignore source: `.remember/.gitignore` ignores `.remember` contents; `.remember/logs/**/*.log` is ignored.
  - release evidence: no.
  - reproducibility requirement: no project or release reproducibility dependency identified.
- Package-validation artifact state:
  - tracked files: none under `artifacts/package-validation`.
  - ignored/untracked files: `2` files, `273609` bytes total.
  - ignore source: root `.gitignore` ignores `artifacts/`.
  - files: alpha3 `.nupkg` and `.snupkg` package-validation archives.
  - release evidence: yes, retained local package-validation evidence for `0.2.0-alpha.3`.
- `ackit scan --ci` before local cleanup exited `0` with `24` findings: `0` Critical, `0` High, `19` Medium, `5` Low.
- `ackit scan --json` had `suppressionSummary.total = 0`; finding `match` values were `null`.

Decisions:

| Area | Decision | Rationale | Action |
| --- | --- | --- | --- |
| `REMEMBER_LOGS` | Local-only ignored runtime/memory logs. They may be cleaned from local workspaces after summarizing count/size when ignored/untracked and not needed as evidence. | They are not tracked, not release evidence, not needed for reproducibility, and current scan noise comes from their `.log` extension rather than a secret match. | Perform scoped local cleanup of `.remember/logs/**/*.log` after this policy commit; do not commit deleted ignored files; re-run scan and record impact. |
| `PACKAGE_VALIDATION_ARTIFACTS` | Retained local release/package-validation evidence for alpha3. | They are ignored/untracked artifacts, but they support TASK-0203/TASK-0206 alpha3 validation history. Generic cleanup must not delete them. | Keep locally retained. Do not suppress, delete, mutate release assets, or change package state. |
| `LOCAL_PATH_REFERENCES` | Safe current examples, historical evidence, required task command text, and defensive test fixture. | No usable credential was identified; the TASK-0212 Low finding is self-induced by required command text. | No immediate normalization. Revisit only through a deliberate docs-polish or scan-scope policy task. |

Scan-scope decision:

- Do not modify `.ackit/config.yml`, `.gitignore`, baseline, or suppression settings in TASK-0212.
- Prefer local cleanup for disposable ignored `.remember` logs and documentation for retained package evidence.
- If maintainers later want retained local release artifacts excluded from self-scan output, create a separate policy task that proves the exclusion cannot hide secrets or public-release blockers.

## Completion notes
Completed as docs/policy plus scoped local cleanup.

Commits:

- Plan: `e30c32f` (`docs: plan task 0212 remember log retention`)
- Policy: `13b7266` (`docs: define remember log retention policy`)
- Final evidence: this commit

Current HEAD/origin at final evidence collection:

- Local HEAD before this final evidence commit: `13b72662956442456a54cf11a99310d75c937dda`
- Local HEAD short before this final evidence commit: `13b7266`
- `origin/master`: `73e5baa14c22bebc1d92494536c807064110212e`
- `origin/master` short: `73e5baa`

Required first checks:

- `ackit --help`: passed and showed the current `0.2.0-alpha.3` command set.
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `git fetch origin`: passed; no `.git/FETCH_HEAD` permission error or `.git` write error occurred.
- Initial local HEAD and `origin/master`: both `73e5baa14c22bebc1d92494536c807064110212e`, matching the expected TASK-0211 state.
- `git status --porcelain=v1 --untracked-files=all 2>$null`: clean at start.
- `git status --short`: exited `0` but printed the known Windows unreadable-directory warning; raw porcelain was clean.
- `git log --oneline -n 40`: confirmed TASK-0211 final evidence at `73e5baa`.

Read/inspection notes:

- Required docs and state files were read before edits.
- `.ackit/config.yml` was requested but is not present in this workspace.
- Project structure remains .NET 10 CLI/tool: `src/AgentContextKit.Cli`, `src/AgentContextKit.Core`, and `tests/AgentContextKit.Tests`.
- Runtime projects have no external runtime package references; test dependencies are `coverlet.collector`, `Microsoft.NET.Test.Sdk`, `xunit.v3`, `xunit.runner.visualstudio`, and `YamlDotNet`.

Storage state for `.remember` logs:

- Tracked files under `.remember`: none.
- Ignored/untracked state: yes.
- Ignore source for logs: `.remember/.gitignore`.
- Pre-cleanup `.remember` file metadata: `23` ignored/untracked files, `469892` bytes total.
- Pre-cleanup `.remember/logs/**/*.log`: `17` files, `467589` bytes total.
- Release evidence: no.
- Needed for reproducibility: no.
- Safe to keep locally: yes, but not useful as release evidence and not appropriate to paste into docs.
- Cleanup performed: yes. Removed `17` ignored/untracked `.remember/logs/**/*.log` files totaling `467589` bytes.
- Post-cleanup `.remember/logs/**/*.log`: `0` files, `0` bytes.
- Raw `.remember` log contents were not pasted into docs.

Storage state for package-validation artifacts:

- Tracked files under `artifacts/package-validation`: none.
- Ignored/untracked state: yes.
- Ignore source: root `.gitignore` `artifacts/` rule.
- Retained files: alpha3 `.nupkg` and `.snupkg`.
- Total retained local artifact size: `273609` bytes.
- Release evidence: yes, local package-validation evidence for `0.2.0-alpha.3`.
- Cleanup performed: no. These artifacts remain retained.
- Public release/package/tag state mutation: none.

Scan evidence:

- Pre-cleanup `ackit scan --ci`: exit `0`; `24` findings, `0` Critical, `0` High, `19` Medium, `5` Low.
- Pre-cleanup `ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20`: passed; `suppressionSummary.total = 0`; finding `match` values were `null`.
- Required `rg` evidence command ran. It produced expected documentation/test mentions of `.remember`, package artifacts, local-path patterns, and security terms; no raw `.remember` log content was copied into docs.
- Post-cleanup `ackit scan --ci`: exit `0`; `7` findings, `0` Critical, `0` High, `2` Medium, `5` Low.
- Post-cleanup `ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20`: passed; `riskSummary.total = 7`; `suppressionSummary.total = 0`.
- Impact: cleanup removed all `.remember` log `ACKIT003` findings. Remaining Medium findings are retained package-validation artifacts.

Policy decisions:

- `REMEMBER_LOGS`: local-only ignored runtime/memory logs. They may be locally cleaned after count/size review when ignored/untracked and not needed for evidence. TASK-0212 performed that cleanup.
- `PACKAGE_VALIDATION_ARTIFACTS`: retained local alpha3 release/package-validation evidence. Do not delete through generic cleanup and do not mutate release assets/package state.
- `LOCAL_PATH_REFERENCES`: safe examples, historical evidence, required task command text, and defensive test fixture. No immediate normalization.
- Scan-scope suppression/exclusion: not changed. A separate deliberate policy task is required before excluding retained local release evidence from scans.

Recommended next task:

- TASK-0213 published-package workflow pin/status sync.
- Lower-priority optional follow-up: review scan-scope policy for retained local artifacts only if maintainers want a deliberate exclusion/suppression policy.

Validation results:

- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `ackit doctor`: passed all checks.
- `ackit scan --ci`: exited `0`; remaining findings are `2` Medium retained package artifacts and `5` Low local-path references.
- `git diff --check`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed; no untracked or staged entries.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.

Out-of-scope confirmation:

- No source feature work.
- No package metadata change.
- No version bump.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No package-validation artifact deletion.
- No automatic redaction.
- No `.ackit` baseline mutation.
- No suppression, `.ackit/config.yml`, or `.gitignore` mutation.
- No owner/account/secret/security-setting/recovery mutation.
