# TASK-0231: post-alpha4 V100 cleanup and next roadmap selection

## Purpose

Create a clean post-alpha4 planning/roadmap checkpoint after TASK-0227 (docs reset), TASK-0228 (gap classification), TASK-0229 (screenshot asset), and TASK-0230 (gate refresh). Classify remaining V100 gaps into actionable buckets and select the next concrete roadmap path.

## Scope

- Classify all 12 V100 gaps into actionable buckets.
- Write a remaining-gap decision matrix.
- Update V100_GAP_ANALYSIS.md with bucket classifications.
- Update ROADMAP.md to reflect TASK-0228/0229/0230 progress and recommend the next track.
- Update NEXT_TASKS.md and .codex handoff files for TASK-0231 as current.
- Select the next roadmap path explicitly.

## Out of scope

- Closing P0/P1 gaps without exact evidence.
- Feature implementation, code changes, version bump, tag, release, NuGet.
- GitHub issue creation, workflow dispatch.
- Claiming 1.0 readiness.

## Post-Alpha4 V100 Status Summary

All 12 V100 gaps remain open. No P0/P1 gap was closed by alpha4 publication, TASK-0228, TASK-0229, or TASK-0230 alone.

### Bucket Definitions

| Bucket | Meaning | Action Required |
| --- | --- | --- |
| LOCAL_IMPLEMENTATION_OR_TESTABLE_EVIDENCE | Gap can be advanced/closed with local code changes or test evidence only. No remote write required. | Maintainer-driven local implementation task |
| SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION | Gap requires a named human decision, security setting, or supply-chain action. | Maintainer decision or explicit permission |
| REMOTE_RELEASE_OR_HOSTED_EVIDENCE | Gap requires hosted workflow dispatch, release write, or remote CI evidence. | Maintainer dispatch of hosted workflow |
| DOCUMENTATION_OR_PRESENTATION_FOLLOWUP | Gap can be advanced with docs/presentation/asset work. | Docs task |
| DEFERRED_POST_V100 | Gap is intentionally deferred until after a future milestone. | Not actionable now |

### Remaining Gap Decision Matrix

| Gap ID | Priority | Current Status | Evidence Strengthened | Why It Remains Open | Required Next Evidence or Decision | Bucket |
| --- | --- | --- | --- | --- | --- | --- |
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance | TASK-0230: `scan --ci` exits 0, both V100 presence gates pass at HEAD `583b62e` | Final-candidate acceptance requires maintainer to select and freeze the RC commit | Select a final RC candidate and rerun hosted RC evidence | REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-02 | P0 | CLI contract needs final candidate acceptance | TASK-0230: `check-cli-contract -FailOnIssues` PASS, all 13 commands verified | Final-candidate CLI surface review and maintainer sign-off pending | Record maintainer sign-off on current surface or select RC candidate | SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence | TASK-0230: `config-check --json` returns schemaVersion 1, 0 diagnostics | Hosted predecessor-config smoke not yet run for final candidate | Dispatch hosted RC evidence for the selected final candidate | REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-04 | P0 | JSON/SARIF contracts need final candidate acceptance | TASK-0230: `check-json-contract-assets` PASS, SARIF generated | Final-candidate contract gate rerun and schema migration policy approval pending | Rerun contract gate on selected RC and approve | REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-05 | P0 | Upgrade compatibility needs final-candidate acceptance | Alpha4 OIDC publish proved `0.2.0-alpha.3` -> `0.2.0-alpha.4` upgrade on all 3 OS | Final-candidate upgrade path rerun not yet done | Dispatch hosted upgrade evidence for selected RC | REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-06 | P0 | Security response lacks complete notification ownership | TASK-0202: primary/backup recorded; no change from alpha4 | Backup owner recorded but not independently verified as active; maintainer sign-off pending | Record dated maintainer decision on notification ownership completeness | SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION |
| V100-07 | P1 | Large-repository performance needs broader evidence | TASK-0230: 5.446s standalone / 7.635s RC gate, well under 30s threshold | Memory, cancellation, and mixed-corpus evidence still limited | Add memory/cancellation/mixed-corpus performance tests | LOCAL_IMPLEMENTATION_OR_TESTABLE_EVIDENCE |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation | Alpha4 published and cross-platform verified on all 3 OS | Final support duration and lifecycle approval not yet obtained | Approve final support duration for selected RC | SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION |
| V100-09 | P1 | Release supply-chain lacks hosted provenance and complete recovery | TASK-0132 defers signing/SBOM through 2026-09-30; alpha4 same limitation | Provenance evidence only obtainable on next publish; recovery ownership needs confirmation | Next publish proves provenance; obtain recovery ownership confirmation | SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION / REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-10 | P1 | Localization parity needs final candidate acceptance | TASK-0230: `check-localization-parity` PASS, en/tr verified | Final-candidate localization gate rerun and technical token approval pending | Rerun localization gate on selected RC and approve | REMOTE_RELEASE_OR_HOSTED_EVIDENCE |
| V100-11 | P2 | External adoption evidence limited | Alpha4 published package extends adoption surface | No real external feedback received yet | Wait for user feedback or conduct external trials | DEFERRED_POST_V100 |
| V100-12 | P2 | Public presentation assets deferred | TASK-0229: sanitized screenshot committed at `docs/assets/screenshots/ackit-webui-preview-alpha4.webp` | Docs-site/GitHub Pages remains deferred; screenshot asset done | Docs-site activation is maintainer-only; no further local action | DOCUMENTATION_OR_PRESENTATION_FOLLOWUP |

### Bucket Summary

| Bucket | Count | Gaps |
| --- | ---: | --- |
| LOCAL_IMPLEMENTATION_OR_TESTABLE_EVIDENCE | 1 | V100-07 |
| SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION | 4 | V100-02, V100-06, V100-08, V100-09 |
| REMOTE_RELEASE_OR_HOSTED_EVIDENCE | 6 | V100-01, V100-03, V100-04, V100-05, V100-09, V100-10 |
| DOCUMENTATION_OR_PRESENTATION_FOLLOWUP | 1 | V100-12 |
| DEFERRED_POST_V100 | 1 | V100-11 |

### Key Finding

- Only **1 gap** (V100-07, P1 performance) is truly `LOCAL_IMPLEMENTATION_OR_TESTABLE_EVIDENCE` -- local-only work that could advance a P1 gap.
- **4 gaps** require a `SECURITY_SUPPLY_CHAIN_MAINTAINER_DECISION` -- human sign-off or explicit risk acceptance.
- **6 gaps** require `REMOTE_RELEASE_OR_HOSTED_EVIDENCE` -- hosted workflow dispatch against a selected RC candidate.
- V100-12 is already advanced by TASK-0229 screenshot; docs-site deferred.
- V100-11 is deferred pending external feedback.

The majority of remaining P0/P1 work is blocked on **maintainer decisions and remote evidence**, not local implementation.

## Next Roadmap Selection

### Options Considered

**Option A: V100 final-candidate prep focused on closeable P0/P1 gaps**
Would pick the only `LOCAL_IMPLEMENTATION` gap (V100-07) and advance performance evidence. However, this does not close any P0 gap and does not unblock the larger V100 path.

**Option B: Security/supply-chain decision task before further V100 closure**
Would compile the 4 maintainer-decision gaps (V100-02, V100-06, V100-08, V100-09) into a decision packet for the maintainer. Most impactful because these decisions block the entire V100 RC path.

**Option C: Hosted docs/GitHub Pages work for V100-12 only**
Docs-site activation is maintainer-only (Pages requires GitHub settings write). Not actionable without maintainer approval.

**Option D: Optional feature work deferred until after P0/P1 closure**
Deferring is safe but does not advance any gap.

### Recommended Next Task

**TASK-0232: Maintainer security/supply-chain decision packet for V100 closure**

**Rationale:** The post-alpha4 cleanup train (TASK-0227 through TASK-0230) is fully complete. The gap register is classified. All local gates pass. The single remaining bottleneck is not code or tests -- it is the 4 maintainer-decision gaps (V100-02 CLI contract sign-off, V100-06 security notification ownership, V100-08 support lifecycle, V100-09 supply-chain decisions) that must be resolved before any P0 gap can be closed.

A decision packet would compile the exact question, evidence, and required answer for each maintainer-decision gap into a single document. This would:
1. Reduce maintainer effort to a single review session.
2. Enable the next `REMOTE_RELEASE_OR_HOSTED_EVIDENCE` round once decisions are made.
3. Unblock the 6 remote-evidence gaps that depend on a selected RC candidate.
4. Avoid wasted implementation effort on gaps that might be closed by maintainer decision.

**Recommendation confidence:** High. The gap classification proves that local implementation (except V100-07) is not the bottleneck.

## Affected files

- `docs/tasks/TASK-0231-post-alpha4-v100-cleanup-and-next-roadmap-selection.md`
- `docs/V100_GAP_ANALYSIS.md` (add bucket classification and Post-Alpha4 V100 Cleanup section)
- `docs/ROADMAP.md` (update Post-Alpha4 interpretation with progress and next recommendation)
- `docs/NEXT_TASKS.md` (mark TASK-0230 completed, set TASK-0231 current)
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact

None.

## Security impact

None.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

Clearer next roadpath in ROADMAP.md and handoff docs.

## Logging/audit impact

None.

## Acceptance criteria

1. V100_GAP_ANALYSIS.md has bucket classification for each gap.
2. ROADMAP.md post-alpha4 section reflects TASK-0228/0229/0230 progress and next recommendation.
3. NEXT_TASKS.md and .codex files mark TASK-0231 as current.
4. No P0/P1 gap falsely closed.
5. No 1.0 readiness claim introduced.
6. Working tree clean.
7. All validations pass.

## Test steps

1. `ackit --version` -> AgentContextKit 0.2.0-alpha.4
2. `ackit doctor` -> 13/13 PASS
3. `ackit scan --ci` -> exit 0
4. All V100 gate scripts pass.
5. `dotnet build` -> 0 errors
6. `dotnet test` -> 428/428 green
7. `git diff --check` -> clean
8. Markdown link check -> pass
9. Localization parity -> pass
10. Tracked vs untracked -> pass

## Risks

- Stale roadmap interpretation: mitigated by updating ROADMAP.md with current progress.

## Rollback plan

`git revert HEAD` if any classification is wrong.

## Completion notes

TASK-0231 completed. Gap decision matrix written. Bucket classification: 1 LOCAL_IMPLEMENTATION, 4 MAINTAINER_DECISION, 6 REMOTE_EVIDENCE, 1 DOCS_FOLLOWUP, 1 DEFERRED. Next recommended task: TASK-0232 maintainer security/supply-chain decision packet.
