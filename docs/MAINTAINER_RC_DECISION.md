# Maintainer Release-Candidate Decision

## Current Decision
**NO-GO for release-candidate publication.**

The local contract freeze, machine-readable schema assets, localization parity gate, security/supply-chain handoff, consolidated local-readiness gate, reviewed alpha.2 hosted evidence, private reporting, and bounded supply-chain dispositions are complete. Independent backup security ownership, recovery authority/backup coverage, exact alpha.3 candidate evidence, and release approval remain incomplete.

## Decision Inputs
| Area | Current State | Required For GO | Owner / Action |
| --- | --- | --- | --- |
| Local contract freeze | Complete locally | Review `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` with no unresolved breaking change | Maintainer review |
| Local tests and gates | Complete locally: 186/186 tests and clean gates | Rerun on final candidate commit | Local/CI validation |
| Hosted RC workflow | Standard 8/8 and dedicated run `27478635057` are green at `4c4fa64` on Windows, Ubuntu, and macOS | Rerun for a different final candidate commit | Release automation |
| Upgrade/config evidence | Local fixtures and hosted predecessor install/config hash/`config-check`/baseline/SARIF/final scan pass | Review and rerun for a different selected candidate | Hosted workflow |
| JSON/SARIF contract | TASK-0093 machine-readable schemas, golden fixtures, live-output tests, and local gate exist | Review the final candidate assets and rerun the contract gate | Maintainer review |
| Security reporting | Private reporting enabled; `Cynrath` primary triage owner; backup unassigned | Assign independent backup and verify coverage | Security ownership task |
| Dependency review | Clean on 2026-06-12 | Rerun on final candidate date | Maintainer/release validation |
| NuGet ownership/signing | Owner identity difference and author signing have bounded accepted-risk dispositions through 2026-09-30; valid repository signature; destructive recovery authority remains unverified | Recheck dispositions and verify recovery authority | Maintainer NuGet/supply-chain decision |
| SBOM/provenance | SBOM is bounded-deferred through 2026-09-30; provenance is implemented for the next exact GitHub Release nupkg but has no hosted publication evidence yet | Require attestation creation/verification in the next publish run | Release workflow |
| Localization parity | TASK-0094 human/error/exit/JSON parity matrix and local gate complete | Rerun on final candidate and review intended stable technical tokens | Maintainer review |
| Version and release | `0.2.0-alpha.3` selected as planning scope; metadata unchanged | Close P0 ownership blocker, prepare exact commit/package diff, and approve release plan | TASK-0134 |

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

## Remote-Write Boundary
Push, workflow dispatch, GitHub settings, private vulnerability reporting, tags, GitHub Releases, NuGet publication, signing, provenance publication, and post-publish repository changes require explicit maintainer action. This document performs none of them.
