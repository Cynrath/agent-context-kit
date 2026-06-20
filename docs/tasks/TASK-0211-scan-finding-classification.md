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

## Classification results
Evidence source:

- `ackit scan --ci` exited `0` after TASK-0210.
- After the temporary `artifacts/task-0211-scan.json` evidence file was removed, the remaining scan set was `23` findings: `19` Medium, `4` Low, `0` High, `0` Critical.
- `ackit scan --json` provides `ruleId`, `severity`, `category`, `path`, `message`, and `match`; all finding `match` values are `null`.
- Suppression summary is `0`; no finding is currently hidden by `safeDomains`, `ignoredPaths`, or `ignoredFindingIds`.
- `git status --ignored` shows `.remember/logs/**`, `artifacts/package-validation/**`, and the temporary TASK-0211 scan JSON as ignored local artifacts.
- The temporary TASK-0211 scan JSON produced an extra Low local-path finding while present, and was removed before classification/final validation.

| Finding group | Severity | File/path pattern | Classification | Rationale | Next action |
| --- | --- | --- | --- | --- | --- |
| `.remember` autonomous save logs | Medium, `ACKIT003`, `BuildArtifact` | `.remember/logs/autonomous/*.log` | `MEMORY_LOG_REVIEW` | Ignored local memory/autonomous logs. The scan flags the `.log` extension for public-release review; most autonomous save files are empty in local metadata. Count-only sensitive-term search found no hits in `.remember` logs, but the non-empty memory logs are local operational artifacts and should not be silently accepted as public evidence. | Create a focused follow-up to decide whether `.remember` logs belong in the repository workspace, should remain ignored-only, or should be cleaned outside release evidence. No deletion in TASK-0211. |
| `.remember` hook/memory logs | Medium, `ACKIT003`, `BuildArtifact` | `.remember/logs/hook-errors.log`, `.remember/logs/memory-*.log` | `MEMORY_LOG_REVIEW` | Ignored local memory/hook logs. `hook-errors.log` is empty; memory logs are non-empty local agent memory artifacts. They are not reported as secrets by current scan, but they remain inappropriate to normalize without a retention policy. | Same follow-up as above; review retention/ignore/cleanup policy without exposing log content. |
| Alpha3 package-validation archives | Medium, `ACKIT003`, `BuildArtifact` | `artifacts/package-validation/0.2.0-alpha.3/*.{nupkg,snupkg}` | `ACCEPTED_RETAINED_ARTIFACT` | Ignored package archives retained as local alpha3 package-validation evidence. They match TASK-0203/TASK-0206 release evidence and should not be deleted or redacted under a classification-only task. | Keep retained locally. Revisit only if release evidence policy changes or a future cleanup task explicitly replaces this evidence. |
| CLI reference local-path example | Low, `ACKIT004`, `LocalPath` | `docs/CLI_REFERENCE.md` | `LOCAL_PATH_REFERENCE` | Safe documentation example for `ackit mcp --stdio-server --repo ...`; no credential or private host is exposed. | No blocking action. Optional future docs polish can normalize the example if maintainers want lower scan noise. |
| TASK-0203 local validation path | Low, `ACKIT004`, `LocalPath` | `docs/tasks/TASK-0203-v020-alpha3-release-preparation.md` | `LOCAL_PATH_REFERENCE` | Historical local package-validation evidence path. It documents where alpha3 package validation occurred and does not expose usable credentials. | Keep as historical evidence. Normalize only through a deliberate historical-evidence policy task. |
| TASK-0211 required search pattern | Low, `ACKIT004`, `LocalPath` | `docs/tasks/TASK-0211-scan-finding-classification.md` | `LOCAL_PATH_REFERENCE` | Self-induced by the required evidence-extraction regex that searches for Windows/user/home path patterns. It is a scanner pattern, not an actual local path value. | Accepted as low-risk task evidence. Do not suppress; revisit only if task-command examples are later normalized. |
| MCP stdio local URI fixture | Low, `ACKIT004`, `LocalPath` | `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` | `FALSE_POSITIVE_OR_LOW_RISK` | Test fixture verifies that unsafe local URI input is rejected/sanitized. The scan sees the fixture as a local-path-like value, but the test is intentionally defensive and contains no usable secret. | Keep test fixture. No suppression in TASK-0211. |

Blocking assessment:

- `BLOCKING`: none.
- Critical/High findings: none.
- `NEEDS_FOLLOW_UP`: `.remember` log retention/cleanup policy should be handled in a focused follow-up because these are ignored local memory artifacts, not release evidence.
- Accepted retained artifacts: alpha3 `.nupkg` and `.snupkg` validation archives remain local retained evidence.
- Local path references: safe examples, historical evidence, required scan pattern text, and a defensive test fixture. None expose credentials or require immediate redaction.

Recommended next task:

- TASK-0212 `.remember` log retention and local artifact policy.
- Scope: decide whether ignored `.remember` memory/autonomous logs should remain local-only, be cleaned from workspaces, or receive explicit documentation/ignore treatment; confirm package-validation artifacts remain retained evidence; do not mutate release/package/tag state.

## Completion notes
Completed as docs-only scan-finding classification.

Commits:
- Plan: `c544f4b` (`docs: plan task 0211 scan finding classification`)
- Classification: `a3abb47` (`docs: classify current scan findings`)
- Final evidence: this commit

Current HEAD/origin at final evidence collection:
- Local HEAD before this final evidence commit: `a3abb47e548a1ac4e56a7c3ea189d371eafbdf65`
- Local HEAD short before this final evidence commit: `a3abb47`
- `origin/master`: `31d9d4f1d5087f0f37d6a679936c75be14bd3984`
- `origin/master` short: `31d9d4f`
- Working tree before this final evidence edit: clean.

Required first checks:
- `ackit --help`: passed and showed the current `0.2.0-alpha.3` command set.
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `git fetch origin`: passed; no `.git/FETCH_HEAD` permission error or `.git` write error occurred.
- Initial local HEAD and `origin/master`: both `31d9d4f1d5087f0f37d6a679936c75be14bd3984`, matching the expected post-TASK-0210 state.
- `git status --porcelain=v1 --untracked-files=all 2>$null`: clean at start.
- `git status --short`: exited `0` but printed the known Windows unreadable-directory warning; raw porcelain was clean.
- `git log --oneline -n 40`: confirmed TASK-0210 final evidence at `31d9d4f`.

Scan evidence:
- `ackit scan --ci`: exited `0`.
- Final post-temp-artifact scan summary: `23` findings, `0` Critical, `0` High, `19` Medium, `4` Low.
- `ackit scan --json > artifacts/task-0211-scan.json`: passed; the file was temporary, ignored by git, created one extra Low local-path finding while present, and was removed before final classification/validation.
- `ackit scan --json | ConvertFrom-Json | ConvertTo-Json -Depth 20`: passed. JSON fields used: `ruleId`, `severity`, `category`, `path`, `message`, `match`. All `match` values were `null`; suppression count was `0`.
- Required `rg` evidence command ran. The broad search produced many expected documentation/test mentions of security terms; classification used scan JSON plus targeted metadata and did not copy secret-like snippets into docs.

Finding classification:
- `MEMORY_LOG_REVIEW`: `.remember/logs/**/*.log` Medium `ACKIT003` findings. Ignored local memory/autonomous logs; no Critical/High finding. Count-only sensitive-term search over `.remember` logs returned no matches. Needs a follow-up retention/cleanup policy decision.
- `ACCEPTED_RETAINED_ARTIFACT`: ignored alpha3 package-validation `.nupkg` and `.snupkg` Medium `ACKIT003` findings. Retained local release/package validation evidence; no deletion in TASK-0211.
- `LOCAL_PATH_REFERENCE`: Low `ACKIT004` findings in `docs/CLI_REFERENCE.md`, TASK-0203 evidence, and TASK-0211 required search-pattern text. Safe examples/historical evidence/task command text; no usable credential.
- `FALSE_POSITIVE_OR_LOW_RISK`: Low `ACKIT004` finding in `McpStdioTransportTests.cs`. Defensive local URI fixture; no usable credential.
- `NEEDS_FOLLOW_UP`: `.remember` log retention and local artifact policy.
- `BLOCKING`: none.

Accepted retained artifacts:
- `artifacts/package-validation/0.2.0-alpha.3/AgentContextKit.0.2.0-alpha.3.nupkg`
- `artifacts/package-validation/0.2.0-alpha.3/AgentContextKit.0.2.0-alpha.3.snupkg`
- Both are ignored local artifacts and remain retained release/package validation evidence.

Local path references:
- `docs/CLI_REFERENCE.md`: generic CLI example.
- `docs/tasks/TASK-0203-v020-alpha3-release-preparation.md`: historical local validation path evidence.
- `docs/tasks/TASK-0211-scan-finding-classification.md`: required search-pattern text, not an actual path disclosure.
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`: defensive local URI fixture.

Memory log findings:
- `17` ignored `.remember/logs/**/*.log` files are reported as Medium `ACKIT003`.
- `hook-errors.log` and autonomous save logs are empty in local metadata except the two memory logs, which are non-empty local memory artifacts.
- No deletion, redaction, suppression, or baseline acceptance occurred.

Recommended next task:
- TASK-0212 `.remember` log retention and local artifact policy.
- Keep workflow pin/status cleanup and docs/queue simplification as lower-priority follow-ups.

Validation results:
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `ackit doctor`: passed all checks.
- `ackit scan --ci`: exited `0`; remaining findings are classified Medium/Low only.
- `git diff --check`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed; working tree was clean after the classification commit.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.

Out-of-scope confirmation:
- No source feature work.
- No `.ackit` baseline mutation.
- No suppression or ignore-rule mutation.
- No automatic redaction.
- No package-validation artifact deletion.
- No `.remember` cleanup.
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No owner/account/secret/security-setting/recovery mutation.
