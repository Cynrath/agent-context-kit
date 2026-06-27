# TASK-0228: V100 gap register refresh against alpha4

## Purpose

Refresh V100 / 1.0 readiness gap documents against the real post-alpha4 state.
Documentation and evidence-classification only.

## Scope

- Audit all 12 V100 gaps (V100-01 through V100-12) against alpha4 evidence.
- Classify each gap: UNCHANGED_OPEN, PARTIALLY_ADVANCED_BY_ALPHA4, MAINTAINER_REMOTE_REQUIRED, POTENTIALLY_CLOSABLE_LOCAL_ONLY.
- Update V100_GAP_ANALYSIS.md with alpha4-aware classifications and evidence.
- Update V100_READINESS.md current published state (already correct from TASK-0227).
- Update NEXT_TASKS.md, .codex handoff files, and the task file.
- Run V100 scripts (check-v100-readiness, check-v100-documentation-release-gates) and full validation.

## Out of scope

- Feature implementation.
- Code changes (source, tests, scripts, workflows).
- Package metadata changes.
- Version bump.
- Tag, GitHub Release, or NuGet mutation.
- GitHub issue creation.
- Workflow dispatch.
- Closing P0/P1 gaps without exact evidence.
- Claiming 1.0 readiness.

## Gap Classifications

| ID | Priority | Gap | Classification |
| --- | --- | --- | --- |
| V100-01 | P0 | Baseline-aware CI policy requires final-candidate acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-02 | P0 | CLI contract needs final candidate acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-03 | P0 | Config diagnostics require hosted predecessor evidence and final acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-04 | P0 | JSON/SARIF machine-readable contracts require final candidate acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-05 | P0 | Upgrade compatibility requires final-candidate acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-06 | P0 | Security response process lacks complete notification ownership | MAINTAINER_REMOTE_REQUIRED |
| V100-07 | P1 | Large-repository performance and resource limits need broader evidence | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-08 | P1 | Runtime/platform support lifecycle needs final RC confirmation | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-09 | P1 | Release supply-chain policy still lacks hosted provenance evidence | PARTIALLY_ADVANCED_BY_ALPHA4 / MAINTAINER_REMOTE_REQUIRED |
| V100-10 | P1 | Localization parity requires final candidate acceptance | PARTIALLY_ADVANCED_BY_ALPHA4 |
| V100-11 | P2 | External adoption evidence and issue feedback are limited | UNCHANGED_OPEN |
| V100-12 | P2 | Public presentation assets and hosted docs remain deferred | POTENTIALLY_CLOSABLE_LOCAL_ONLY |

### Summary
- PARTIALLY_ADVANCED_BY_ALPHA4: 8 gaps
- MAINTAINER_REMOTE_REQUIRED: 2 gaps
- UNCHANGED_OPEN: 1 gap
- POTENTIALLY_CLOSABLE_LOCAL_ONLY: 1 gap
- All P0 gaps remain open.
- No gap is closed by alpha4 publication alone.

## Files updated

- docs/V100_GAP_ANALYSIS.md (full refresh with alpha4 evidence and classifications)
- docs/NEXT_TASKS.md (update next task to TASK-0228)
- .codex/SESSION_HANDOFF.md (current task -> TASK-0228)
- .codex/CONTEXT_PACK.md (current task -> TASK-0228)
- .codex/NEXT_STEPS.md (current task -> TASK-0228)

## Data/database impact

None. Markdown-only changes.

## Security impact

None.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

V100_GAP_ANALYSIS.md now accurately reflects alpha4 evidence for each gap. All P0/P1 gaps remain open.

## Logging/audit impact

None.

## Acceptance criteria

1. V100_GAP_ANALYSIS.md has alpha4-aware evidence for each gap.
2. Gap register includes a classification column.
3. Post-Alpha4 Gap Summary section present.
4. All four V100 scripts pass.
5. Working tree clean.
6. `ackit doctor` and `ackit scan --ci` pass.
7. All validation scripts pass.
8. Commit pushed with CI green.

## Test steps

1. `ackit --version` -> AgentContextKit 0.2.0-alpha.4
2. `ackit doctor` -> all PASS
3. `ackit scan --ci` -> exit 0
4. `dotnet build AgentContextKit.sln -c Release --no-restore` -> 0 warnings, 0 errors
5. `dotnet test AgentContextKit.sln -c Release --no-build` -> 428/428 green
6. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1 -FailOnIssues` -> pass
7. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues` -> pass
8. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` -> pass
9. `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` -> pass
10. `git diff --check` -> clean
11. Windows Unicode temp guard -> no unexpected directories

## Risks

- Closing a gap without exact evidence: mitigated by preserving all P0/P1 done criteria.
- Overwriting alpha4 evidence gaps: mitigated by careful hand-classification.

## Rollback plan

`git revert HEAD` if any classification is wrong. No immutable artifacts are affected.

## Completion notes

See final status report for full TASK-0228 results.

Recommended next task after TASK-0228: **TASK-0229: public presentation screenshot asset / Web UI preview**. Rationale: V100-12 is the only POTENTIALLY_CLOSABLE_LOCAL_ONLY gap; screenshots can be produced locally without maintainer input, providing visible product polish. All other gaps require either maintainer input or a future 1.0 RC candidate.
