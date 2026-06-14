# Supply Chain Policy

## Package Source
Official public packages use NuGet package ID `AgentContextKit` and repository metadata pointing to `https://github.com/Cynrath/agent-context-kit`.

## Required Local Controls
- clean tracked-source and artifact hygiene scans;
- restore, Release build, and full tests;
- package metadata gate;
- local `dotnet pack` into a disposable directory;
- temporary tool-path install and command smoke;
- package content review before publication;
- release tag and GitHub/NuGet publication performed only by the maintainer.

## Dependency Controls
- Runtime dependencies remain minimal; current external package references are test tooling.
- Run vulnerability and deprecation review before a release candidate.
- Review dependency licenses when adding or upgrading packages.
- Do not add package sources or credentials to repository config.

Local review on 2026-06-13 found no vulnerable or deprecated direct/transitive packages. TASK-0091 resolved the prior `xunit` `2.9.3` Legacy warning by migrating the test project to `xunit.v3` `3.2.2` and `xunit.runner.visualstudio` `3.1.5`. The current repository suite passes 186/186 tests.

## Artifact Controls
- Never commit `.nupkg`, `.snupkg`, SARIF, generated HTML, archives, `bin/`, `obj/`, TestResults, coverage, or publish output.
- Keep generated package/tool smoke directories outside the repository.
- Verify package ID, version, README, license expression, repository URLs, and tool command before publish.

## Signing, SBOM, And Provenance Decision
The published `0.2.0-alpha.2` package is repository-signed by NuGet.org. Read-only verification found no author signature, no SBOM in the package or GitHub Release assets, and no accessible GitHub provenance attestation for the exact package digest. Exact NuGet/release hashes and hosted recovery evidence are in `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`.

NuGet.org repository signing must not be described as author-signed. Before 1.0 RC, the maintainer must make and record explicit decisions for:
- NuGet package signing;
- source/package provenance or attestations;
- SBOM generation and publication;
- recovery/deprecation procedure for a bad package.
- alignment of the public NuGet owner profile `Cyranth` with the project persona and package author `Cynrath`.

These decisions may require remote credentials/services and remain maintainer-only blockers. This task does not sign, publish, or upload anything.

TASK-0095 consolidates the decision fields. TASK-0127 refreshes the exact published package/release state for alpha.2. TASK-0129 verifies private reporting. TASK-0130 accepts the immutable-package recovery procedure while leaving NuGet execution authority and backup ownership explicit. Owner identity alignment, author signing, SBOM publication, and provenance remain follow-up tasks; no unverified control is claimed.

## Recovery
If a bad package is published, stop recommending the version, document impact, publish a fixed successor rather than replacing immutable package content, and update release/install guidance. NuGet unlisting/deprecation is a maintainer remote action. Operational ownership, activation thresholds, communication, and the tabletop boundary are defined in `docs/PACKAGE_RECOVERY.md`.
