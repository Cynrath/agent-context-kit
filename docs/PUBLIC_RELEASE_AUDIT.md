# Public Release Audit

This document records the local-only public release audit workflow after the current GitHub and NuGet publication.

## Current Status
GitHub source publication and NuGet publication are complete for `0.2.0-alpha.3`.

- GitHub repository public: yes.
- `master` pushed: yes.
- `v0.2.0-alpha.3` tag pushed: yes.
- Package URL blockers are resolved.
- GitHub Release page for `v0.2.0-alpha.3`: completed.
- NuGet publish for `AgentContextKit` `0.2.0-alpha.3`: completed.
- NuGet global tool install and package smoke verification for `0.2.0-alpha.3`: completed.
- Codex for OSS application submission: completed per maintainer-provided status.

## Audit Command
Run report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-public-release.ps1
```

Run as a failing gate before future public release announcements or follow-up release work:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-public-release.ps1 -FailOnIssues
```

For post-push documentation sync commits, `HEAD` may be newer than the release tag. The audit requires the release tag to exist locally and reports `HEAD` not being tagged as a warning, not a release issue.

## Gate Orchestration
Run package metadata, public release audit, and release blocker checks together:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1
```

Use failing mode before future public release announcements or follow-up release work:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues
```

See [PUBLIC_RELEASE_GATES.md](PUBLIC_RELEASE_GATES.md).

## What The Audit Checks
- Tracked forbidden build/dependency/test artifact paths.
- Tracked package, temporary, dump, and backup file extensions.
- Tracked secret-like config files such as `.env` and `secrets.json`.
- Tracked environment-specific appsettings files.
- Dirty working tree state.
- Local release tag presence.
- Package `Authors` and `Company` metadata use `Cynrath`.
- `RepositoryUrl` and `PackageProjectUrl` are not placeholders.
- Package README and license metadata are present.

Remote tag push, GitHub Actions status, GitHub Release page status, repository topics, and NuGet package availability are external checks and must be verified through GitHub/NuGet or maintainer-controlled commands.

## Required Manual Follow-Up
For the published `0.2.0-alpha.3` state:
1. Keep the GitHub Release page and NuGet package linked from maintainer-facing docs.
2. Keep `docs/CODEX_FOR_OSS_APPLICATION.md` as the submitted Codex for OSS application reference.
3. Re-run `scripts/audit-public-release.ps1 -FailOnIssues` before future release announcements.
4. Re-run `scripts/check-release-blockers.ps1 -FailOnBlockers` before future release announcements.
5. Re-run `scripts/check-public-release-gates.ps1 -FailOnIssues` before future release announcements.
6. Re-run `scripts/verify-release.ps1` before future package publication.

See [MAINTAINER_RELEASE_HANDOFF.md](MAINTAINER_RELEASE_HANDOFF.md) for copy-paste-ready maintainer-only commands.

## Safety
The audit script is read-only. It does not push, tag, publish, redact, delete files, create remotes, or modify package metadata.
