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
The current published `0.2.0-alpha.4` package is available through NuGet.org and was verified by TASK-0220. Historical alpha.2 read-only verification found NuGet.org repository signing, no author signature, no SBOM in the package or GitHub Release assets, and no accessible GitHub provenance attestation for the exact package digest. Exact historical NuGet/release hashes and hosted recovery evidence remain in `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`; alpha.3 and alpha.4 package/release evidence remains in their dated task records.

Packages with NuGet repository signatures are repository-signed by NuGet.org and must not be described as author-signed. Before 1.0 RC, the maintainer must make and record explicit decisions for:
- NuGet package signing;
- source/package provenance or attestations;
- SBOM generation and publication;
- recovery/deprecation procedure for a bad package.
- alignment of the public NuGet owner profile `Cyranth` with the project persona and package author `Cynrath`.

TASK-0132 records the current decisions in `docs/SUPPLY_CHAIN_DECISIONS.md`: author signing and SBOM are bounded deferrals, while exact GitHub Release package provenance is implemented in the publish workflow. TASK-0206 exposed a publish-path provenance probe failure after package/tag/release creation; TASK-0208 hardened that idempotency path so missing attestation HTTP 404 records `exists=false` in future publish runs. No claim is made that alpha.2 has project provenance.

TASK-0095 consolidates the decision fields. TASK-0127 refreshes the exact published package/release state for alpha.2. TASK-0129 verifies private reporting. TASK-0130 accepts the immutable-package recovery procedure while leaving destructive authority and backup ownership explicit. TASK-0131 dispositions the owner identity. TASK-0132 defers author signing/SBOM with bounded accepted risk and adds future-release provenance; no unverified published control is claimed.

## Recovery
If a bad package is published, stop recommending the version, document impact, publish a fixed successor rather than replacing immutable package content, and update release/install guidance. NuGet unlisting/deprecation is a maintainer remote action. Operational ownership, activation thresholds, communication, and the tabletop boundary are defined in `docs/PACKAGE_RECOVERY.md`.

For the bounded `1.0.0-rc.1` partial-publication recovery, the package and owner-created exact tag are immutable inputs. `recover-existing` must verify the tag target and prove the GitHub Release/assets plus both candidate-digest attestations absent before creating the prerelease. The recovery path contains no NuGet publication or tag mutation; any failed authorized dispatch is preserved and never automatically rerun.

TASK-0255 completed the exact prerelease and two retained assets through the authenticated repository owner identity after the Actions integration release-endpoint 403. TASK-0256 separates remaining provenance into `attest-existing`: it grants only Contents read plus OIDC/attestation write, verifies the exact tag/release/body/assets and repository-signed NuGet equivalence before two conditional attestations, requires CLI verification for both subjects, rechecks immutable release state, and gates Windows/Ubuntu/macOS installed-package smoke. This path cannot publish NuGet or create/edit/upload/delete the release or tag.
