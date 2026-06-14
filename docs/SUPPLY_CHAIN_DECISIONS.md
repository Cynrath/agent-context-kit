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
**Decision: IMPLEMENT for the next published release.**

The manual `publish` job now:
1. publishes and verifies NuGet;
2. creates/verifies the exact tag and GitHub Release;
3. downloads the exact release `.nupkg` asset;
4. skips creation if an attestation already exists for that SHA-256;
5. uses `actions/attest@v4` with `attestations: write` and `id-token: write` only in the publish job;
6. verifies the result with `gh attestation verify` and the exact release workflow identity.

The read-only `verify-existing` job retains `contents: read` only and cannot attest, publish, tag, or edit a release. No provenance claim is made for `v0.2.0-alpha.2`; the control requires a future successful release run.

## Review
Revisit all three decisions before the next release candidate, after a workflow permission/action change, or by 2026-09-30.
