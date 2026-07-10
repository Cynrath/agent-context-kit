# TASK-0238: V100 final local readiness audit and safe-chain closeout

## Purpose

Run the single complete local validation suite for the finished safe/local V100 chain, record exact evidence, close the local chain, and leave manual hosted RC dispatch as the first remaining authorization boundary.

## Verified starting state

- TASK-0232–0237 are expected to be committed locally and not pushed.
- No version bump, tag, release, NuGet, workflow dispatch/rerun, settings, owner, or destructive action is authorized.
- The expected test baseline before TASK-0233 is 428 tests.

## Dependencies

- TASK-0232 through TASK-0237 complete with one local commit each.

## Scope

- Run the complete validation suite specified in the goal, including ACKit, restore/build/test, V100/contract/config/JSON/localization/RC gates, expanded performance/resource evidence, Unicode temp regression guard, Markdown/hygiene, and diff checks.
- Record exact counts/timings/status and final gap dispositions.
- Verify one commit per task, no placeholder tasks, no unrelated/release mutation, and no tracked `.ackit/` artifacts.
- Commit the closeout evidence, then perform final remote-advance protection, one push, and one blocking final-HEAD CI sequence outside the local task commit.

## Out of scope

- Manual RC workflow dispatch or rerun.
- Version bump, publish, tag, GitHub Release, settings, owner, secret, advisory, or destructive recovery action.
- Claiming V100 RC or 1.0 readiness.

## Planned files

- this task file
- `docs/RC_LOCAL_READINESS.md`
- `docs/RELEASE_CANDIDATE_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Implementation steps

1. Confirm the seven preceding local commits and task completion state.
2. Run the complete local suite once and wait for each long-running command.
3. Run the exact TASK-0217/TASK-0230 Windows Unicode temp guard.
4. Record actual evidence and local/remote boundary.
5. Run mandatory pre-commit ACKit checks and create the TASK-0238 commit.
6. Review the final diff, verify origin did not advance, push all commits once, and wait for push-triggered CI with the prescribed single blocking block.

## Data/database impact

None.

## Admin impact

None.

## Security impact

Final scan/redact/hygiene evidence is recorded without sensitive values. No remote security state changes.

## Permission/auth impact

Normal `master` push is authorized by the explicit goal after local validation and remote-advance protection. No other permission change.

## SEO/i18n impact

Localization parity is validated; no readiness marketing claim is added.

## Logging/audit impact

Records exact local validation, commit, push, and final CI evidence using public IDs only.

## Acceptance criteria

1. All required local commands pass with actual results recorded.
2. Unicode temp guard passes using the exact repository procedure.
3. One local commit exists for each TASK-0232–0238 and no task placeholder remains.
4. Final diff contains no unrelated, generated, secret, release/version, or prohibited mutation.
5. All commits are pushed together exactly once after origin advance protection.
6. `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` pass for final pushed HEAD using one blocking command sequence.
7. Local HEAD equals `origin/master` and the working tree is clean.
8. The next action is only the explicit manual hosted RC dispatch boundary.

## Validation commands

Use the exact complete suite and blocking CI block from the goal objective. Do not duplicate long-running commands or poll while they run.

## Risks

- Long validation duration or runner discovery delay. Mitigation: one invocation per command and bounded one-retry CI discovery block.
- Remote branch advances before push. Mitigation: fetch and merge-base equality check; stop rather than overwrite.
- Evidence commit changes docs after code validation. Mitigation: only evidence/handoff files change after the full suite, followed by ACKit/hygiene/diff checks.

## Rollback plan

Before push, revert the relevant local task commit normally if evidence is incorrect. After push, use a new corrective commit; never rewrite history or force-push.

## Completion-state requirements

- Final evidence, commit hashes, push count, CI run IDs, gap status, and remaining boundary are available for the Turkish final report.
- Goal status is marked complete only after final CI and state verification.

## Completion notes

Planned. No test, push, or CI result is claimed yet.
