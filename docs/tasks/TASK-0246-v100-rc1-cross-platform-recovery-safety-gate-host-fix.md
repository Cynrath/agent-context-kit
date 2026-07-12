# TASK-0246: V100 RC1 cross-platform recovery safety gate host fix

## Purpose

Fix the Windows-only child PowerShell invocation that stopped TASK-0244 before mutation, prove that the recovery safety suite runs through PowerShell 7 (`pwsh`) on Windows, Ubuntu, and macOS, preserve fail-closed ordering before every remote mutation, and improve the English, Turkish, and NuGet README sources without changing the current incomplete RC1 release status.

## Verified starting state

- Clean synchronized `master` at `111558b411e62c70e1c31f1cd33d1db75e5f535b` before task creation.
- Installed ACKit `1.0.0-rc.1`; `ackit doctor` reports 13/13 PASS and `ackit scan --ci` exits 0.
- TASK-0244 recovery run `29151228607` consumed its authorization and failed in `Run exact recovery safety gates` because `scripts/test-supply-chain-workflow.ps1` invokes `powershell` on Ubuntu.
- TASK-0244 performed no tag, release, asset, attestation, package, or other remote mutation.
- NuGet `AgentContextKit 1.0.0-rc.1` remains immutable and installable; `v0.2.0-alpha.4` remains the latest complete release until recovery succeeds.

## Dependencies

- Preserved TASK-0242 and TASK-0244 partial-failure evidence.
- Existing TASK-0243 exact-existing-package recovery implementation and its static/fixture gates.
- Current GitHub Actions documentation confirming `pwsh` as the cross-platform PowerShell shell on GitHub-hosted runners.
- Explicit user authorization for TASK-0246 through TASK-0248 and exactly one new recovery dispatch after green standard CI.

## Scope

- Replace the child `powershell` executable call in `scripts/test-supply-chain-workflow.ps1` with a fail-fast resolved `pwsh` executable.
- Add regression checks that reject a return to Windows PowerShell and prove positive/negative safety-gate behavior under PowerShell 7.
- Verify that package/source/hash/signature/state gates still precede tag creation, release creation, asset attachment, and both attestation steps.
- Exercise the exact scripts in the Windows local environment and in standard hosted Windows, Ubuntu, and macOS jobs.
- Improve `README.md`, `README.tr.md`, and `README.nuget.md` for completeness, readability, language parity, navigation, installation, safety, and command discovery while retaining truthful pre-recovery status.
- Keep `README.nuget.md` pure Markdown with no raw HTML, CSS, GitHub-only layout markup, relative local images, or generated artifacts.
- Update planning, validation, recovery, and handoff documentation for the new authorized chain.
- Commit and push TASK-0246 changes normally, then wait for each standard push-triggered workflow exactly once.

## Implementation steps

1. Resolve `pwsh` once in the supply-chain test script and use that exact executable for child gate invocations.
2. Extend static regression coverage for the cross-platform host and mutation-order invariants.
3. Polish all three README sources without prematurely changing the published release/install pin.
4. Run focused recovery/supply-chain tests, full local gates, ACKit checks, Markdown/hygiene checks, and .NET build/tests.
5. Commit, protect against remote advance, push normally, discover the three standard runs once, and watch each run once with `gh run watch --exit-status --interval 30`.

## Out of scope

- Dispatching `release.yml` or any recovery workflow in TASK-0246.
- Publishing, replacing, deleting, deprecating, or unlisting a NuGet package.
- Creating, moving, force-updating, deleting, or recreating a tag or GitHub Release.
- Manually uploading package assets, creating attestations manually, changing GitHub settings, or changing collaborators/secrets/environments.
- Updating the published-package smoke pin to RC1 before TASK-0247 fully succeeds.
- Rewriting TASK-0242/TASK-0244 history or claiming 1.0 GA readiness.

## Affected files

- `scripts/test-supply-chain-workflow.ps1`
- `scripts/check-release-workflow.ps1`
- `.github/workflows/release.yml` only if a testable ordering clarification is required; no publication semantics change
- `README.md`
- `README.tr.md`
- `README.nuget.md`
- `docs/RELEASE_AUTOMATION.md`, `docs/PACKAGE_RECOVERY.md`, and `docs/RELEASE_VALIDATION.md`
- Active roadmap, queue, task, and `.codex` handoff records

## Data/database impact

None. There is no application database, schema, migration, or persistent business data change.

## Admin impact

None. No product admin surface or repository administration setting changes.

## Security impact

High supply-chain integrity relevance. The fix must change only the PowerShell host selection; it must not weaken exact artifact, hash, signature, release-commit, absent-state, asset, or attestation checks. Tests must fail if a remote mutation can occur before the safety gates.

## Permission/auth impact

No new permission. TASK-0246 uses local validation and one normal authorized `master` push. It does not use OIDC, NuGet credentials, release write permissions, settings permissions, or manual tokens.

## Localization impact

English/Turkish README parity is improved. No CLI localization keys or JSON contract change.

## SEO impact

GitHub README headings, summaries, and link structure are improved for human and search discovery. The NuGet README remains renderer-safe pure Markdown. No runtime SEO subsystem exists.

## UX impact

Maintainers receive a cross-platform safety suite that fails with an actionable missing-`pwsh` error. Users receive clearer English, Turkish, and NuGet landing pages with consistent quick-start, command, privacy, and support guidance.

## Logging/audit impact

Record the fixed host behavior, exact local test outputs, commit/push, and one-time hosted workflow run IDs/results. Do not log credentials or alter prior failure evidence.

## Acceptance criteria

- `scripts/test-supply-chain-workflow.ps1` invokes child PowerShell only through `pwsh`, not `powershell`.
- Missing `pwsh` fails immediately and clearly.
- Positive recovery workflow validation and all existing negative mutation/supply-chain fixtures still pass.
- Static tests prove recovery safety gates precede every tag, release, release-asset, and attestation mutation.
- The relevant script suite runs successfully on Windows locally and in hosted Windows, Ubuntu, and macOS standard workflows.
- All three README files are complete, consistent, polished, and truthful about the partial RC1 state.
- `README.nuget.md` contains no raw HTML/CSS, relative local image, or GitHub-only layout dependency.
- ACKit, focused scripts, build/tests, release/security/V100 gates, Markdown checks, and repository hygiene pass.
- TASK-0246 is committed and pushed normally; its standard CI runs are each discovered once and watched once.
- No release/recovery dispatch or remote release mutation occurs in TASK-0246.

## Test steps

1. `pwsh -NoProfile -File scripts/test-supply-chain-workflow.ps1`
2. `pwsh -NoProfile -File scripts/check-release-workflow.ps1 -FailOnIssues`
3. `pwsh -NoProfile -File scripts/test-existing-package-recovery.ps1`
4. `pwsh -NoProfile -File scripts/test-release-recovery.ps1`
5. Relevant README/package metadata/Markdown and recovery documentation gates.
6. `dotnet restore AgentContextKit.sln`
7. `dotnet build AgentContextKit.sln -c Release --no-restore`
8. `dotnet test AgentContextKit.sln -c Release --no-build`
9. `ackit doctor` and `ackit scan --ci` before final commit.
10. `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`, `git diff --check`, and `git ls-files .ackit`.
11. One normal push followed by one discovery and one blocking watch per standard workflow run.

## Risks

- Resolving the wrong executable could hide portability failure; explicit `Get-Command pwsh -ErrorAction Stop` and hosted three-OS execution mitigate it.
- Broad README edits could overstate RC1 completion; current status and install pin remain alpha4 until TASK-0247 success.
- A static ordering test can miss shell semantics; positive/negative fixture execution and workflow source-order assertions are both required.
- A standard CI failure blocks TASK-0247 dispatch; no recovery dispatch occurs until every required run is green.

## Rollback plan

Before push, restore only TASK-0246 edits through a normal successor patch. After push, correct with a normal commit; do not rewrite history. No remote release artifact exists from this task, so no package/tag/release rollback is needed.

## Completion notes

Status: `PLANNED / IN PROGRESS`.

