# TASK-0208: release provenance probe hardening

## Purpose
Harden `.github/workflows/release.yml` so the publish path treats a missing release asset attestation as an idempotent `exists=false` state and continues to `actions/attest@v4` instead of failing before provenance can be created.

This is follow-up hardening for a future release. It must not republish, retag, mutate the existing `v0.2.0-alpha.3` GitHub Release, mutate the `AgentContextKit` `0.2.0-alpha.3` NuGet package, or dispatch a publish/release-candidate workflow.

## Scope
- Start with mandatory `ackit --help`, version, fetch/status, HEAD/origin, and recent-log checks.
- Read the release workflow, related release validation scripts, release automation docs, handoff docs, and TASK-0206/TASK-0207 evidence before editing.
- Update `.github/workflows/release.yml` only where needed to make the release asset provenance probe idempotent.
- Update workflow static tests/scripts only if needed to prove the new missing-attestation behavior.
- Add or extend a targeted workflow test so the repository proves:
  - missing attestation lookup sets `provenance-state.outputs.exists=false`;
  - existing attestation lookup sets `provenance-state.outputs.exists=true`;
  - release asset download failure still fails;
  - attestation verification failure after the attest step still fails.
- Update release automation and handoff docs after implementation.
- Record final evidence and validation results in this task file.

## Out of scope
- No NuGet publish.
- No GitHub Release mutation.
- No tag mutation.
- No release workflow publish dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No source feature work unrelated to release workflow hardening.
- No owner/account/secret/security-setting mutation.
- No rewriting historical alpha.2 or alpha.3 publish evidence.

## Affected files
- `docs/tasks/TASK-0208-release-provenance-probe-hardening.md`
- `.github/workflows/release.yml`
- Release workflow validation script(s), only as required for coverage:
  - `scripts/check-release-workflow.ps1`
  - `scripts/test-supply-chain-workflow.ps1`
- Release automation and handoff docs after implementation:
  - `docs/NEXT_TASKS.md`
  - `.codex/SESSION_HANDOFF.md`
  - `.codex/CONTEXT_PACK.md`
  - `.codex/NEXT_STEPS.md`
  - `docs/V020_ALPHA3_RELEASE_DECISION.md`
  - `docs/RELEASE_VALIDATION.md`
  - `docs/RELEASE_AUTOMATION.md`
  - `docs/GITHUB_ACTIONS_USAGE.md`
  - `docs/MAINTAINER_RELEASE_HANDOFF.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No application admin UI, repository environment, package owner, GitHub Release setting, or repository security setting is changed.

## Security impact
Positive supply-chain governance impact. The release workflow should create missing provenance on a future publish run while still failing for real asset download, tag/release/package validation, auth/API, or post-attestation verification failures.

## Permission/auth impact
No new permission or secret is introduced. The workflow must preserve the existing publish-job permission model and OIDC/trusted-publishing boundary. Local work must not create API keys or mutate repository/package settings.

## Localization impact
None. No runtime localization resources change.

## SEO/i18n impact
None. Documentation updates are release-handoff/status updates only.

## UX impact
No CLI UX change. The user-facing effect is more reliable future release automation.

## Logging/audit impact
Adds audit evidence for the TASK-0206 failure mode, the workflow hardening, static/targeted test coverage, validation results, and confirmation that `0.2.0-alpha.3` release artifacts remain unchanged.

## Acceptance criteria
- TASK-0208 task plan is committed before workflow/script edits.
- `.github/workflows/release.yml` no longer fails the publish path solely because `gh api repos/<repo>/attestations/sha256:<digest>` returns missing/not found.
- Missing attestation state writes `exists=false` to `GITHUB_OUTPUT` and allows `actions/attest@v4` to run.
- Existing attestation state writes `exists=true` and skips `actions/attest@v4`.
- Release asset download failure still throws and fails the workflow.
- Tag, release, package, and package asset verification failures still fail the workflow.
- `gh attestation verify` after the attest step remains required and failing verification still fails the workflow.
- Static/targeted tests cover the missing-attestation and existing-attestation path markers.
- Release automation/handoff docs state this was follow-up hardening for the next release, not a new publish.
- No NuGet package, tag, GitHub Release, package metadata, version, owner/account/secret/security-setting, or workflow dispatch mutation occurs.

## Test steps
- Required initial checks:

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
git log --oneline -n 30
```

- Local/static validation:

```powershell
ackit --version
ackit doctor
ackit scan --ci
git diff --check
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1 -Version 0.2.0-alpha.3
```

## Risks
- Suppressing all `gh api` failures could hide real auth, API, rate-limit, or network failures.
- Relying only on exit code could confuse not-found with other failures if `gh` behavior changes.
- Static tests could become too loose and miss a regression in the publish path.
- Accidentally dispatching the release workflow would violate this task's hard boundary.
- Mutating the already-published alpha.3 release state would violate immutable release policy.

## Rollback plan
Before push, correct the workflow/scripts/docs with normal commits. After push, revert the TASK-0208 commits with normal `git revert <sha>` if needed. Do not move tags, reuse versions, replace release assets, republish NuGet packages, or manually mutate GitHub Release/NuGet state.

## Completion notes
Completed as release workflow hardening for the next release. This task did not publish, tag, dispatch a release workflow, dispatch release-candidate evidence, mutate the GitHub Release, mutate NuGet package state, change package metadata, or bump the version.

Commits:
- Plan: `bac4ef0` (`docs: plan task 0208 provenance probe hardening`)
- Implementation: `35894b6` (`ci: harden release provenance probe`)

Exact TASK-0206 failure motivating the fix:
- Publish runs `27870603776` and `27870710093` reached the publish path after the NuGet package, tag, GitHub prerelease, and assets existed.
- Step `Inspect exact release asset provenance` ran `gh api repos/Cynrath/agent-context-kit/attestations/sha256:<digest>` for the exact release `.nupkg`.
- When no attestation existed yet, `gh api` returned nonzero/404 and the step failed before `actions/attest@v4` could run.
- A read-only local probe confirmed `gh api --include repos/Cynrath/agent-context-kit/attestations/sha256:000...` exits `1` and emits `HTTP/2.0 404 Not Found` plus `gh: Not Found (HTTP 404)` for a missing attestation.

Files changed:
- `.github/workflows/release.yml`
- `scripts/check-release-workflow.ps1`
- `scripts/test-supply-chain-workflow.ps1`
- `docs/SUPPLY_CHAIN_POLICY.md`
- `docs/tasks/TASK-0208-release-provenance-probe-hardening.md`
- `docs/NEXT_TASKS.md`
- `.codex/HANDOFF.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/PACKAGING.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/RELEASE_AUTOMATION.md`
- `docs/GITHUB_ACTIONS_USAGE.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`

Workflow behavior after hardening:
- Release asset download still fails the workflow if `gh release download` fails.
- Existing attestation lookup sets `exists=true` and skips `actions/attest@v4`.
- Missing attestation lookup is detected by HTTP 404 output and sets `exists=false`, allowing `actions/attest@v4` to run.
- Non-404 `gh api` failures still throw `Unable to query release package attestation state`.
- `gh attestation verify` remains after `actions/attest@v4`; verification failure still fails the workflow.

Targeted provenance/static coverage:
- `scripts/check-release-workflow.ps1` now requires the status-aware provenance probe markers, the release asset download failure guard, the existing-attestation true path, the missing-attestation false path, and the hard-failure throw path.
- `scripts/test-supply-chain-workflow.ps1` now includes negative fixtures for missing attestation permission, missing `actions/attest@v4`, read-only verifier permission escalation, missing false path, missing true path, missing hard-failure throw, missing 404 handling, missing release asset download failure, and missing final attestation verification.
- Full hosted simulation of `actions/attest@v4` was not performed locally; this task verifies workflow logic and failure-preserving markers statically and with network-free negative fixtures.

Validation results:
- `ackit --version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- `ackit doctor`: passed.
- `ackit scan --ci`: passed with existing Medium `.remember`/artifact review findings and existing Low local-path findings only.
- `git diff --check`: passed.
- `dotnet restore AgentContextKit.sln`: passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore`: passed with existing xUnit analyzer warnings only and 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, 428/428.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues`: initially failed on the existing missing `repository-signed by NuGet.org` truth-boundary marker; after restoring that exact marker in `docs/SUPPLY_CHAIN_POLICY.md`, passed with only the expected dirty-tree warning during evidence editing.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues`: initially failed on the same existing truth-boundary marker; after restoring it, passed with only the expected dirty-tree and dependency-review-not-run warnings during evidence editing.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1 -Version 0.2.0-alpha.3`: passed on a clean tree after the evidence commit; restore/build/test, source scan, doctor, release blocker review, pack, temporary tool install, installed help, and installed scan JSON all passed. The release blocker review reported only the expected post-release warning that current HEAD is not historical tag `v0.2.0-alpha.2`.

Mutation confirmation:
- No NuGet publish occurred.
- No Git tag was created, moved, or deleted.
- No GitHub Release was created, edited, deleted, or asset-mutated.
- No package metadata or version was changed.
- No release workflow publish dispatch occurred.
- No release-candidate workflow dispatch occurred.
- No owner/account/secret/security-setting mutation occurred.
- Existing published `AgentContextKit` `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, GitHub prerelease `v0.2.0-alpha.3`, and NuGet package state remain unchanged.

Next task:
- Either verify the provenance hardening in a future non-publishing workflow mode if one is added, or continue normal post-alpha.3 maintenance. Future release publication still requires its own task, hosted evidence, exact-SHA decision, and explicit workflow dispatch authorization.
