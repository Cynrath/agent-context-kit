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
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance. | TASK-0128 run `27478635057` passed predecessor/config/baseline/SARIF evidence on all three operating systems for exact alpha.2 state `4c4fa64`. TASK-0219 run `28208545684` passed alpha4 hosted RC baseline/SARIF checks. Published `0.2.0-alpha.4` package includes baseline workflow and is verified. TASK-0230 confirmed `ackit scan --ci` exits 0 at HEAD `583b62e` with expected Medium/Low findings; `check-v100-readiness.ps1 -FailOnIssues` and `check-v100-documentation-release-gates.ps1 -FailOnIssues` both pass. | Core + CLI | Freeze the final RC policy against the selected candidate commit. | Yes | No | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-02 | P0 | CLI contract needs final candidate acceptance. | TASK-0232 records the current shipped/documented commands/options, JSON/schema/command identifiers, rule/diagnostic IDs, exit semantics, and SARIF profile as the V100 target contract; localized human text is not byte-for-byte stable. TASK-0235 refreshes the conditional local freeze against source base `b1604ae1e73017521d28e5a83f328bb1347406b6` and reruns focused gates. | CLI + Docs | Rerun against the final pushed candidate and record final acceptance. | Yes | No | MAINTAINER_DECISION_RECORDED / LOCAL_FREEZE_PREPARED / OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence and final acceptance. | Published `0.2.0-alpha.4` includes read-only `config-check`. TASK-0239 generated the exact alpha4 config twice, froze `v0.2.0-alpha.4-config.yml`, retained alpha1 history, and made the hosted workflow regenerate/compare alpha4 config before candidate hash/no-migration checks. | Core + CLI | TASK-0240 exact three-OS predecessor/config pass and TASK-0241 acceptance. | Yes | Authorized dispatch only | CANDIDATE_PREPARED / OPEN_PENDING_HOSTED_PREDECESSOR_CONFIG_EVIDENCE |
| V100-04 | P0 | JSON/SARIF machine-readable contracts require final candidate acceptance. | TASK-0093 adds Draft 2020-12 command/baseline/SARIF profile schemas, sanitized golden fixtures, live-output coverage, and a local gate. Published `0.2.0-alpha.4` includes `ackit sarif`. TASK-0230 confirmed `ackit sarif --json` generates valid SARIF at HEAD `583b62e`. `check-json-contract-assets.ps1 -FailOnIssues` passes: all 3 schemas parse, both golden fixtures validate, command schema covers all 13 JSON-capable commands. | Core + CLI | Review the final candidate assets, rerun the contract gate, and approve the schema/version migration policy. | Yes | No | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-05 | P0 | Upgrade compatibility requires final-candidate acceptance. | TASK-0239 selects real candidate `1.0.0-rc.1`, exact published predecessor `0.2.0-alpha.4`, a run-unique candidate package, and the three-OS install/config/baseline/SARIF flow. Historical alpha2/alpha3/alpha4 evidence remains exact-commit scoped. | Tests + Release | TASK-0240 exact three-OS upgrade pass and TASK-0241 acceptance. | Yes | Authorized dispatch only | CANDIDATE_PREPARED / OPEN_PENDING_HOSTED_UPGRADE_EVIDENCE |
| V100-06 | P0 | Security response ownership and coverage. | TASK-0232 freshly verified private reporting `enabled: true`, `Cynrath` primary ownership, `ShadowFlameC` backup ownership with repository `write` permission, non-public disclosure rules, latest-pre-release fix scope, coverage path, and 3/7-business-day non-SLA targets on 2026-07-10. | Security + Maintainer | Reopen only after owner, notification, disclosure-channel, or support-policy change. | No | No | CLOSED_BY_TASK_0232 |
| V100-07 | P1 | Large-repository performance and resource limits require final-candidate hosted confirmation. | TASK-0233 local mixed 2,000-file corpus passed in 5.185s with 44.6 MiB peak working set; interruption left no `.ackit/` output/source mutation; unreadable-file behavior and script contract tests passed 2/2. Historical three-OS timing remains exact-commit evidence. | Core + Tests | Rerun the expanded mixed-corpus/time/memory tripwire on the selected final RC and review runner variance. | Yes | Yes, to dispatch | LOCAL_EVIDENCE_EXPANDED / OPEN_PENDING_FINAL_RC_HOSTED_CONFIRMATION |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation. | TASK-0232 approves .NET 10; Windows, Ubuntu/Linux, and macOS; latest-pre-release planned fixes; predecessor upgrade/rollback retention; migration notes for breaking pre-1.0 changes; and the documented unsupported surfaces. | Maintainer + Docs | Rerun on the selected final RC across all supported operating systems. | Yes | Yes, to dispatch | MAINTAINER_DECISION_RECORDED / OPEN_PENDING_FINAL_RC_CROSS_PLATFORM_CONFIRMATION |
| V100-09 | P1 | Release supply-chain policy still lacks hosted provenance evidence. | TASK-0232 records the OIDC/immutability/alignment/inspection/digest/signature/asset/upgrade/rollback/recovery baseline, reconciles `ShadowFlameC` backup recovery ownership, and preserves the dated author-signing/SBOM accepted risks. | Release + Maintainer | Obtain attestation creation and verification evidence on the next authorized publish path. | Yes | Yes, for provenance publication | MAINTAINER_DECISION_RECORDED / RECOVERY_OWNERSHIP_RECONCILED / ACCEPTED_RISK_RECORDED_FOR_SIGNING_AND_SBOM / OPEN_PENDING_HOSTED_PROVENANCE_EVIDENCE |
| V100-10 | P1 | Localization parity requires final candidate acceptance. | TASK-0094 adds localized CLI chrome, a multilingual human/error/exit/JSON parity matrix, tutorial/troubleshooting review, and a local release gate. Alpha4 CLI surface is unchanged from parity-gate review. TASK-0230 confirmed `check-localization-parity.ps1 -FailOnIssues` passes at HEAD `583b62e`: Turkish help smoke, Turkish JSON invariance, all 13 command signatures present in both locales. | Docs + CLI | Rerun the localization gate on the final candidate and approve the intentionally stable technical tokens. | Yes | No | PARTIALLY_ADVANCED_BY_ALPHA4 |
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

## TASK-0239 Candidate Selection And Hosted Input Preparation

The exact manual RC tuple is candidate `1.0.0-rc.1`, predecessor `0.2.0-alpha.4`, and the full TASK-0239 candidate SHA after its push. No workflow is dispatched by TASK-0239 and no run ID/result is claimed. The workflow now runs the frozen CLI/config/JSON/localization gates directly and validates exact alpha4-generated config. It covers the hosted boundaries for V100-01, V100-03, V100-04, V100-05, V100-07, V100-08, and V100-10. V100-09 provenance remains a later authorized publish-path boundary.

TASK-0239 selects the candidate but closes no additional gap. Publication remains prohibited through TASK-0241.

## TASK-0238 Safe/Local Closeout

The complete local suite passed with 430/430 tests, all required V100/contract/config/JSON/localization/RC gates, Unicode temp regression guard, mixed-corpus time/memory evidence, Markdown/diff hygiene, and no tracked `.ackit/` artifacts. This is `LOCAL READY / REMOTE NO-GO` evidence. It closes no additional P0/P1 gap: final-candidate acceptance, final-RC hosted confirmation, and hosted provenance remain required exactly as recorded above.

## Status Maintenance
Each implementation task must update this register with evidence rather than marking a gap complete from documentation alone. `scripts/check-v100-readiness.ps1` verifies that this analysis and the historical readiness assets exist; it is not a substitute for closing the gaps. TASK-0239 selects and prepares `1.0.0-rc.1` with exact alpha4 predecessor evidence but closes no gap before hosted execution. TASK-0240 and TASK-0241 must apply each stated done criterion individually.
