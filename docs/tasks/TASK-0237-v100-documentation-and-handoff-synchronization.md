# TASK-0237: V100 documentation and handoff synchronization

## Purpose

Synchronize every active roadmap, queue, documentation index, project map, release/readiness summary, and Codex handoff with the completed TASK-0232–0236 evidence before the final audit.

## Verified starting state

- `docs/PROJECT_EXECUTION_QUEUE.md` and several readiness/handoff summaries contain historical active headings and stale alpha3/security states.
- TASK-0232–0236 will establish the authoritative current decision, performance, candidate, freeze, and hosted-input records.

## Dependencies

- TASK-0232 through TASK-0236 completed and committed.

## Scope

- Make current task/next boundary consistent across ROADMAP, NEXT_TASKS, PROJECT_EXECUTION_QUEUE, V100 gap/readiness/release summaries, documentation index, project map, and `.codex` files.
- Preserve historical evidence without presenting it as current.
- Register TASK-0238 as the final local audit and manual hosted RC dispatch as the next authorization boundary.

## Out of scope

- Source/script/test/workflow behavior changes.
- Remote writes, release/version/package changes, or readiness claims unsupported by evidence.

## Planned files

- `docs/ROADMAP.md`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/DOCUMENTATION_INDEX.md`
- `docs/PROJECT_MAP.md`
- `docs/RC_LOCAL_READINESS.md`
- `docs/RELEASE_CANDIDATE_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- this task file

## Implementation steps

1. Audit current-state headings and alpha/security/candidate statements.
2. Add a concise authoritative V100 safe-local chain section to queues and roadmap.
3. Link new packet/selection evidence in indexes/maps.
4. Update `.codex` resume points and next action.
5. Run Markdown, tracked/untracked, V100 documentation, and hygiene checks.

## Data/database impact

None.

## Admin impact

None.

## Security impact

Reduces stale security-state ambiguity; no control or sensitive data changes.

## Permission/auth impact

None.

## SEO/i18n impact

No public localization behavior change. Public 1.0 readiness is not claimed.

## Logging/audit impact

Improves task-chain traceability and resume accuracy.

## Acceptance criteria

1. All active sources identify TASK-0237 completed and TASK-0238 current/next.
2. New V100 decision and candidate documents are indexed.
3. Historical headings are labeled historical or no longer presented as active.
4. No source/script/workflow/package metadata changes occur.
5. Markdown, V100 docs, and tracked/untracked gates pass.
6. One local commit contains this task only.

## Validation commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues
ackit doctor
ackit scan --ci
git diff --check
```

## Risks

- Large historical files can retain misleading current markers. Mitigation: targeted searches for `Current task`, alpha3 current-package text, unassigned ownership, and all TASK-0232–0238 IDs.

## Rollback plan

Revert the TASK-0237 commit.

## Completion-state requirements

- All changed docs are committed together.
- TASK-0238 is the only remaining safe-local task.

## Completion notes

Planned.
