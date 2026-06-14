# Security And Supply-Chain Evidence Register

Open decisions are consolidated in `docs/RELEASE_BLOCKER_BOARD.md` and `docs/MAINTAINER_DECISION_REGISTER.md`. Those summaries do not replace exact evidence in this file.

## Status
Local evidence register prepared on 2026-06-12. Published `0.2.0-alpha.2` package/release state was checked on 2026-06-13. Private vulnerability reporting was enabled and independently verified on 2026-06-14. Alpha.2 is NuGet.org repository-signed, but no author signature, SBOM artifact, or accessible GitHub package attestation was found. Other maintainer decisions remain open. This document is not release approval.

## Status Vocabulary
- `VERIFIED LOCAL`: reproduced from local source, tests, package inspection, or documented policy.
- `VERIFIED REMOTE STATE`: reproduced through a read-only remote query; this can confirm a blocker is present and is not equivalent to completion.
- `VERIFIED PUBLISHED STATE`: reproduced from the exact public package/release/digest; this describes what exists and is not a maintainer acceptance decision.
- `PROPOSED`: recommended decision that the maintainer has not accepted.
- `PENDING MAINTAINER`: requires a dated maintainer decision or remote evidence.
- `ACCEPTED RISK`: explicit dated owner acceptance with scope and review date.
- `VERIFIED MAINTAINER`: completed remote/credentialed action with non-sensitive evidence metadata.

## Evidence Register
| Area | Current Status | Local Evidence | Maintainer Evidence Required | RC Effect |
| --- | --- | --- | --- | --- |
| Private vulnerability reporting | VERIFIED MAINTAINER: ENABLED on 2026-06-14 | Authenticated enablement, independent GET `enabled: true`, and public Security-page entry-point verification; no advisory was created | Recheck before a future RC and after material repository ownership/security-setting changes | Complete for current repository state |
| Security notification ownership | PARTIAL MAINTAINER on 2026-06-14 | `Cynrath` is recorded as primary repository security triage owner; private channel is active | Assign and verify an independent backup owner and notification coverage; do not record reporter data | P0 blocker remains |
| Dependency vulnerability/deprecation review | VERIFIED LOCAL on 2026-06-12 | Direct/transitive vulnerability and deprecation reviews were clean after xUnit v3 migration; full suite passes 178/178 | Rerun on final candidate date and record commands, date, commit, sources reached, and result | Required fresh evidence |
| NuGet owner identity | ACCEPTED RISK on 2026-06-14 | NuGet owner/signature identity is `Cyranth`; package/project persona is `Cynrath`; alpha.2 OIDC publish succeeded | Recheck before next pre-release or 2026-09-30; do not claim shared human identity; retain OIDC-only publishing | P1 disposition complete for current scope |
| NuGet package signature | ACCEPTED RISK: author signing deferred on 2026-06-14 | Alpha.2 has a valid NuGet repository signature and no author signature; `docs/SUPPLY_CHAIN_DECISIONS.md` records rationale/controls | Revisit before next pre-release or 2026-09-30; do not claim author signing | P1 disposition complete for current scope |
| SBOM | ACCEPTED RISK: publication deferred on 2026-06-14 | Alpha.2 has no SBOM; deterministic .NET 10 generation/privacy/lifecycle are not validated | Revisit before next pre-release or 2026-09-30; retain dependency/package inspection controls | P1 disposition complete for current scope |
| Build/package provenance | IMPLEMENTED LOCALLY / HOSTED PENDING | `release.yml` attests the exact future GitHub Release nupkg using `actions/attest@v4` and verifies signer workflow; alpha.2 remains unattested | Require successful provenance creation/verification in the next publish run | Required next-release evidence |
| Bad-package recovery | PARTIAL MAINTAINER on 2026-06-14 | `docs/PACKAGE_RECOVERY.md` accepts immutable history, activation thresholds, successor/unlist/deprecate flow, communication, and review cadence; OIDC publication works | Verify unlist/deprecate/account-recovery authority and assign backup recovery ownership | P1 blocker remains |

## Recommended Defaults
- **Private reporting:** enable and verify before any 1.0 release candidate. GitHub documents private vulnerability reporting as a secure repository disclosure channel: <https://docs.github.com/code-security/security-advisories/working-with-repository-security-advisories/configuring-private-vulnerability-reporting-for-a-repository>.
- **Signing:** do not claim author signing until certificate issuance, timestamping, verification, rotation, and recovery are owned. Microsoft documents `dotnet nuget sign` and signature verification: <https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-nuget-sign>.
- **SBOM:** prefer SPDX-compatible export tied to the exact candidate commit, with privacy/content review before publication. GitHub documents repository SBOM export: <https://docs.github.com/code-security/supply-chain-security/understanding-your-software-supply-chain/exporting-a-software-bill-of-materials-for-your-repository>.
- **Provenance:** prefer a dedicated release workflow with least-privilege attestation permissions and digest verification; do not add it implicitly to ordinary CI. GitHub documents artifact attestations and required workflow permissions: <https://docs.github.com/actions/security-for-github-actions/using-artifact-attestations/using-artifact-attestations-to-establish-provenance-for-builds>.
- **Recovery:** publish a fixed successor; never replace immutable package content. Unlisting/deprecation and public communication remain explicit maintainer actions.

## Maintainer Evidence Record
Complete this metadata-only block in a dedicated maintainer/release task. Do not include secrets, private report content, certificate files/private identifiers, customer data, or machine-local paths.

```text
Status: PENDING MAINTAINER
Candidate version:
Candidate commit:
Decision date:
Maintainer: Cynrath

Private vulnerability reporting: ENABLED (verified 2026-06-14)
Verification reference: GitHub repository private-reporting GET plus public Security-page entry point
Security notification primary/backup owner: Cynrath / UNASSIGNED

Dependency review date and result:
Package signing decision: SIGN / DEFER
Signing evidence or accepted-risk reference:
SBOM decision: PUBLISH / DEFER
SBOM format, digest, and publication reference:
Provenance decision: ATTEST / DEFER
Attestation run, subject digest, and verification reference:
Bad-package recovery owner and accepted procedure: Cynrath / docs/PACKAGE_RECOVERY.md; NuGet authority pending

Open risks:
Next review date:
```

## Completion Rule
Change an item to `VERIFIED MAINTAINER` only when the exact candidate commit/version, decision date, owner, and non-sensitive evidence reference are recorded. A proposal, checklist, local script result, or repository document is not remote evidence.
