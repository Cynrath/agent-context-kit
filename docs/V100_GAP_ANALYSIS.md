# 1.0 Readiness Gap Analysis

## Verdict
AgentContextKit is **not ready for 1.0 general availability**. The current published release is `v0.2.0-alpha.4`. Existing v1.0-labelled documents and scripts prove that early contract, convention, documentation, and release-gate assets exist; they do not prove long-term compatibility, production-scale performance, migration safety, or a complete support/security process.

## Priority Definitions
- **P0**: must be complete before a 1.0 release candidate.
- **P1**: must be complete before 1.0 general availability unless a documented maintainer decision accepts the residual risk.
- **P2**: valuable polish or adoption work that does not block 1.0 by default.

## Gap Register
| ID | Priority | Gap | Current Evidence | Owner | Done Evidence / Validation | 1.0 Blocker | Remote Write | Candidate Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance. | TASK-0240 run `29118452246` passed exact candidate baseline-aware final scans, baseline count 0, frozen gates, and three-OS evidence for `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. | Core + CLI | TASK-0241 record exact-candidate acceptance. | Yes | No | HOSTED_FINAL_CANDIDATE_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-02 | P0 | CLI contract needs final candidate acceptance. | The conditional freeze and direct CLI contract gate passed locally and in TASK-0240 on all three runners for exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; no unreviewed surface change followed. | CLI + Docs | TASK-0241 record maintainer acceptance. | Yes | No | MAINTAINER_DECISION_RECORDED / HOSTED_CLI_CONTRACT_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence and final acceptance. | TASK-0240 installed exact predecessor `0.2.0-alpha.4`, regenerated/matched its fixture, reported config `valid`, migration `False`, and unchanged SHA-256 on Windows, Ubuntu, and macOS. | Core + CLI | TASK-0241 accept the exact predecessor/config result. | Yes | Completed authorized dispatch | HOSTED_PREDECESSOR_CONFIG_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-04 | P0 | JSON/SARIF machine-readable contracts require final candidate acceptance. | TASK-0240 direct JSON contract gates and SARIF parse passed on Windows, Ubuntu, and macOS for the exact candidate; local schemas/golden fixtures remain green. | Core + CLI | TASK-0241 accept the final machine contract. | Yes | No | HOSTED_MACHINE_CONTRACT_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-05 | P0 | Upgrade compatibility requires final-candidate acceptance. | TASK-0240 installed published alpha4 and run-unique `1.0.0-rc.1.ci.29118452246`, then passed config/baseline/SARIF/final-scan flow on Windows, Ubuntu, and macOS. | Tests + Release | TASK-0241 accept the exact three-OS upgrade evidence. | Yes | Completed authorized dispatch | HOSTED_UPGRADE_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-06 | P0 | Security response ownership and coverage. | TASK-0232 freshly verified private reporting `enabled: true`, `Cynrath` primary ownership, `ShadowFlameC` backup ownership with repository `write` permission, non-public disclosure rules, latest-pre-release fix scope, coverage path, and 3/7-business-day non-SLA targets on 2026-07-10. | Security + Maintainer | Reopen only after owner, notification, disclosure-channel, or support-policy change. | No | No | CLOSED_BY_TASK_0232 |
| V100-07 | P1 | Large-repository performance and resource limits require final-candidate hosted confirmation. | TASK-0240 mixed corpus passed at 1.019s/45.1 MiB Windows, 0.910s/59.9 MiB Ubuntu, and 0.696s/53.8 MiB macOS against 30-second/512-MiB thresholds; local interruption/unreadable-file evidence remains green. | Core + Tests | TASK-0241 review runner variance and accept final evidence. | Yes | Completed authorized dispatch | HOSTED_FINAL_RC_RESOURCE_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_VARIANCE_ACCEPTANCE |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation. | TASK-0232 support policy is unchanged; TASK-0240 exact candidate build/test/package/upgrade/scan flow passed on Windows, Ubuntu, and macOS. | Maintainer + Docs | TASK-0241 accept final support scope. | Yes | Completed authorized dispatch | MAINTAINER_DECISION_RECORDED / HOSTED_FINAL_RC_CROSS_PLATFORM_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-09 | P1 | Release supply-chain policy still lacks hosted provenance evidence. | TASK-0232 records the OIDC/immutability/alignment/inspection/digest/signature/asset/upgrade/rollback/recovery baseline, reconciles `ShadowFlameC` backup recovery ownership, and preserves the dated author-signing/SBOM accepted risks. | Release + Maintainer | Obtain attestation creation and verification evidence on the next authorized publish path. | Yes | Yes, for provenance publication | MAINTAINER_DECISION_RECORDED / RECOVERY_OWNERSHIP_RECONCILED / ACCEPTED_RISK_RECORDED_FOR_SIGNING_AND_SBOM / OPEN_PENDING_HOSTED_PROVENANCE_EVIDENCE |
| V100-10 | P1 | Localization parity requires final candidate acceptance. | TASK-0240 direct localization gate passed on all three runners for the exact candidate; EN/TR help/error/exit behavior and JSON invariance remain aligned. | Docs + CLI | TASK-0241 accept stable technical tokens and final contract. | Yes | No | HOSTED_FINAL_LOCALIZATION_EVIDENCE_PASS / OPEN_PENDING_TASK_0241_ACCEPTANCE |
| V100-11 | P2 | External adoption evidence and issue feedback are limited. | Public package, samples, tutorials, issue backlog, cross-platform smoke. Alpha4 published package extends adoption surface. | Maintainer + Community | Reviewed external-repository trials, triaged feedback, known-limitations update, accepted residual-risk record. | No | Yes, for issues/discussions | UNCHANGED_OPEN |
| V100-12 | P2 | Public presentation assets and hosted docs remain deferred. | Visual policy, screenshot plan, docs-site plan. Alpha4 README is updated. TASK-0229 committed a sanitized Web UI dashboard screenshot at `docs/assets/screenshots/ackit-webui-preview-alpha4.webp`. Docs-site/GitHub Pages remain deferred. | Docs | Sanitized screenshots and/or approved docs-site activation after privacy review. A first sanitized asset is committed; hosted docs-site activation remains maintainer-only. | No | Yes, for Pages/settings | POTENTIALLY_CLOSABLE_LOCAL_ONLY -- first screenshot asset captured and committed via TASK-0229 |

## Required Sequence
1. Treat the scoped `v0.2.0-alpha.2` hardening release as historical and maintain the current `v0.2.0-alpha.4` published state without mutating immutable release artifacts.
2. The v0.3 baseline/config direction from `docs/V030_ROADMAP_DECISION.md` was partially delivered in alpha3/alpha4; remaining work is tracked in the gap register above.
3. Convert the TASK-0092 conditional local freeze into a final candidate acceptance after hosted evidence and remaining schema assets are complete.
4. Complete security response, performance, support-lifecycle, and supply-chain P0/P1 evidence.
5. Publish a 1.0 release candidate and run upgrade plus cross-platform validation.
6. Resolve or explicitly accept every remaining P1 risk before 1.0 GA.

## Post-Alpha4 Gap Summary

| Classification | Count | Gaps |
| --- | ---: | --- |
| PARTIALLY_ADVANCED_BY_ALPHA4 | 6 | V100-01, V100-03, V100-04, V100-05, V100-07, V100-10 |
| MAINTAINER_DECISION_RECORDED / OPEN | 3 | V100-02, V100-08, V100-09 |
| CLOSED_BY_TASK_0232 | 1 | V100-06 |
| UNCHANGED_OPEN | 1 | V100-11 (adoption feedback) |
| POTENTIALLY_CLOSABLE_LOCAL_ONLY | 1 | V100-12 (public presentation / screenshots) |

V100-06 is closed by fresh TASK-0232 evidence; the other P0 gaps remain open. Alpha4 publication alone did not close a gap. TASK-0232 records decisions without substituting for final-candidate or hosted evidence.

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
Each implementation task must update this register with evidence rather than marking a gap complete from documentation alone. `scripts/check-v100-readiness.ps1` verifies that this analysis and the historical readiness assets exist; it is not a substitute for closing the gaps. TASK-0240 hosted evidence passed but leaves acceptance-dependent gaps open until TASK-0241 applies each stated done criterion individually.
