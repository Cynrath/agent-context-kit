# 1.0 Readiness Gap Analysis

## Verdict
AgentContextKit is **not ready for 1.0 general availability**. The current published release is `v0.2.0-alpha.2`. Existing v1.0-labelled documents and scripts prove that early contract, convention, documentation, and release-gate assets exist; they do not prove long-term compatibility, production-scale performance, migration safety, or a complete support/security process.

## Priority Definitions
- **P0**: must be complete before a 1.0 release candidate.
- **P1**: must be complete before 1.0 general availability unless a documented maintainer decision accepts the residual risk.
- **P2**: valuable polish or adoption work that does not block 1.0 by default.

## Gap Register
| ID | Priority | Gap | Current Evidence | Owner | Done Evidence / Validation | 1.0 Blocker | Remote Write |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance. | TASK-0128 run `27478635057` passed predecessor/config/baseline/SARIF evidence on all three operating systems for exact alpha.2 state `4c4fa64`; the policy must be rerun for a different final candidate. | Core + CLI | Freeze the final RC policy against the selected candidate commit. | Yes | No |
| V100-02 | P0 | CLI contract needs final candidate acceptance. | Help, exit-code docs, contract tests, and the TASK-0092 conditional local freeze exist. | CLI + Docs | Review the final candidate command/option/invalid-invocation surface and record maintainer sign-off. | Yes | No |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence and final acceptance. | TASK-0085/0089 implement deterministic read-only diagnostics; TASK-0092 conditionally freezes schema `1` and no-auto-migration behavior. | Core + CLI | Run hosted predecessor-config smoke and approve the contract for the selected RC. | Yes | No |
| V100-04 | P0 | JSON/SARIF machine-readable contracts require final candidate acceptance. | TASK-0093 adds Draft 2020-12 command/baseline/SARIF profile schemas, sanitized golden fixtures, live-output coverage, and a local gate. | Core + CLI | Review the final candidate assets, rerun the contract gate, and approve the schema/version migration policy. | Yes | No |
| V100-05 | P0 | Upgrade compatibility requires final-candidate acceptance. | TASK-0128 run `27478635057` passed isolated predecessor/source-candidate upgrade evidence on Windows, Ubuntu, and macOS for exact alpha.2 state `4c4fa64`. | Tests + Release | Rerun and approve the upgrade path for the selected final RC. | Yes | Yes, to dispatch |
| V100-06 | P0 | Security response process lacks complete notification ownership. | Private GitHub vulnerability reporting was enabled and independently verified on 2026-06-14; primary and backup notification ownership remains open. | Security + Maintainer | Record primary/backup owners, response coverage, review date, and non-sensitive evidence reference. | Yes | Possibly, for notification settings/contact |
| V100-07 | P1 | Large-repository performance and resource limits need broader evidence. | TASK-0128's 2,000-file hosted tripwire passed in 1.265s Windows, 0.957s Ubuntu, and 0.684s macOS; memory, cancellation, and mixed-corpus evidence remain limited. | Core + Tests | Review memory, cancellation, and mixed-corpus behavior and rerun on the final RC. | Yes | Yes, to dispatch |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation. | .NET 10 lifecycle policy exists; standard and dedicated RC workflows passed Windows, Ubuntu, and macOS at `4c4fa64`. | Maintainer + Docs | Approve the final support duration and rerun on the selected RC. | Yes | Yes, to dispatch |
| V100-09 | P1 | Release supply-chain policy still lacks signing/SBOM/provenance and complete recovery decisions. | TASK-0131 records a bounded NuGet owner-identity accepted risk through 2026-09-30; repository signature exists, but author signing, SBOM, provenance, destructive recovery authority, and backup ownership remain. | Release + Maintainer | Record owned signing, SBOM, provenance, recovery, and residual-risk decisions; perform only approved remote actions. | Yes | Yes, for signing/provenance publication or recovery actions |
| V100-10 | P1 | Localization parity requires final candidate acceptance. | TASK-0094 adds localized CLI chrome, a 13-command English/Turkish human/error/exit/JSON parity matrix, tutorial/troubleshooting review, and a local release gate. | Docs + CLI | Rerun the localization gate on the final candidate and approve the intentionally stable technical tokens. | Yes | No |
| V100-11 | P2 | External adoption evidence and issue feedback are limited. | Public package, samples, tutorials, issue backlog, cross-platform smoke. | Maintainer + Community | Reviewed external-repository trials, triaged feedback, known-limitations update, accepted residual-risk record. | No | Yes, for issues/discussions |
| V100-12 | P2 | Public presentation assets and hosted docs remain deferred. | Visual policy, screenshot plan, docs-site plan. | Docs | Sanitized screenshots and/or approved docs-site activation after privacy review. | No | Yes, for Pages/settings |

## Required Sequence
1. Complete the scoped `v0.2.0-alpha.2` hardening release or explicitly supersede it.
2. Implement the v0.3 baseline/config direction from `docs/V030_ROADMAP_DECISION.md`.
3. Convert the TASK-0092 conditional local freeze into a final candidate acceptance after hosted evidence and remaining schema assets are complete.
4. Complete security response, performance, support-lifecycle, and supply-chain P0/P1 evidence.
5. Publish a 1.0 release candidate and run upgrade plus cross-platform validation.
6. Resolve or explicitly accept every remaining P1 risk before 1.0 GA.

## Readiness Gates
A future 1.0 release candidate must provide:
- zero open P0 gaps;
- a named owner and dated disposition for every P1 gap;
- clean restore/build/test/scan/doctor/sample/release gates;
- cross-platform source and published-package smoke evidence;
- upgrade compatibility evidence from the supported predecessor;
- reviewed package contents and security/privacy documentation;
- a maintainer-approved release, support, and rollback plan.

## Status Maintenance
Each implementation task must update this register with evidence rather than marking a gap complete from documentation alone. `scripts/check-v100-readiness.ps1` verifies that this analysis and the historical readiness assets exist; it is not a substitute for closing the gaps.
