# Signing, SBOM, And Provenance Decisions

Decision date: 2026-06-14. Owner: `Cynrath`. Scope: next pre-release planning and release automation.

## Author Signing
**Decision: DEFER / ACCEPTED RISK** until the next pre-release review or 2026-09-30.

No trusted code-signing certificate, timestamping service, custody owner, rotation process, or recovery procedure is verified. The project will not generate a certificate or fabricate signing evidence.

Compensating controls:
- NuGet.org repository signature verification;
- exact commit/package metadata and digest checks;
- OIDC-only Trusted Publishing;
- GitHub artifact provenance for future release assets;
- immutable successor recovery.

The package must not be described as author-signed.

## SBOM
**Decision: DEFER / ACCEPTED RISK** until the next pre-release review or 2026-09-30.

Microsoft's SBOM Tool is the preferred evaluation candidate because it produces SPDX-compatible output, but this repository has not validated deterministic .NET 10 package output, privacy contents, offline behavior, or release lifecycle. An unreviewed SBOM will not be published merely to close a checklist.

Compensating controls:
- clean direct/transitive vulnerability and deprecation review;
- package archive and dependency inspection;
- minimal runtime dependency surface;
- exact artifact digest and provenance verification.

Future implementation must define format/version, generator pin, package-to-SBOM relationship, privacy scan, digest, release asset name, retention, and verification.

## GitHub Artifact Provenance
**Decision: IMPLEMENTED AND HOSTED-VERIFIED FOR `1.0.0-rc.1`.**

The manual `publish` job now:
1. publishes and verifies NuGet;
2. creates/verifies the exact tag and GitHub Release;
3. downloads the exact release `.nupkg` asset;
4. skips creation if an attestation already exists for that SHA-256;
5. uses `actions/attest@v4` with `attestations: write` and `id-token: write` only in the publish job;
6. verifies the result with `gh attestation verify` and the exact release workflow identity.

The read-only `verify-existing` job retains `contents: read` only and cannot attest, publish, tag, or edit a release. The dedicated `attest-existing` operation verified the immutable RC1 tuple, created and verified nupkg/snupkg attestations `35295200`/`35295205`, and rechecked release state in run `29350091782`. No provenance claim is made retroactively for alpha2/alpha3/alpha4.

## Review
Revisit all three decisions before the next release candidate, after a workflow permission/action change, or by 2026-09-30.

## TASK-0232 V100-09 Decision

Decision date: 2026-07-10. The V100 minimum baseline is OIDC Trusted Publishing, immutable versions, no tag movement or package replacement, commit/tag/release alignment, package metadata/content and digest inspection, NuGet repository-signature verification, release asset verification, upgrade/rollback evidence, reconciled recovery ownership, and provenance/attestation evidence on the next authorized publish path.

Author signing and SBOM remain bounded accepted risks within the 2026-06-14 through 2026-09-30 review scope. Status: `MAINTAINER_DECISION_RECORDED`, `RECOVERY_OWNERSHIP_RECONCILED`, `ACCEPTED_RISK_RECORDED_FOR_SIGNING_AND_SBOM`, and `HOSTED_PROVENANCE_VERIFIED_FOR_RC1`.

TASK-0241 conditionally accepted `1.0.0-rc.1` without executing publication. TASK-0255/TASK-0256 later completed exact release assets and both attestations, and TASK-0257 closes V100-09. Current status: `MAINTAINER_DECISION_RECORDED / RECOVERY_OWNERSHIP_RECONCILED / SIGNING_AND_SBOM_ACCEPTED_RISK_ACTIVE / HOSTED_PROVENANCE_VERIFIED_FOR_RC1`.
