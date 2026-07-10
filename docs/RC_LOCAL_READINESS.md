# Release Candidate Local Readiness

The local/remote boundary is summarized in `docs/RELEASE_BLOCKER_BOARD.md`. Local readiness evidence does not close hosted, security-setting, ownership, signing, SBOM, provenance, recovery, candidate, or approval rows.

## Decision
**LOCAL READY / REMOTE NO-GO** as of 2026-06-27 (TASK-0230 refresh).

The current source tree has local release-candidate evidence for its documented contract, localization, security regression, dependency, package, and repository-hygiene checks. This is not a release approval. TASK-0232 closes V100-06 and records V100-02/08/09 decisions, but final-candidate/hosted evidence, hosted provenance, candidate/version selection, and final maintainer sign-off remain incomplete.

Standard hosted `ci`, published-package smoke, and source-package smoke are green for commit `4c4fa64ff34287dff01818d52f49b521efb3176d`. Dedicated RC evidence run `27478635057` also passed predecessor/config/baseline/SARIF/performance validation on Windows, Ubuntu, and macOS. The remote decision remains NO-GO for the independent security, ownership, supply-chain, and final candidate approval blockers. See `docs/HOSTED_VALIDATION_STATUS.md`.

## Locally Verified Evidence
| Area | Evidence | Local Status |
| --- | --- | --- |
| Build and tests | .NET 10 restore and zero-warning Release build; 428/428 tests (TASK-0230 refresh) | VERIFIED LOCAL |
| CLI and config contracts | help/exit/config convention gates and read-only config diagnostics | VERIFIED LOCAL |
| Machine-readable contracts | command JSON schema `2`, baseline schema `1`, SARIF `2.1.0` profile, sanitized golden fixtures | VERIFIED LOCAL |
| Baseline behavior | deterministic sanitized fingerprints, integrity checks, existing/new classification, output parity | VERIFIED LOCAL |
| Localization | English/Turkish human output, known errors, exits, and language-independent JSON semantics | VERIFIED LOCAL |
| Security regression | Critical token coverage, unsuppressible Critical policy, clean self-scan and hygiene checks | VERIFIED LOCAL |
| Dependencies | direct/transitive vulnerability and deprecation reviews clean after xUnit v3 migration | VERIFIED LOCAL |
| Performance tripwire | disposable 2,000-file scan completed in 5.446 seconds (standalone) / 7.635s (RC gate) against a 30-second local threshold (TASK-0230 refresh at HEAD `583b62e`) | VERIFIED LOCAL |
| Package | local pack, isolated tool install, help, scan JSON, and package metadata verification | VERIFIED LOCAL |
| Samples and outputs | sample smoke, doctor, JSON/SARIF parse, and local release verification | VERIFIED LOCAL |

## Remaining Maintainer Evidence
| Area | Required Evidence | Status |
| --- | --- | --- |
| Hosted RC workflow | Standard 8/8 are green for `4c4fa64`; dedicated run `27478635057` passed all three operating systems | VERIFIED HOSTED; rerun for a different final candidate |
| Private vulnerability reporting | Enabled since 2026-06-14 and freshly reverified `enabled: true` on 2026-07-10 | VERIFIED MAINTAINER |
| Security notification ownership | `Cynrath` primary; `ShadowFlameC` backup; coverage and non-SLA targets recorded | V100-06 CLOSED |
| Final contract acceptance | Candidate-specific CLI/config/JSON/baseline/SARIF/localization review | PENDING MAINTAINER |
| NuGet ownership | Public owner profile `Cyranth` versus package author/project persona `Cynrath` | ACCEPTED RISK through 2026-09-30 |
| Signing | NuGet repository signing verified; author signing remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| SBOM | Publication remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| Provenance | Control implemented locally; exact hosted evidence requires the next authorized publish path | OPEN_PENDING_HOSTED_PROVENANCE_EVIDENCE |
| Package recovery | Immutable-successor procedure plus `Cynrath` decision ownership and `ShadowFlameC` backup recovery ownership | RECOVERY_OWNERSHIP_RECONCILED |
| Version and release plan | Candidate version, metadata, package diff, notes, rollback, and post-publish smoke approval | PENDING MAINTAINER |

## Open Gap Boundary
`docs/V100_GAP_ANALYSIS.md` remains the source of truth. TASK-0232 closes V100-06 from fresh evidence and records dated V100-02/08/09 decisions. A local pass still does not close any other P0 gap that requires final-candidate or hosted evidence.

The current release-candidate decision in `docs/MAINTAINER_RC_DECISION.md` remains **NO-GO for release-candidate publication**.

## Local Gate
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

The gate checks this decision boundary and invokes existing release-candidate, workflow, documentation, readiness, contract, localization, and security/supply-chain evidence checks. Use `-SkipBenchmark` only for an intermediate edit loop; final evidence requires the benchmark.

## Remote Boundary
This document and its gate do not push, dispatch hosted workflows, change GitHub settings, handle credentials or certificates, create private reports, sign packages, generate or publish SBOM/provenance, select a version, tag, create a release, or publish NuGet packages.
