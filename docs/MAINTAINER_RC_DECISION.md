# Maintainer Release-Candidate Decision

## Current Decision
**CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK.**

Candidate `1.0.0-rc.1` is accepted against published predecessor `0.2.0-alpha.4`. TASK-0239 local/package evidence and standard CI passed for exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; TASK-0240 hosted run `29118452246` passed on Windows, Ubuntu, and macOS; the post-candidate bridge is documentation/evidence/governance-only; and TASK-0241 closes every P0 gap plus target P1 gaps V100-07, V100-08, and V100-10.

Publication authorized: No. V100-09 remains open for exact publish-path provenance. `PUBLISH AUTHORIZATION REQUIRED` is the separate TASK-0242 boundary.

## Decision Inputs
| Area | Current State | Required For GO | Owner / Action |
| --- | --- | --- | --- |
| Local contract freeze | Final candidate accepted; no unresolved breaking change and docs-only post-candidate bridge | Reopen only after candidate-impacting change | Future change control |
| Local tests and gates | TASK-0239 passed 431/431, all local gates, package/upgrade checks, and standard CI runs `29118331264`, `29118331259`, `29118331258` | Accepted | TASK-0241 |
| Hosted RC workflow | Run `29118452246` passed exact SHA on Windows job `86447580477`, Ubuntu `86447580502`, and macOS `86447580508` | Accepted | TASK-0241 |
| Upgrade/config evidence | Exact alpha4 and run-unique candidate installs; fixture match; valid/no-migration config; unchanged hash; baseline/SARIF/final scan PASS on three OS | Accepted | TASK-0241 |
| JSON/SARIF contract | TASK-0093 assets and TASK-0240 direct JSON/localization/CLI/config gates plus SARIF parse passed on three OS | Final machine contract accepted | TASK-0241 |
| Security reporting | Private reporting enabled; `Cynrath` primary; `ShadowFlameC` backup; V100-06 closed by fresh TASK-0232 evidence | Recheck after owner/channel/support-policy change | Security ownership review |
| Dependency review | Fresh 2026-07-10 vulnerable/deprecated reviews completed with available sources and no findings | Recheck at publication if external state changes | TASK-0242 if authorized |
| NuGet ownership/signing | Owner identity difference and author signing have bounded accepted-risk dispositions through 2026-09-30; valid repository signature; backup recovery ownership is reconciled | Recheck dispositions by expiry or before the next pre-release review | Maintainer NuGet/supply-chain decision |
| SBOM/provenance | SBOM is bounded-deferred through 2026-09-30; provenance is implemented for the next exact GitHub Release nupkg but has no hosted publication evidence yet | Require attestation creation/verification in the next publish run | Release workflow |
| Localization parity | TASK-0240 localization gate passed for exact candidate on all three operating systems | Final localization contract accepted | TASK-0241 |
| Version and release | `1.0.0-rc.1` accepted but unpublished; `0.2.0-alpha.4` remains published | Separate explicit publication authorization | TASK-0242 only |

## TASK-0240 Evidence Record

```text
Hosted status: HOSTED_RC_EVIDENCE_PASS
Candidate version: 1.0.0-rc.1
Candidate commit: 548b6affd0da25cb379ec1b153b1064fd5ff6f0b
Predecessor: 0.2.0-alpha.4
Hosted RC run: 29118452246
Matrix: Windows / Ubuntu / macOS SUCCESS
Tests: 431/431 on every runner
Contract/config/JSON/SARIF/localization/resource/final scan: PASS
Artifact upload: Disabled
SARIF upload: Disabled
Publication authorized: No
```

## GO Conditions
A maintainer may record GO only when:
1. The final candidate commit has a clean working tree and all local release gates pass.
2. Hosted `ci`, source-package smoke, and manual `release-candidate-evidence` are green on the supported OS matrix.
3. No P0 item in `docs/V100_GAP_ANALYSIS.md` remains open.
4. Every P1 item is complete or has a dated, owned residual-risk acceptance.
5. Private vulnerability reporting and the security contact path are verified.
6. Dependency, package content, license, artifact hygiene, and secret/PII scans are clean.
7. Signing, SBOM, provenance, rollback, and bad-package recovery decisions are recorded.
8. The candidate version, release notes, tag target, GitHub pre-release body, NuGet package, and post-publish smoke plan are reviewed.

## Conditional GO
Conditional GO means the exact candidate may enter a separately authorized OIDC publish/provenance task. It does not authorize tag creation, GitHub Release creation, NuGet publish, `release.yml` dispatch, Code Scanning/artifact upload, or repository settings changes in TASK-0241.

## NO-GO Triggers
- Any open P0 gap.
- Reduced test discovery, failing contract/upgrade/security tests, or unreviewed dependency findings.
- Breaking CLI/config/JSON/baseline/SARIF behavior without a reopened freeze and migration plan.
- Raw secrets, absolute local paths, or private data in JSON, SARIF, reports, packages, screenshots, or release assets.
- Missing hosted evidence for the final candidate commit.
- Unresolved security reporting, signing/SBOM/provenance, rollback, or package recovery decisions.
- Candidate metadata, tag target, package content, and release notes do not describe the same commit/version.

## Maintainer Decision Record

TASK-0241 is explicitly authorized to record final candidate acceptance when all exact done criteria pass. Those criteria passed.

Use `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md` for the detailed security/supply-chain evidence record and `docs/MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md` for the manual procedure.

```text
Decision: CONDITIONAL GO
Candidate version: 1.0.0-rc.1
Candidate commit: 548b6affd0da25cb379ec1b153b1064fd5ff6f0b
Decision date: 2026-07-10
Maintainer: Cynrath
Hosted RC run: 29118452246
Hosted standard runs: ci 29118331264; cross-platform-smoke 29118331259; cross-platform-source-smoke 29118331258
Open P0 gaps: 0
Open P1 boundary: V100-09 publish-path provenance
Accepted P1 risks: author signing and SBOM bounded through next pre-release review or 2026-09-30
Signing decision: repository signature required; author signing accepted-risk deferral remains active
SBOM decision: accepted-risk deferral remains active
Provenance decision: OPEN_PENDING_PUBLISH_PATH_PROVENANCE; exact attestation must be created and verified in future authorized TASK-0242
Rollback/recovery decision: immutable successor procedure and primary/backup recovery ownership accepted
Publication authorized: No
Notes: CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK; not publication, tag/release authorization, GA readiness, or provenance completion
```

## TASK-0134 Evaluation
```text
Decision: NO-GO
Candidate version: 0.2.0-alpha.3 (planning only)
Candidate commit: NOT PREPARED
Decision date: 2026-06-14
Maintainer: Cynrath
Hosted workflow runs: planning commit `eabbe6a` passed CI run `27496554495`, published smoke run `27496554487`, and source smoke run `27496554492` (8/8)
Open P0 gaps: independent backup security notification owner
Accepted P1 risks: NuGet identity, author signing, and SBOM dispositions through next prerelease review or 2026-09-30
Provenance decision: implemented for future publish; hosted evidence pending
Rollback/recovery decision: immutable successor procedure accepted; destructive NuGet authority and backup coverage pending
Notes: no metadata bump, candidate package, release dispatch, tag, GitHub Release, or NuGet publish
```

## Remote-Write Boundary
Push, workflow dispatch, GitHub settings, private vulnerability reporting, tags, GitHub Releases, NuGet publication, signing, provenance publication, and post-publish repository changes require explicit maintainer action. This document performs none of them.
