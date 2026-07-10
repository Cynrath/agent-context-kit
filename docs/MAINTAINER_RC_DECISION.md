# Maintainer Release-Candidate Decision

## Current Decision
**NO-GO pending TASK-0241 exact-candidate acceptance.**

Candidate `1.0.0-rc.1` is selected with published predecessor `0.2.0-alpha.4`. TASK-0239 local/package evidence and standard CI passed for exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. TASK-0240 hosted run `29118452246` passed on Windows, Ubuntu, and macOS. TASK-0241 must now evaluate each gap and record final candidate acceptance; hosted evidence alone does not pre-authorize publication.

Publication authorized: No. `PUBLISH AUTHORIZATION REQUIRED` remains the separate TASK-0242 boundary even if this decision later becomes conditional GO.

## Decision Inputs
| Area | Current State | Required For GO | Owner / Action |
| --- | --- | --- | --- |
| Local contract freeze | Complete locally | Review `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` with no unresolved breaking change | Maintainer review |
| Local tests and gates | TASK-0239 passed 431/431, all local gates, package/upgrade checks, and standard CI runs `29118331264`, `29118331259`, `29118331258` | Accept exact candidate evidence | TASK-0241 |
| Hosted RC workflow | Run `29118452246` passed exact SHA on Windows job `86447580477`, Ubuntu `86447580502`, and macOS `86447580508` | Accept exact hosted result | TASK-0241 |
| Upgrade/config evidence | Exact alpha4 and run-unique candidate installs; fixture match; valid/no-migration config; unchanged hash; baseline/SARIF/final scan PASS on three OS | Accept exact hosted alpha4-to-RC result | TASK-0241 |
| JSON/SARIF contract | TASK-0093 assets and TASK-0240 direct JSON/localization/CLI/config gates plus SARIF parse passed on three OS | Accept final machine contract | TASK-0241 |
| Security reporting | Private reporting enabled; `Cynrath` primary; `ShadowFlameC` backup; V100-06 closed by fresh TASK-0232 evidence | Recheck after owner/channel/support-policy change | Security ownership review |
| Dependency review | Fresh 2026-07-10 vulnerable/deprecated reviews completed with available sources and no findings | Recheck at publication if external state changes | TASK-0242 if authorized |
| NuGet ownership/signing | Owner identity difference and author signing have bounded accepted-risk dispositions through 2026-09-30; valid repository signature; backup recovery ownership is reconciled | Recheck dispositions by expiry or before the next pre-release review | Maintainer NuGet/supply-chain decision |
| SBOM/provenance | SBOM is bounded-deferred through 2026-09-30; provenance is implemented for the next exact GitHub Release nupkg but has no hosted publication evidence yet | Require attestation creation/verification in the next publish run | Release workflow |
| Localization parity | TASK-0240 localization gate passed for exact candidate on all three operating systems | Accept intended stable technical tokens | TASK-0241 |
| Version and release | `1.0.0-rc.1` selected and prepared; `0.2.0-alpha.4` remains published | Exact candidate evidence and later separate publish authorization | TASK-0239–0242 |

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
Conditional GO may authorize a dedicated release-preparation task after local and hosted evidence is complete. It does not authorize push, tag, GitHub Release, NuGet publish, Code Scanning upload, or repository settings changes by an agent.

## NO-GO Triggers
- Any open P0 gap.
- Reduced test discovery, failing contract/upgrade/security tests, or unreviewed dependency findings.
- Breaking CLI/config/JSON/baseline/SARIF behavior without a reopened freeze and migration plan.
- Raw secrets, absolute local paths, or private data in JSON, SARIF, reports, packages, screenshots, or release assets.
- Missing hosted evidence for the final candidate commit.
- Unresolved security reporting, signing/SBOM/provenance, rollback, or package recovery decisions.
- Candidate metadata, tag target, package content, and release notes do not describe the same commit/version.

## Maintainer Decision Record
Complete this section in a dedicated release task; do not prefill it from local documentation work.

Use `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md` for the detailed security/supply-chain evidence record and `docs/MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md` for the manual procedure.

```text
Decision: GO / CONDITIONAL GO / NO-GO
Candidate version:
Candidate commit:
Decision date:
Maintainer: Cynrath
Hosted workflow runs:
Open P0 gaps:
Accepted P1 risks:
Signing decision:
SBOM decision:
Provenance decision:
Rollback/recovery decision:
Notes:
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
