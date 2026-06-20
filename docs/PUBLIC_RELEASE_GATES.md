# Public Release Gates

This page documents the local public release gate orchestration command after the first GitHub and NuGet publication.

The gate script wraps existing checks:
- `scripts/check-package-metadata.ps1`
- `scripts/audit-public-release.ps1`
- `scripts/check-release-blockers.ps1`

## Current Published State
- GitHub repository public: yes.
- `master` pushed: yes.
- `v0.2.0-alpha.3` tag pushed: yes.
- Package metadata URLs are final and should pass the metadata gate.
- GitHub Release page for `v0.2.0-alpha.3`: completed.
- NuGet publish for `AgentContextKit` `0.2.0-alpha.3`: completed.
- NuGet global tool install and package smoke verification for `0.2.0-alpha.3`: completed.
- GitHub Actions latest `master` run is green for the pushed release commit.
- Repository description and topics are set.
- Codex for OSS application pack is ready.

Remote tag, GitHub Release, and NuGet package availability are external checks. The local gate scripts do not push, create releases, or publish packages.

## Report-Only Mode
Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1
```

Report-only mode keeps underlying checks non-failing and exits `0` when the scripts complete, while still printing notes.

## Failing Gate Mode
Run before future public release announcements or follow-up release work:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues
```

In the published `0.2.0-alpha.3` state, this gate should pass when the working tree is clean, package metadata is final, no tracked artifacts are present, and the release tag exists locally.

## Maintainer-Only Actions
This script does not:
- Push commits.
- Create or push tags.
- Create GitHub Releases.
- Create remotes.
- Publish NuGet packages.
- Replace package metadata URLs.
- Redact or delete files.

Follow [MAINTAINER_RELEASE_HANDOFF.md](MAINTAINER_RELEASE_HANDOFF.md) for the published release status and future maintainer-only release steps.
