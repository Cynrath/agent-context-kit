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
| Security notification ownership | PENDING MAINTAINER | Incident fields and response targets are documented | Record who receives repository security notifications and the backup owner; do not record reporter data | P0 blocker |
| Dependency vulnerability/deprecation review | VERIFIED LOCAL on 2026-06-12 | Direct/transitive vulnerability and deprecation reviews were clean after xUnit v3 migration; full suite passes 178/178 | Rerun on final candidate date and record commands, date, commit, sources reached, and result | Required fresh evidence |
| NuGet owner identity | VERIFIED REMOTE STATE: MISMATCH on 2026-06-13 | NuGet Gallery owner profile is `Cyranth`; package author/project persona is `Cynrath` | Align the owner profile/package ownership or record a dated intentional exception and account-recovery owner | P1 blocker before RC |
| NuGet package signature | VERIFIED PUBLISHED STATE: Alpha.2 repository signature; no author signature observed | NuGet SHA-256 `83348398...5152`, successful `dotnet nuget verify`, and hosted recovery run `27478046088` are recorded in `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md` | Choose author signing or defer with ACCEPTED RISK, lifecycle owner, and review date | P1 decision |
| SBOM | VERIFIED PUBLISHED STATE: Not present in alpha.2 package or GitHub Release assets | Thirteen package entries and both release assets were inspected on 2026-06-13 | Publish an exact-candidate SBOM or defer with owner, reason, compensating review, and review date | P1 decision |
| Build/package provenance | VERIFIED PUBLISHED STATE: No accessible GitHub attestation for alpha.2 package digest | Authenticated attestation endpoint query for exact SHA-256 returned HTTP 404 | Attest an exact-candidate artifact or defer with owner, reason, package hash review, and review date | P1 decision |
| Bad-package recovery | PROPOSED | Successor/unlist/deprecate policy is documented; immutable package replacement is prohibited | Accept the owner, decision threshold, communication path, unlist/deprecate authority, successor version process, and post-incident review date | Required decision |

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
Security notification primary/backup owner:

Dependency review date and result:
Package signing decision: SIGN / DEFER
Signing evidence or accepted-risk reference:
SBOM decision: PUBLISH / DEFER
SBOM format, digest, and publication reference:
Provenance decision: ATTEST / DEFER
Attestation run, subject digest, and verification reference:
Bad-package recovery owner and accepted procedure:

Open risks:
Next review date:
```

## Completion Rule
Change an item to `VERIFIED MAINTAINER` only when the exact candidate commit/version, decision date, owner, and non-sensitive evidence reference are recorded. A proposal, checklist, local script result, or repository document is not remote evidence.
