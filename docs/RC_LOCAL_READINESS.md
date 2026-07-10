# Release Candidate Local Readiness

The local/remote boundary is summarized in `docs/RELEASE_BLOCKER_BOARD.md`. Local readiness evidence does not close hosted, security-setting, ownership, signing, SBOM, provenance, recovery, candidate, or approval rows.

## Decision
**FINAL CANDIDATE ACCEPTED / CONDITIONAL GO / PUBLICATION NO-GO** as of 2026-07-10 (TASK-0241).

The current source tree selects `1.0.0-rc.1` with published predecessor `0.2.0-alpha.4` and preserves the documented contract, localization, security, and resource boundaries. TASK-0239 local/package/standard evidence and TASK-0240 exact hosted run `29118452246` pass; TASK-0241 accepts the final candidate. `LOCAL READY / REMOTE NO-GO` now means publication remains outside this task despite conditional acceptance.

Exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` passed standard runs `29118331264`, `29118331259`, and `29118331258`, plus dedicated RC run `29118452246` on Windows, Ubuntu, and macOS. See `docs/HOSTED_VALIDATION_STATUS.md`.

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
| Performance/resource evidence | TASK-0239 local results plus TASK-0240 Windows 1.019s/45.1 MiB, Ubuntu 0.910s/59.9 MiB, macOS 0.696s/53.8 MiB; interruption/unreadable-file local evidence remains green | FINAL RC HOSTED RESOURCE EVIDENCE ACCEPTED |
| Package | RC1 nupkg/snupkg metadata/content/hygiene, isolated install/help/version, alpha4 config upgrade, baseline, and SARIF verification | VERIFIED LOCAL; DISPOSABLE ARTIFACTS REMOVED |
| Samples and outputs | sample smoke, doctor, JSON/SARIF parse, and local release verification | VERIFIED LOCAL |

## Remaining Maintainer Evidence
| Area | Required Evidence | Status |
| --- | --- | --- |
| Hosted RC workflow | Exact SHA, candidate, predecessor, three-OS package/config/baseline/SARIF/resource evidence | HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED |
| Private vulnerability reporting | Enabled since 2026-06-14 and freshly reverified `enabled: true` on 2026-07-10 | VERIFIED MAINTAINER |
| Security notification ownership | `Cynrath` primary; `ShadowFlameC` backup; coverage and non-SLA targets recorded | V100-06 CLOSED |
| Final contract acceptance | Candidate-specific CLI/config/JSON/baseline/SARIF/localization review | FINAL_CANDIDATE_CONTRACT_ACCEPTED; historical `PENDING MAINTAINER` boundary resolved by TASK-0241 |
| NuGet ownership | Public owner profile `Cyranth` versus package author/project persona `Cynrath` | ACCEPTED RISK through 2026-09-30 |
| Signing | NuGet repository signing verified; author signing remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| SBOM | Publication remains bounded-deferred | ACCEPTED RISK through 2026-09-30 |
| Provenance | Control implemented locally; exact evidence requires the next authorized publish path | OPEN_PENDING_PUBLISH_PATH_PROVENANCE |
| Package recovery | Immutable-successor procedure plus `Cynrath` decision ownership and `ShadowFlameC` backup recovery ownership | RECOVERY_OWNERSHIP_RECONCILED |
| Version and release plan | `1.0.0-rc.1` selected; plan/body/rollback/post-publish validation prepared; publication remains separate | PREPARED / PUBLICATION NOT AUTHORIZED |

## Open Gap Boundary
`docs/V100_GAP_ANALYSIS.md` remains the source of truth. Open P0 gaps are 0. V100-01 through V100-05, V100-07, V100-08, and V100-10 close by TASK-0241; V100-06 remains closed; V100-09 remains open pending publish-path provenance.

TASK-0239 reran the complete candidate suite: installed ACKit `0.2.0-alpha.4`, doctor 13/13, scan exit 0, source CLI `1.0.0-rc.1`, restore/build/test 431/431, Unicode temp guard, all V100/contract/config/JSON/localization/security/RC gates, fresh dependency review, both performance invocations, 428-file Markdown link audit, and package/install/upgrade evidence. TASK-0240 then confirmed the exact candidate on all three hosted operating systems.

The current decision is **CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK**. Publication authorized: No.

## Local Gate
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

The gate checks this decision boundary and invokes existing release-candidate, workflow, documentation, readiness, contract, localization, and security/supply-chain evidence checks. Use `-SkipBenchmark` only for an intermediate edit loop; final evidence requires the benchmark.

## Remote Boundary
This document and its gate do not push, dispatch hosted workflows, change GitHub settings, handle credentials or certificates, create private reports, sign packages, generate or publish SBOM/provenance, select a version, tag, create a release, or publish NuGet packages.
