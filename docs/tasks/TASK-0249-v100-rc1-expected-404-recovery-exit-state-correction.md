# TASK-0249: V100 RC1 expected-404 recovery exit-state correction and regression coverage

## Purpose

Correct the `recover-existing` workflow defect that accepts an absent GitHub Release HTTP 404 but leaves the native `gh` exit code at `1`, causing GitHub Actions to fail an otherwise valid pre-mutation step. Add fail-closed, cross-platform regression coverage before any new recovery dispatch.

## Verified starting state

- Local `master`, `origin/master`, and `HEAD` are synchronized at `5d2cece457240e7fe3a99275c5afa757acbb4bab`; the working tree was clean before task creation.
- Installed ACKit is `1.0.0-rc.1`; `ackit doctor` passed 13/13 and `ackit scan --ci` exited `0`.
- TASK-0242 published immutable NuGet `AgentContextKit 1.0.0-rc.1` from `258918b33c3d1359aac967604ee524e8b66ddf02`; it did not create the tag, GitHub prerelease, assets, or attestations.
- TASK-0244 run `29151228607` and TASK-0247 run `29182188201` stopped before mutation. Their failure histories remain immutable.
- TASK-0247 proved the expected release absence via HTTP 404, but the accepted native exit code leaked to the end of the `pwsh` step. GitHub Actions documents that its `pwsh` wrapper appends a `$LASTEXITCODE` check, so the lingering `1` failed the step.

## Dependencies

- Existing exact-package recovery implementation from TASK-0243 and cross-platform safety-gate correction from TASK-0246.
- Prepared release body `docs/RELEASE_BODY_V100_RC1.md` and immutable TASK-0242 evidence.
- Green local validation and green push-triggered `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` before TASK-0250.

## Scope

- Implement one shared fail-closed PowerShell release-absence probe used by both the initial validation and the remote-state recheck.
- Accept only a verified HTTP 404, reject HTTP 200, 401, 403, 429, 5xx, network/unknown, malformed, and authentication failures, and explicitly clear the accepted native failure state.
- Prove subsequent code executes after an accepted 404 and that both workflow call sites use identical safe behavior.
- Preserve all safety/absence checks before tag creation, tag push, prerelease creation, asset upload, and attestation.
- Run the regression under `pwsh` in the existing Windows/Ubuntu/macOS source-smoke matrix.

## Out of scope

- Any workflow dispatch, NuGet login/push/change/unlist/replace/delete, tag/release/asset/attestation mutation, manual upload, or smoke-pin change.
- Retrying or rewriting TASK-0242, TASK-0244, or TASK-0247.
- Blanket `exit 0`, suppression of non-404 failures, repository settings changes, force push, history rewrite, or 1.0 GA readiness claims.

## Affected files

- `.github/workflows/release.yml`
- `scripts/github-release-state.ps1`
- `scripts/test-github-release-state.ps1`
- `scripts/test-supply-chain-workflow.ps1`
- `scripts/check-release-workflow.ps1`
- `scripts/test-existing-package-recovery.ps1` if fixture integration requires it
- This task and current roadmap/queue/handoff documents

## Data/database impact

None.

## Admin impact

None. No product admin surface or hosted repository setting changes.

## Security impact

High supply-chain significance. The helper must fail closed unless absence is proven by a recognized HTTP 404, must not hide later failures, and must execute before every remote mutation.

## Permission/auth impact

No permission changes. The recovery job retains its existing GitHub Actions permissions and receives no NuGet credential, package-write path, environment change, or settings authority.

## SEO/i18n impact

No SEO impact. Technical source, tests, and evidence remain in English; public English/Turkish state is updated only after complete recovery success in TASK-0251.

## UX impact

Maintainers receive a deterministic pre-mutation outcome: proven absence proceeds, while ambiguous or unauthorized API responses stop with an actionable error.

## Logging/audit impact

Tests record classifications, not credentials or response bodies containing sensitive data. TASK-0247's original evidence remains unchanged and TASK-0249 records the correction separately.

## Exact implementation steps

1. Extract the release-absence check into a shared PowerShell helper with an injectable probe for offline fixtures.
2. Capture `gh api --include` output and native exit code without converting every native stderr record into a terminating error.
3. Reject exit `0` as an existing release; accept only recognized 404 response patterns; throw on every other result; set the accepted native exit state to `0`.
4. Replace both inline workflow probes with the helper call.
5. Add offline positive/negative fixtures for 404, 200, 401, 403, 429, 500, and network/unknown cases, including a subsequent-code marker and `$LASTEXITCODE` assertion.
6. Extend static workflow checks for shared-helper use, call count, mutation ordering, and forbidden NuGet/publication operations.
7. Run focused and full local validation, update evidence, commit, push, and wait for all three standard workflows.

## Acceptance criteria

- Expected HTTP 404 is accepted, returns success, clears `$LASTEXITCODE`, and permits subsequent code.
- HTTP 200, 401, 403, 429, 500, malformed, and network/unknown cases fail closed before mutation.
- Initial validation and `Recheck exact remote recovery state` call the same helper.
- All recovery safety and absence gates precede tag creation/push, release creation, asset handling, and attestation.
- Recovery contains no `NuGet/login`, `dotnet nuget push`, normal publish operation, package mutation, manual asset upload, or force behavior.
- The focused fixture runs through `pwsh` on Windows, Ubuntu, and macOS in `cross-platform-source-smoke`.
- Release build is clean, all tests pass, ACKit gates pass, Markdown links pass, and no `.ackit/` path is tracked.

## Validation commands

```powershell
pwsh -NoProfile -File scripts/test-github-release-state.ps1
pwsh -NoProfile -File scripts/test-supply-chain-workflow.ps1
pwsh -NoProfile -File scripts/test-existing-package-recovery.ps1
pwsh -NoProfile -File scripts/check-release-workflow.ps1 -FailOnIssues
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
ackit doctor
ackit scan --ci
pwsh -NoProfile -File scripts/check-v100-readiness.ps1 -FailOnIssues
pwsh -NoProfile -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
pwsh -NoProfile -File scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues
pwsh -NoProfile -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
pwsh -NoProfile -File scripts/check-local-markdown-links.ps1 -FailOnIssues
git diff --check
git ls-files .ackit
```

Run the established Unicode temporary-path guard as part of full validation.

## Risks

- Over-broad 404 matching could accept an unrelated failure; tests require explicit HTTP-status forms and reject unknown output.
- A helper that clears state too broadly could hide later failures; state is reset only after the verified 404 branch returns successfully.
- Static-only coverage could miss hosted shell behavior; the same test is required in the three-OS source-smoke matrix.

## Rollback/safe-stop behavior

Before dispatch, correct failures with normal successor commits and rerun local tests. No remote release state is mutated by TASK-0249. Do not dispatch TASK-0250 unless all required hosted CI passes.

## Completion evidence

Status: `COMPLETED LOCALLY / AWAITING PUSHED STANDARD CI`.

Planning started from clean synchronized HEAD `5d2cece457240e7fe3a99275c5afa757acbb4bab`; task-first plan commit `35600b6` was created before implementation.

Implementation evidence:

- `scripts/github-release-state.ps1` now owns the shared release-absence classification. It captures output/exit code, accepts only a recognized HTTP 404, rejects an existing release and all ambiguous/non-404 failures, and clears `$global:LASTEXITCODE` only on the accepted branch.
- Both initial exact-package validation and `Recheck exact remote recovery state` dot-source and call that helper before tag/release mutation.
- `scripts/test-github-release-state.ps1` proves 404 success, subsequent execution, process/native success, and fail-closed 200/401/403/429/500/network behavior.
- `scripts/test-supply-chain-workflow.ps1` resolves `pwsh` and executes the new fixtures; the existing three-OS source-smoke matrix runs that script on Windows, Ubuntu, and macOS.
- Static gates require exactly two shared-helper call sites, reject inline bypass, keep both calls before tag creation/push/release/attestation, and continue rejecting NuGet login/push, normal publish markers, manual upload/edit, and force behavior.

Validation evidence on 2026-07-14:

- focused expected-404, supply-chain, exact-package recovery, and release-workflow checks passed;
- full restore/build passed with 0 warnings and 0 errors;
- full tests passed 431/431;
- ACKit doctor passed 13/13 and scan exited 0 with only pre-existing classified Medium/Low findings;
- V100 readiness, documentation/release, security/supply-chain, published-status, release-workflow, and local Markdown gates passed;
- Unicode temporary-path guard passed and `git ls-files .ackit` returned no tracked path;
- no workflow dispatch, NuGet operation, tag/release/asset/attestation mutation, settings change, force push, history rewrite, or GA claim occurred.

Hosted evidence remains pending. TASK-0250 must not dispatch until the exact TASK-0249 implementation HEAD passes `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke`.
