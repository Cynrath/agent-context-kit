# Release Candidate Local Readiness

The local/remote boundary is summarized in `docs/RELEASE_BLOCKER_BOARD.md`. Local readiness evidence does not close hosted, security-setting, ownership, signing, SBOM, provenance, recovery, candidate, or approval rows.

## Decision
**LOCAL READY / REMOTE NO-GO** as of 2026-07-10 (TASK-0238 final safe/local audit).

The current source tree has local release-candidate evidence for its documented contract, localization, security regression, dependency, package, repository-hygiene, and expanded resource checks. This is not a release approval. TASK-0232 closes V100-06 and records V100-02/08/09 decisions; TASK-0233 expands V100-07 local evidence; TASK-0234 selects source evidence base `b1604ae1e73017521d28e5a83f328bb1347406b6`; TASK-0235 prepares the conditional freeze; TASK-0236 prepares hosted inputs without dispatch. Final-candidate acceptance, hosted evidence/provenance, and final maintainer sign-off remain incomplete.

Standard hosted `ci`, published-package smoke, and source-package smoke are green for commit `4c4fa64ff34287dff01818d52f49b521efb3176d`. Dedicated RC evidence run `27478635057` also passed predecessor/config/baseline/SARIF/performance validation on Windows, Ubuntu, and macOS. The remote decision remains NO-GO for the independent security, ownership, supply-chain, and final candidate approval blockers. See `docs/HOSTED_VALIDATION_STATUS.md`.

## Locally Verified Evidence
| Area | Evidence | Local Status |
| --- | --- | --- |
| Build and tests | .NET 10 restore; zero-warning/zero-error Release build; 430/430 tests (TASK-0238) | VERIFIED LOCAL |
| CLI and config contracts | help/exit/config convention gates and read-only config diagnostics | VERIFIED LOCAL |
| Machine-readable contracts | command JSON schema `2`, baseline schema `1`, SARIF `2.1.0` profile, sanitized golden fixtures | VERIFIED LOCAL |
| Baseline behavior | deterministic sanitized fingerprints, integrity checks, existing/new classification, output parity | VERIFIED LOCAL |
| Localization | English/Turkish human output, known errors, exits, and language-independent JSON semantics | VERIFIED LOCAL |
| Security regression | Critical token coverage, unsuppressible Critical policy, clean self-scan and hygiene checks | VERIFIED LOCAL |
| Dependencies | direct/transitive vulnerability and deprecation reviews clean after xUnit v3 migration | VERIFIED LOCAL |
| Performance/resource evidence | TASK-0238 mixed 2,000-file scans passed at 5.432s/44.8 MiB through the RC gate and 4.620s/44.5 MiB standalone; TASK-0233 interruption and unreadable-file evidence remains green | VERIFIED LOCAL; HOSTED FINAL-RC CONFIRMATION PENDING |
| Package | local pack, isolated tool install, help, scan JSON, and package metadata verification | VERIFIED LOCAL |
| Samples and outputs | sample smoke, doctor, JSON/SARIF parse, and local release verification | VERIFIED LOCAL |

## Remaining Maintainer Evidence
| Area | Required Evidence | Status |
| --- | --- | --- |
| Hosted RC workflow | Inputs prepared for final pushed HEAD, candidate metadata `0.2.0-alpha.4`, predecessor `0.2.0-alpha.3`; no dispatch performed | HOSTED_INPUT_PREPARED / NOT_DISPATCHED |
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

TASK-0238 reran the complete goal-defined local suite: ACKit `0.2.0-alpha.4`, doctor 13/13, scan exit 0, restore/build/test 430/430, Unicode temp guard, all V100/contract/config/JSON/localization/RC gates, both performance invocations, 423-file Markdown link audit, completeness/diff checks, and no tracked `.ackit/` artifacts. All passed. The exact goal invocation did not request `-RunDependencyReview`; the RC gate therefore retained its explicit warning that dependency review was not freshly rerun.

The current release-candidate decision in `docs/MAINTAINER_RC_DECISION.md` remains **NO-GO for release-candidate publication**.

## Local Gate
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

The gate checks this decision boundary and invokes existing release-candidate, workflow, documentation, readiness, contract, localization, and security/supply-chain evidence checks. Use `-SkipBenchmark` only for an intermediate edit loop; final evidence requires the benchmark.

## Remote Boundary
This document and its gate do not push, dispatch hosted workflows, change GitHub settings, handle credentials or certificates, create private reports, sign packages, generate or publish SBOM/provenance, select a version, tag, create a release, or publish NuGet packages.
