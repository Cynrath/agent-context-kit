# TASK-0220: Authorized Alpha4 Publish

## Objective

Publish `AgentContextKit 0.2.0-alpha.4` using the repository's authorized OIDC release workflow path, after verifying all preconditions and the TASK-0219 hosted RC GO decision.

## Authorization

The maintainer explicitly authorizes TASK-0220: publish `AgentContextKit 0.2.0-alpha.4`.

- Do not publish any version except `0.2.0-alpha.4`.
- Do not republish or mutate `0.2.0-alpha.3`.
- Do not publish if the exact release preconditions fail.

## Release Workflow Preflight Fixes

The following pre-existing RC issues were fixed during TASK-0220 release preflight:

1. **`scripts/verify-release.ps1`**: Default version parameter was `0.2.0-alpha.3` instead of `0.2.0-alpha.4`. TASK-0218 alpha4 release prep missed updating this file. The release workflow's `prepare-release.ps1` consistency check requires exact version match.

2. **`docs/RELEASE_BLOCKERS.md`**: Updated to alpha4 publish state; restored `v0.2.0-alpha.2` predecessor reference for v100 documentation gate.

3. **`docs/PUBLIC_RELEASE_AUDIT.md`**: Updated to alpha4 publish state; fixed `GitHub Release page: completed` and `NuGet global tool install verification: completed` patterns.

4. **`docs/PUBLIC_RELEASE_GATES.md`**: Updated to alpha4 publish state; fixed `GitHub Release page: completed` and `NuGet publish: completed` patterns.

5. **`scripts/test-release-candidate-inputs.ps1`**: Wrong-version test case was hardcoded to `"0.2.0-alpha.4"`, which now matches the source version. Changed to `"9.9.9-alpha.999"` so it remains a valid negative test.

6. **`.github/workflows/release.yml`**: Pack inspection checked for `README.md` but the package now contains `README.nuget.md` (TASK-0215/0218 README split). Updated to check for `README.nuget.md`.

These are release process documentation, test, and release workflow fixes. No public docs (README.md/README.tr.md) or release-relevant source code changed.

## Preconditions

TASK-0219 is complete, pushed, and CI-green.

- RC evidence commit: `b8e8fce68f803c50f708d1566f1a38aab4b34bde`
- Current HEAD: `c15cbf5f2a9bc73cda89f6a1c1c147e3c0d02b2f`
- Diff from RC commit: docs/evidence/handoff only (verified: `.codex/*.md`, `docs/*.md`, `docs/tasks/TASK-0219*.md`)
- Hosted RC GO: confirmed (run `28208545684`, all 3 OS passed, decision: GO)
- Alpha4 is NOT published, no tag, no GitHub Release, no NuGet mutation

## Allowed Actions

- Create TASK-0220 task doc.
- Verify exact local/remote HEAD.
- Verify TASK-0219 GO evidence.
- Verify `b8e8fce..c15cbf5` is docs/evidence-only.
- Verify release workflow definition and required inputs.
- Dispatch existing `release.yml` only if preconditions pass.
- Monitor the release workflow.
- Verify NuGet package `AgentContextKit 0.2.0-alpha.4`.
- Verify git tag `v0.2.0-alpha.4`.
- Verify GitHub prerelease `v0.2.0-alpha.4`.
- Verify global tool install from NuGet.
- Record publish evidence.
- Update docs/handoff/release validation.
- Do not update public README install docs yet; that is TASK-0221 after publish verification.

## Forbidden Actions

- No API-key publish.
- No manual `dotnet nuget push`.
- No manual tag creation.
- No manual GitHub Release creation.
- No GitHub Release asset manual upload.
- No release asset replacement.
- No republish of `0.2.0-alpha.3`.
- No deletion/unlisting of NuGet versions.
- No moving existing tags.
- No editing `README.md` or `README.tr.md` to claim alpha4 is published.
- No public docs/README sync; leave it for TASK-0221.
- No unrelated source changes.
- No broad docs refactor.
- No source/package version bump beyond existing `0.2.0-alpha.4`.
- No change to `README.nuget.md`.
- Fix `scripts/verify-release.ps1` default version if preflight requires it (pre-existing RC issue: TASK-0218 missed this update).
- Fix release process docs (RELEASE_BLOCKERS.md, PUBLIC_RELEASE_AUDIT.md, PUBLIC_RELEASE_GATES.md) to match v100 documentation gate patterns.

## Implementation

1. Initial git checks: HEAD == origin/master == c15cbf5, working tree clean.
2. Verify b8e8fce..c15cbf5 is docs/evidence/handoff only.
3. Verify GO evidence in TASK-0219 doc and MAINTAINER_DECISION_REGISTER.md MD-011.
4. Verify no alpha4 tag, GitHub Release, or NuGet exists.
5. Read release workflow definition.
6. Run preflight validation:
   - `dotnet restore/build/test`
   - `scripts/check-package-metadata.ps1 -FailOnIssues`
   - `scripts/check-release-workflow.ps1 -FailOnIssues`
   - `ackit doctor`
   - `ackit scan --ci`
   - `scripts/check-local-markdown-links.ps1 -FailOnIssues`
   - `scripts/check-localization-parity.ps1`
   - `scripts/check-tracked-vs-untracked-md.ps1`
   - `git diff --check`
7. Dispatch `release.yml` operation=publish with:
   - version: `0.2.0-alpha.4`
   - automation_commit_sha: `c15cbf5f2a9bc73cda89f6a1c1c147e3c0d02b2f`
   - release_commit_sha: `c15cbf5f2a9bc73cda89f6a1c1c147e3c0d02b2f`
   - prerelease: true
8. Monitor release workflow until completion.
9. Verify release artifacts:
   - Tag `v0.2.0-alpha.4` exists.
   - GitHub prerelease `v0.2.0-alpha.4` exists.
   - NuGet package `AgentContextKit 0.2.0-alpha.4` published.
   - Global tool install from NuGet works.
   - `ackit doctor` passes.
   - `ackit scan --ci` exits 0.
10. Update docs/evidence files with publish proof.
11. Commit and push evidence.
12. Final validation and summary.

## Verification

- `git status --porcelain=v1 --untracked-files=all` clean before push.
- `dotnet test AgentContextKit.sln -c Release --no-build` passes.
- `scripts/check-tracked-vs-untracked-md.ps1` passes.
- `scripts/check-local-markdown-links.ps1 -FailOnIssues` passes.
- `scripts/check-localization-parity.ps1` passes.
- `scripts/check-release-workflow.ps1 -FailOnIssues` passes.
- `git diff --check` clean.
- Windows Unicode temp guard passes.

## Completion

- `AgentContextKit 0.2.0-alpha.4` is published on NuGet.
- `v0.2.0-alpha.4` tag exists.
- GitHub prerelease `v0.2.0-alpha.4` exists.
- Global tool install for `0.2.0-alpha.4` works.
- `README.nuget.md` package README fix is shipped.
- `README.md` / `README.tr.md` still wait for TASK-0221.
- Publish evidence is recorded in docs.

## Next Task

TASK-0221: post-publish public README/docs sync to `0.2.0-alpha.4`.
