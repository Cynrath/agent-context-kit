# Release Candidate Local Readiness

The local/remote boundary is summarized in `docs/RELEASE_BLOCKER_BOARD.md`. Local readiness evidence does not close hosted, security-setting, ownership, signing, SBOM, provenance, recovery, candidate, or approval rows.

## Decision
**LOCAL READY / REMOTE NO-GO** as of 2026-07-10 (TASK-0239).

The current source tree selects `1.0.0-rc.1` with published predecessor `0.2.0-alpha.4` and preserves the documented contract, localization, security, and resource boundaries. TASK-0239 exact predecessor config evidence, direct hosted contract gates, candidate package preparation, fresh dependency review, and the complete local gate set pass. This is not release approval; exact-candidate standard CI, hosted evidence, final acceptance, and publish-path provenance remain incomplete.

Standard hosted `ci`, published-package smoke, and source-package smoke are green for commit `4c4fa64ff34287dff01818d52f49b521efb3176d`. Dedicated RC evidence run `27478635057` also passed predecessor/config/baseline/SARIF/performance validation on Windows, Ubuntu, and macOS. The remote decision remains NO-GO for the independent security, ownership, supply-chain, and final candidate approval blockers. See `docs/HOSTED_VALIDATION_STATUS.md`.

## Locally Verified Evidence
| Area | Evidence | Local Status |
| --- | --- | --- |
| Build and tests | .NET 10 restore; zero-warning/zero-error Release build; 431/431 tests (TASK-0239) | VERIFIED LOCAL |
| CLI and config contracts | help/exit/config convention gates and read-only config diagnostics | VERIFIED LOCAL |
| Machine-readable contracts | command JSON schema `2`, baseline schema `1`, SARIF `2.1.0` profile, sanitized golden fixtures | VERIFIED LOCAL |
| Baseline behavior | deterministic sanitized fingerprints, integrity checks, existing/new classification, output parity | VERIFIED LOCAL |
| Localization | English/Turkish human output, known errors, exits, and language-independent JSON semantics | VERIFIED LOCAL |
| Security regression | Critical token coverage, unsuppressible Critical policy, clean self-scan and hygiene checks | VERIFIED LOCAL |
| Dependencies | Fresh 2026-07-10 review: no vulnerable direct/transitive package and no deprecated package; sources available | VERIFIED LOCAL |
| Performance/resource evidence | TASK-0239 mixed 2,000-file scans passed at 5.691s/45.1 MiB through the RC gate and 4.193s/44.6 MiB standalone; TASK-0233 interruption and unreadable-file evidence remains green | VERIFIED LOCAL; HOSTED FINAL-RC CONFIRMATION PENDING |
| Package | RC1 nupkg/snupkg metadata/content/hygiene, isolated install/help/version, alpha4 config upgrade, baseline, and SARIF verification | VERIFIED LOCAL; DISPOSABLE ARTIFACTS REMOVED |
| Samples and outputs | sample smoke, doctor, JSON/SARIF parse, and local release verification | VERIFIED LOCAL |

## Remaining Maintainer Evidence
| Area | Required Evidence | Status |
| --- | --- | --- |
| Hosted RC workflow | Exact TASK-0239 pushed SHA, candidate `1.0.0-rc.1`, predecessor `0.2.0-alpha.4`; one dispatch authorized only after standard CI | CANDIDATE_INPUT_PREPARED / NOT_DISPATCHED |
| Private vulnerability reporting | Enabled since 2026-06-14 and freshly reverified `enabled: true` on 2026-07-10 | VERIFIED MAINTAINER |
| Security notification ownership | `Cynrath` primary; `ShadowFlameC` backup; coverage and non-SLA targets recorded | V100-06 CLOSED |
| Final contract acceptance | Candidate-specific CLI/config/JSON/baseline/SARIF/localization review | PENDING MAINTAINER |
| NuGet ownership | Public owner profile `Cyranth` versus package author/project persona `Cynrath` | ACCEPTED RISK through 2026-09-30 |
| Signing | NuGet repository signing verified; author signing remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| SBOM | Publication remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| Provenance | Control implemented locally; exact hosted evidence requires the next authorized publish path | OPEN_PENDING_HOSTED_PROVENANCE_EVIDENCE |
| Package recovery | Immutable-successor procedure plus `Cynrath` decision ownership and `ShadowFlameC` backup recovery ownership | RECOVERY_OWNERSHIP_RECONCILED |
| Version and release plan | `1.0.0-rc.1` selected; plan/body/rollback/post-publish validation prepared; publication remains separate | PREPARED / PUBLICATION NOT AUTHORIZED |

## Open Gap Boundary
`docs/V100_GAP_ANALYSIS.md` remains the source of truth. TASK-0232 closes V100-06 from fresh evidence and records dated V100-02/08/09 decisions. A local pass still does not close any other P0 gap that requires final-candidate or hosted evidence.

TASK-0239 reran the complete candidate suite: installed ACKit `0.2.0-alpha.4`, doctor 13/13, scan exit 0, source CLI `1.0.0-rc.1`, restore/build/test 431/431, Unicode temp guard, all V100/contract/config/JSON/localization/security/RC gates, fresh dependency review, both performance invocations, 428-file Markdown link audit, and package/install/upgrade evidence. All passed; candidate commit and hosted standard/RC evidence remain pending.

The current decision remains pre-hosted **NO-GO**. Publication authorized: No. TASK-0241 may record only conditional acceptance for a separately authorized publish task.

## Local Gate
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

The gate checks this decision boundary and invokes existing release-candidate, workflow, documentation, readiness, contract, localization, and security/supply-chain evidence checks. Use `-SkipBenchmark` only for an intermediate edit loop; final evidence requires the benchmark.

## Remote Boundary
This document and its gate do not push, dispatch hosted workflows, change GitHub settings, handle credentials or certificates, create private reports, sign packages, generate or publish SBOM/provenance, select a version, tag, create a release, or publish NuGet packages.
