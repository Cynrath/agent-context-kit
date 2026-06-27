# Release Candidate Local Readiness

The local/remote boundary is summarized in `docs/RELEASE_BLOCKER_BOARD.md`. Local readiness evidence does not close hosted, security-setting, ownership, signing, SBOM, provenance, recovery, candidate, or approval rows.

## Decision
**LOCAL READY / REMOTE NO-GO** as of 2026-06-27 (TASK-0230 refresh).

The current source tree has complete local release-candidate evidence for its documented contract, localization, security regression, dependency, package, and repository-hygiene checks. This is not a release approval. Hosted evidence, remote security settings, supply-chain decisions, candidate version selection, and maintainer sign-off remain incomplete.

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
| Private vulnerability reporting | Read-only API verified disabled on 2026-06-13; enable it, verify `enabled: true` and the entry point, then record date/owner/reference | VERIFIED REMOTE BLOCKER |
| Security notification ownership | Primary and backup owner confirmation | PENDING MAINTAINER |
| Final contract acceptance | Candidate-specific CLI/config/JSON/baseline/SARIF/localization review | PENDING MAINTAINER |
| NuGet ownership | Public owner profile `Cyranth` versus package author/project persona `Cynrath`; align or accept explicitly | VERIFIED REMOTE BLOCKER |
| Signing | Published package is NuGet.org repository-signed with no observed author signature; sign or defer with accepted risk | VERIFIED PUBLISHED STATE / PENDING DECISION |
| SBOM | No package/release SBOM observed; publish or defer tied to the exact candidate commit | VERIFIED PUBLISHED STATE / PENDING DECISION |
| Provenance | No accessible GitHub attestation for the published package digest; attest or defer | VERIFIED PUBLISHED STATE / PENDING DECISION |
| Package recovery | Accepted unlist/deprecate/successor ownership and communication procedure | PENDING MAINTAINER |
| Version and release plan | Candidate version, metadata, package diff, notes, rollback, and post-publish smoke approval | PENDING MAINTAINER |

## Open Gap Boundary
`docs/V100_GAP_ANALYSIS.md` remains the source of truth. A local pass does not close a P0 gap that requires hosted or remote evidence, and it does not dispose a P1 risk without a dated maintainer decision.

The current release-candidate decision in `docs/MAINTAINER_RC_DECISION.md` remains **NO-GO for release-candidate publication**.

## Local Gate
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

The gate checks this decision boundary and invokes existing release-candidate, workflow, documentation, readiness, contract, localization, and security/supply-chain evidence checks. Use `-SkipBenchmark` only for an intermediate edit loop; final evidence requires the benchmark.

## Remote Boundary
This document and its gate do not push, dispatch hosted workflows, change GitHub settings, handle credentials or certificates, create private reports, sign packages, generate or publish SBOM/provenance, select a version, tag, create a release, or publish NuGet packages.
