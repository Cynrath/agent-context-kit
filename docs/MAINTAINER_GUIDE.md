# Maintainer Guide

This guide is for repository maintainers preparing local changes, releases, and post-release verification for AgentContextKit.

Codex or other agent sessions must not push, tag, create GitHub Releases, publish NuGet packages, create remotes, or handle API keys unless the maintainer explicitly requests that public action.

## Normal Change Flow
1. Create or update a task file under `docs/tasks/`.
2. Keep changes small and scoped.
3. Update docs after behavior or release workflow changes.
4. Run restore, Release build, tests, `ackit scan --ci`, and `ackit doctor`.
5. Run hygiene scans for maintainer identity terms, tracked artifacts, and exact token/local-path patterns.
6. Commit only after validation passes.

## Release Flow
Use `docs/MAINTAINER_RELEASE_HANDOFF.md` as the current release source of truth.

Before a future release:
1. Decide the next version and document it in a task.
2. Update package metadata and CLI runtime version intentionally.
3. Update README install commands, packaging docs, release validation docs, and changelog.
4. Run local package validation with a temporary package source and temporary tool path.
5. Confirm `cross-platform-source-smoke` passes after the release-prep commit is pushed.
6. Create the release tag only after source validation.
7. Create the GitHub Release page from the tag.
8. Publish the NuGet package using a secure maintainer environment.
9. Verify install or update from NuGet.
10. Update published-package smoke workflow and public docs to the new version.

Release-candidate evidence is tracked in `docs/RELEASE_CANDIDATE_EVIDENCE.md`. Run the local evidence gate before requesting hosted release-candidate validation:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
```

For hosted RC evidence, push the reviewed commit and manually dispatch `release-candidate-evidence`. Follow `docs/RC_HOSTED_EVIDENCE.md`; the workflow intentionally has no automatic push/PR trigger and no upload permissions.

## Version Bump Notes
- Keep `PackageId` as `AgentContextKit`.
- Keep `ToolCommandName` as `ackit`.
- Keep `RepositoryUrl` and `PackageProjectUrl` pointed at the public repository.
- Keep `Authors` and `Company` as `Cynrath`.
- Do not change generated file conventions without updating docs and tests.

## GitHub Actions Validation
Current hosted checks:
- `ci`: build, tests, and repository scan on Ubuntu and Windows.
- `cross-platform-smoke`: installs the published NuGet global tool on Windows, Ubuntu, and macOS.
- `cross-platform-source-smoke`: packs the current branch and tests the local package on Windows, Ubuntu, and macOS.

After push, confirm all three workflows are green before tagging or publishing.

Read-only status check:

```powershell
gh run list --repo Cynrath/agent-context-kit --limit 10
gh run list --repo Cynrath/agent-context-kit --workflow ci.yml --limit 3
gh run list --repo Cynrath/agent-context-kit --workflow cross-platform-smoke.yml --limit 3
gh run list --repo Cynrath/agent-context-kit --workflow cross-platform-source-smoke.yml --limit 3
```

## Sample And Demo Docs
Use `docs/SAMPLE_GALLERY.md` and `docs/DEMO_SCENARIOS.md` for onboarding examples. Keep sample repositories small, safe, and artifact-free. Do not commit generated `.ackit/` report, Web UI, SARIF, prompt-pack, context-export, `bin/`, `obj/`, `node_modules`, package, archive, or local secret outputs.

Local sample smoke helper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-samples.ps1 -NoBuild
```

## SARIF And Code Scanning
The published `1.0.0-rc.1` package and current source include `ackit sarif --output .ackit/reports/ackit.sarif`, which creates a local SARIF 2.1.0 scanner report with repository-relative paths and no raw scanner match values.

The published NuGet `1.0.0-rc.1` package includes `ackit sarif`. Keep source package smoke for validating future source changes before publication.

The repository does not enable GitHub Code Scanning upload by default. `docs/examples/github-actions-sarif-upload.yml` is a non-active example only. Before enabling it as a real workflow, maintainers should review the generated SARIF artifact, confirm `security-events: write` permission is acceptable, and decide whether Code Scanning alerts should become part of release validation.

See `docs/CODE_SCANNING_DECISION.md` for the current decision: documentation-only by default, opt-in later after maintainer review.

## Scanner Rules And Allowlists
Use `docs/SCANNER_RULES.md` as the source of truth for stable `ACKIT` rule IDs, default severity, SARIF level mapping, and remediation guidance.

Config fields `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` are for narrow non-Critical scanner noise. They should not be used to hide real secrets, production config, private customer data, or release blockers. Critical findings remain reportable by design.

See `docs/GITHUB_ACTIONS_USAGE.md` for documented CI examples and failure interpretation.

## GitHub Repository Settings
Use `docs/GITHUB_SETTINGS_CHECKLIST.md` for maintainer-only repository settings:
- Description and topics.
- Default branch and branch protection.
- Required status checks.
- Dependabot, secret scanning, and future CodeQL review.
- Alpha GitHub Release pre-release setting.

Use `docs/GITHUB_LABELS.md` for the recommended label set. Do not create, edit, or delete GitHub labels from an agent session unless the maintainer explicitly asks for that metadata write.

Use `docs/ISSUE_BACKLOG.md` for the first copy-ready issue set. Issue creation is maintainer-only remote-write work.

## NuGet Publish Notes
- Build and pack from a clean, validated working tree.
- Use a maintainer-owned NuGet API key stored outside the repository.
- Do not commit `.nupkg`, `.snupkg`, logs, or generated publish output.
- Verify `ackit version`, `ackit --help`, and a clean demo-app smoke flow after publication.

## Rollback Notes
- NuGet packages cannot be truly deleted once published. Prefer deprecating or unlisting a bad package and publishing a fixed version.
- A GitHub Release page can be edited or marked as pre-release if messaging is wrong.
- Avoid force-push rollback. Use a corrective commit for docs or source fixes.
- If a release tag points to the wrong commit, stop and document the incident before any maintainer-only tag action.

## Current Release
`v1.0.0-rc.1` is the current complete prerelease on GitHub and NuGet at exact package/tag commit `258918b33c3d1359aac967604ee524e8b66ddf02`. Exact assets, both attestations, and Windows/Ubuntu/macOS installed-package smoke are verified. This is not a `1.0.0` GA claim.

Current source metadata and the current published prerelease are `1.0.0-rc.1`; exact hosted predecessor `0.2.0-alpha.4` remains immutable upgrade/rollback evidence.

For historical release-note evidence, use the version-specific release task and immutable GitHub prerelease. Do not reuse an older release body as a current alpha4 source of truth.
