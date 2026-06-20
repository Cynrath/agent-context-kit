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
Planned. Evidence will be recorded after implementation and validation.
