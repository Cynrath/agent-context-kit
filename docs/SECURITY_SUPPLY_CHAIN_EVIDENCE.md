# Security And Supply-Chain Evidence Register

Open decisions are consolidated in `docs/RELEASE_BLOCKER_BOARD.md` and `docs/MAINTAINER_DECISION_REGISTER.md`. Those summaries do not replace exact evidence in this file.

## Status
Local evidence register prepared on 2026-06-12. Historical alpha2 package/release state was checked on 2026-06-13, and private vulnerability reporting was independently verified on 2026-06-14. Current RC1 evidence now includes a NuGet.org repository signature, exact repository commit, exact GitHub assets, and two verified GitHub artifact attestations. No author signature or SBOM is claimed. This document records evidence; it is not `1.0.0` GA approval.

## Status Vocabulary
- `VERIFIED LOCAL`: reproduced from local source, tests, package inspection, or documented policy.
- `VERIFIED REMOTE STATE`: reproduced through a read-only remote query; this can confirm a blocker is present and is not equivalent to completion.
- `VERIFIED PUBLISHED STATE`: reproduced from the exact public package/release/digest; this describes what exists and is not a maintainer acceptance decision.
- `PROPOSED`: recommended decision that the maintainer has not accepted.
- `PENDING MAINTAINER`: requires a dated maintainer decision or remote evidence.
- `ACCEPTED RISK`: explicit dated owner acceptance with scope and review date.
- `VERIFIED MAINTAINER`: completed remote/credentialed action with non-sensitive evidence metadata.

## Current V100 Decision Reconciliation (TASK-0232)

Reviewed on 2026-07-10 against current repository docs and read-only GitHub state.

| Area | Current V100 Status | Evidence Boundary | Remaining Evidence |
| --- | --- | --- | --- |
| Security notification ownership | VERIFIED MAINTAINER / V100-06 CLOSED | `Cynrath` primary; `ShadowFlameC` backup; fresh repository `write` permission and private reporting `enabled: true`; metadata-only coverage record | Reopen after owner/channel/support-policy change |
| V100 CLI contract | MAINTAINER DECISION RECORDED | Current shipped/documented command, JSON, schema, ID, exit, and SARIF surface is the target contract | Final-candidate acceptance |
| Runtime/support lifecycle | MAINTAINER DECISION RECORDED | .NET 10; Windows, Ubuntu/Linux, macOS; latest pre-release planned fixes; predecessor retained | Final-RC three-OS confirmation |
| Package recovery | RECOVERY OWNERSHIP RECONCILED | `Cynrath` decision owner; `Cyranth` primary NuGet identity; `ShadowFlameC` backup recovery owner; immutable-successor procedure | Recheck after owner/recovery change; no destructive test |
| Author signing | ACCEPTED RISK | 2026-06-14 bounded deferral remains in force through 2026-09-30 | Revisit by expiry or next pre-release review |
| SBOM | ACCEPTED RISK | 2026-06-14 bounded deferral remains in force through 2026-09-30 | Revisit by expiry or next pre-release review |
| Build/package provenance | VERIFIED PUBLISHED STATE / HOSTED PASS | RC1 nupkg/snupkg attestations `35295200`/`35295205` verify exact retained asset digests through run `29350091782`; immutable alpha2/alpha3/alpha4 history is not retroactively changed | Reopen after release asset or signer-workflow change |

See `docs/V100_MAINTAINER_DECISION_PACKET.md` for exact policy text and status tokens.

## Historical 2026-06-14 Evidence Register

The following table preserves the original TASK-0095/TASK-0132 baseline and its exact gate markers. TASK-0202 and TASK-0232 supersede the historical partial ownership/recovery rows for current-state decisions; the table is not the current V100 status.
| Area | Current Status | Local Evidence | Maintainer Evidence Required | RC Effect |
| --- | --- | --- | --- | --- |
| Private vulnerability reporting | VERIFIED MAINTAINER: ENABLED on 2026-06-14 | Authenticated enablement, independent GET `enabled: true`, and public Security-page entry-point verification; no advisory was created | Recheck before a future RC and after material repository ownership/security-setting changes | Complete for current repository state |
| Security notification ownership | PARTIAL MAINTAINER on 2026-06-14 | `Cynrath` is recorded as primary repository security triage owner; private channel is active | Assign and verify an independent backup owner and notification coverage; do not record reporter data | P0 blocker remains |
| Dependency vulnerability/deprecation review | VERIFIED LOCAL on 2026-06-12 | Direct/transitive vulnerability and deprecation reviews were clean after xUnit v3 migration; full suite passes 178/178 | Rerun on final candidate date and record commands, date, commit, sources reached, and result | Required fresh evidence |
| NuGet owner identity | ACCEPTED RISK on 2026-06-14 | NuGet owner/signature identity is `Cyranth`; package/project persona is `Cynrath`; alpha.2 OIDC publish succeeded | Recheck before next pre-release or 2026-09-30; do not claim shared human identity; retain OIDC-only publishing | P1 disposition complete for current scope |
| NuGet package signature | ACCEPTED RISK: author signing deferred on 2026-06-14 | Alpha.2 has a valid NuGet repository signature and no author signature; `docs/SUPPLY_CHAIN_DECISIONS.md` records rationale/controls | Revisit before next pre-release or 2026-09-30; do not claim author signing | P1 disposition complete for current scope |
| SBOM | ACCEPTED RISK: publication deferred on 2026-06-14 | Alpha.2 has no SBOM; deterministic .NET 10 generation/privacy/lifecycle are not validated | Revisit before next pre-release or 2026-09-30; retain dependency/package inspection controls | P1 disposition complete for current scope |
| Build/package provenance | VERIFIED PUBLISHED STATE / HOSTED PASS | `release.yml` attested exact RC1 nupkg and snupkg assets using `actions/attest@v4`; `gh attestation verify` passed for signer workflow; alpha2/alpha3/alpha4 remain unchanged historical evidence | Reopen after package/tag/release asset/signer workflow change | V100-09 evidence complete |
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
Security notification primary/backup owner: Cynrath / ShadowFlameC

Dependency review date and result:
Package signing decision: SIGN / DEFER
Signing evidence or accepted-risk reference:
SBOM decision: PUBLISH / DEFER
SBOM format, digest, and publication reference:
Provenance decision: ATTEST / DEFER
Attestation run, subject digest, and verification reference:
Bad-package recovery owner and accepted procedure: Cynrath primary decision owner / ShadowFlameC backup recovery owner / docs/PACKAGE_RECOVERY.md; destructive actions remain incident-only

Open risks:
Next review date:
```

## Completion Rule
Change an item to `VERIFIED MAINTAINER` only when the exact candidate commit/version, decision date, owner, and non-sensitive evidence reference are recorded. A proposal, checklist, local script result, or repository document is not remote evidence.
