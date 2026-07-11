# 1.0 Readiness Gap Analysis

## Verdict
AgentContextKit is **not ready for 1.0 general availability**. `v0.2.0-alpha.4` remains the latest complete GitHub/NuGet prerelease. NuGet `1.0.0-rc.1` exists in a partial immutable state, but its tag, GitHub prerelease, and provenance are absent after TASK-0242 stopped. Existing v1.0-labelled evidence does not imply GA readiness.

## Priority Definitions
- **P0**: must be complete before a 1.0 release candidate.
- **P1**: must be complete before 1.0 general availability unless a documented maintainer decision accepts the residual risk.
- **P2**: valuable polish or adoption work that does not block 1.0 by default.

## Gap Register
| ID | Priority | Gap | Current Evidence | Owner | Done Evidence / Validation | 1.0 Blocker | Remote Write | Candidate Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance. | TASK-0240 run `29118452246` passed exact candidate baseline-aware scans, baseline count 0, frozen gates, and three-OS evidence; TASK-0241 accepts that policy for exact SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. | Core + CLI | Complete; reopen only after candidate-impacting change. | No | No | CLOSED_BY_TASK_0241 |
| V100-02 | P0 | CLI contract needs final candidate acceptance. | The conditional freeze and direct CLI gate passed locally and on all hosted runners; the post-candidate bridge is docs-only and TASK-0241 records exact-candidate maintainer acceptance. | CLI + Docs | Complete; breaking changes require a reopened freeze. | No | No | FINAL_CANDIDATE_CONTRACT_ACCEPTED / CLOSED_BY_TASK_0241 |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence and final acceptance. | Published predecessor `0.2.0-alpha.4` installed, regenerated/matched its exact fixture, returned config `valid`, migration `False`, and unchanged SHA-256 on all three runners; TASK-0241 accepts the result. | Core + CLI | Complete for this exact candidate/predecessor tuple. | No | Completed authorized dispatch | HOSTED_PREDECESSOR_CONFIG_EVIDENCE_PASS / CLOSED_BY_TASK_0241 |
| V100-04 | P0 | JSON/SARIF machine-readable contracts require final candidate acceptance. | Local schemas/golden fixtures and hosted JSON gates/SARIF parse passed for exact candidate; TASK-0241 accepts the final machine-readable contract. | Core + CLI | Complete; contract change requires versioning/migration review. | No | No | FINAL_MACHINE_CONTRACT_ACCEPTED / CLOSED_BY_TASK_0241 |
| V100-05 | P0 | Upgrade compatibility requires final-candidate acceptance. | Published alpha4 and run-unique `1.0.0-rc.1.ci.29118452246` installed; config/baseline/SARIF/final-scan upgrade flow passed on Windows, Ubuntu, and macOS and is accepted by TASK-0241. | Tests + Release | Complete for this candidate/predecessor tuple. | No | Completed authorized dispatch | HOSTED_UPGRADE_EVIDENCE_PASS / CLOSED_BY_TASK_0241 |
| V100-06 | P0 | Security response ownership and coverage. | TASK-0232 freshly verified private reporting `enabled: true`, `Cynrath` primary ownership, `ShadowFlameC` backup ownership with repository `write` permission, non-public disclosure rules, latest-pre-release fix scope, coverage path, and 3/7-business-day non-SLA targets on 2026-07-10. | Security + Maintainer | Reopen only after owner, notification, disclosure-channel, or support-policy change. | No | No | CLOSED_BY_TASK_0232 |
| V100-07 | P1 | Large-repository performance and resource limits require final-candidate hosted confirmation. | Hosted mixed corpus passed at 1.019s/45.1 MiB Windows, 0.910s/59.9 MiB Ubuntu, and 0.696s/53.8 MiB macOS against 30-second/512-MiB thresholds; local interruption/unreadable-file evidence remains green; TASK-0241 reviewed runner variance. | Core + Tests | Complete for exact candidate; retain as regression tripwire, not SLA. | No | Completed authorized dispatch | FINAL_RC_HOSTED_RESOURCE_EVIDENCE_PASS / CLOSED_BY_TASK_0241 |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation. | .NET 10 support policy is unchanged; exact candidate build/test/package/upgrade/scan passed on Windows, Ubuntu, and macOS; TASK-0241 accepts the final support scope. | Maintainer + Docs | Complete; recheck after runtime/platform policy change. | No | Completed authorized dispatch | FINAL_RC_CROSS_PLATFORM_CONFIRMATION_PASS / CLOSED_BY_TASK_0241 |
| V100-09 | P1 | Release supply-chain policy still lacks hosted provenance evidence. | TASK-0242 run `29131335084` published NuGet RC1 through OIDC but timed out verifying propagation before tag/release/provenance; one-time audit verified repository signature/commit/global install and confirmed tag/release/attestation absent. | Release + Maintainer | Preserve immutable package; require a newly authorized recovery decision before any tag/release/provenance action. | Yes | Yes, only after new explicit authorization | PARTIAL_IMMUTABLE_PUBLICATION / NUGET_VERIFIED / TAG_RELEASE_ATTESTATION_ABSENT / OPEN_PENDING_RECOVERY_DECISION_AND_PROVENANCE |
| V100-10 | P1 | Localization parity requires final candidate acceptance. | Direct localization gate passed locally and on all hosted runners; EN/TR help/error/exit behavior, JSON invariance, and stable technical tokens are accepted by TASK-0241. | Docs + CLI | Complete; reopen after localization/contract change. | No | No | FINAL_LOCALIZATION_CONTRACT_ACCEPTED / CLOSED_BY_TASK_0241 |
| V100-11 | P2 | External adoption evidence and issue feedback are limited. | Public package, samples, tutorials, issue backlog, and cross-platform smoke remain available; not required for this V100 RC boundary. | Maintainer + Community | Continue as post-V100 adoption work. | No | Yes, for future issues/discussions | DEFERRED_POST_V100 |
| V100-12 | P2 | Public presentation assets and hosted docs remain deferred. | TASK-0229 sanitized screenshot remains committed; docs-site/GitHub Pages activation remains deferred and was not changed. | Docs | Retain screenshot; any docs-site activation requires separate settings/privacy authorization. | No | Yes, for future Pages/settings | SCREENSHOT_RETAINED / DOCS_SITE_DEFERRED / GITHUB_PAGES_NOT_ACTIVATED |

## Required Sequence
1. Treat alpha2/alpha3 as historical, preserve complete immutable `v0.2.0-alpha.4`, and preserve partial immutable NuGet `1.0.0-rc.1` without republishing or fabricating tag/release/provenance evidence.
2. The v0.3 baseline/config direction from `docs/V030_ROADMAP_DECISION.md` was partially delivered in alpha3/alpha4; remaining work is tracked in the gap register above.
3. Convert the TASK-0092 conditional local freeze into a final candidate acceptance after hosted evidence and remaining schema assets are complete.
4. Complete security response, performance, support-lifecycle, and supply-chain P0/P1 evidence.
5. Publish a 1.0 release candidate and run upgrade plus cross-platform validation.
6. Resolve or explicitly accept every remaining P1 risk before 1.0 GA.

## TASK-0241 Final-Candidate Gap Summary

| Classification | Count | Gaps |
| --- | ---: | --- |
| Closed P0 | 6 | V100-01, V100-02, V100-03, V100-04, V100-05, V100-06 |
| Closed target P1 | 3 | V100-07, V100-08, V100-10 |
| Open P1 publish boundary | 1 | V100-09 |
| Deferred post-V100 | 1 | V100-11 |
| Retained presentation boundary | 1 | V100-12 |

Open P0 gaps: 0. V100-06 remains closed by TASK-0232; TASK-0241 closes V100-01 through V100-05 from exact local/hosted evidence and final acceptance. V100-09 remains open because publish-path provenance cannot exist before a separately authorized publication run.

## Post-Alpha4 V100 Cleanup (TASK-0231)

### Action Bucket Classification

| Bucket | Count | Gaps |
| --- | ---: | --- |
| LOCAL_IMPLEMENTATION_OR_TESTABLE_EVIDENCE | 1 | V100-07 |
| SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION | 3 | V100-02, V100-08, V100-09 |
| REMOTE_RELEASE_OR_HOSTED_EVIDENCE | 6 | V100-01, V100-03, V100-04, V100-05, V100-09, V100-10 |
| DOCUMENTATION_OR_PRESENTATION_FOLLOWUP | 1 | V100-12 |
| DEFERRED_POST_V100 | 1 | V100-11 |

### Key Finding

V100-06 is closed and the maintainer decisions for V100-02, V100-08, and V100-09 are recorded. TASK-0233 completes the identified local V100-07 evidence expansion; V100-07 and the other open P0/P1 gaps now require final-candidate or hosted evidence.

See `docs/tasks/TASK-0231-post-alpha4-v100-cleanup-and-next-roadmap-selection.md` for the full decision matrix and next-task recommendation.

## Readiness Gates
A future 1.0 release candidate must provide:
- zero open P0 gaps;
- a named owner and dated disposition for every P1 gap;
- clean restore/build/test/scan/doctor/sample/release gates;
- cross-platform source and published-package smoke evidence;
- upgrade compatibility evidence from the supported predecessor;
- reviewed package contents and security/privacy documentation;
- a maintainer-approved release, support, and rollback plan.

## TASK-0234 Local Source Selection

The last planned source/script/test-impacting commit in the safe/local chain is `b1604ae1e73017521d28e5a83f328bb1347406b6` from TASK-0233. It is the local V100 evidence base, not a selected release version or accepted RC. Later TASK-0234–0238 commits must remain docs/evidence/governance-only or the selection must be reopened. A future manual hosted run uses the final pushed HEAD after exact bridge review.

## TASK-0239 Candidate Selection And TASK-0240 Hosted Evidence

The exact tuple is candidate `1.0.0-rc.1`, predecessor `0.2.0-alpha.4`, and TASK-0239 candidate SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. TASK-0240 dispatched once; run `29118452246` passed the frozen CLI/config/JSON/localization gates, exact alpha4 config comparison, package upgrade, baseline/SARIF/final scan, and resource thresholds on Windows, Ubuntu, and macOS. This satisfies hosted evidence prerequisites for V100-01, V100-03, V100-04, V100-05, V100-07, V100-08, and V100-10. V100-09 provenance remains a later authorized publish-path boundary.

TASK-0240 records evidence but does not itself close acceptance-dependent gaps. TASK-0241 must evaluate and accept each one individually. Publication remains prohibited through TASK-0241.

## TASK-0238 Safe/Local Closeout

The complete local suite passed with 430/430 tests, all required V100/contract/config/JSON/localization/RC gates, Unicode temp regression guard, mixed-corpus time/memory evidence, Markdown/diff hygiene, and no tracked `.ackit/` artifacts. This is `LOCAL READY / REMOTE NO-GO` evidence. It closes no additional P0/P1 gap: final-candidate acceptance, final-RC hosted confirmation, and hosted provenance remain required exactly as recorded above.

## Status Maintenance
Each implementation task must update this register with evidence rather than marking a gap complete from documentation alone. `scripts/check-v100-readiness.ps1` verifies that this analysis and the historical readiness assets exist; it is not a substitute for closing gaps. TASK-0241 applied every done criterion to the exact candidate evidence. Publication remains separately unauthorized and V100-09 stays open until publish-path provenance exists.
