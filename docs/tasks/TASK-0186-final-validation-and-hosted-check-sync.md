# TASK-0186: Final Validation and Hosted Check Sync

## Purpose
Run the full local gate set, confirm all tests green, push, verify `master == origin/master`, and produce a completion report for PROJECT-CONTROL-0109.

## Current State
- All prior tasks in PROJECT-CONTROL-0109 (TASK-0177 through TASK-0185) are complete and hosted-verified.
- TASK-0181 through TASK-0185 add 21 new tests; cumulative suite is 315/315 green.

## Evidence
- `docs/tasks/PROJECT-CONTROL-0109-scan-export-hooks-hardening-and-mcp-prototype-step-1.md` (this control document).
- `docs/tasks/TASK-0177-...md` ... `TASK-0185-...md`.

## Scope
- Run gates: build, test, scan, doctor, verify-release, check-cli-contract, check-localization-parity, check-tracked-vs-untracked-md, git diff --check.
- `git status` clean.
- `master == origin/master` after the docs/push.
- Update `docs/NEXT_TASKS.md` and `.codex/SESSION_HANDOFF.md` to point at PROJECT-CONTROL-0110 placeholder; do not bump version, do not start it.
- Produce completion report.

## Out of Scope
- Bumping version, tagging, releasing, publishing.

## Affected Files
- `docs/NEXT_TASKS.md`.
- `.codex/SESSION_HANDOFF.md`.
- `.codex/CONTEXT_PACK.md`.
- `.codex/NEXT_STEPS.md`.

## Implementation Steps
1. Run all gates; capture exit codes and counts.
2. Update state docs.
3. Commit docs.
4. Push.
5. Final completion report.

## Security/Privacy Boundary
- No new external calls; only local gates and a `git push` to the existing remote.

## Backward Compatibility
- Docs only.

## Acceptance Criteria
- Build 0 errors, 0 warnings.
- Tests 315 / 0 / 0.
- Scan exit 0.
- Doctor 13/13 PASS (actual current count; the task file's "14/14" wording is stale).
- `verify-release.ps1` pass.
- `check-cli-contract.ps1` pass.
- `check-localization-parity.ps1` pass.
- `check-tracked-vs-untracked-md.ps1` clean.
- `git diff --check` clean.
- `git status` clean.
- `master == origin/master`.

## Tests
- None new; existing test count holds.

## Validation
- Same as acceptance criteria.

## Rollback
Single `git revert <sha>` for the docs commit; no production changes.

## Completion Evidence
- File list: above.
- Commit hash(es): documentation `753fc8a` (TASK-0186 closeout docs on top of final HEAD `a1151c7`).
- Test count: 315/315.
- Hosted checks for final pushed HEAD `a1151c7`:
  - `ci` run `27831342159` — success.
  - `cross-platform-smoke` run `27831342158` — success.
  - `cross-platform-source-smoke` run `27831342189` — success.
- Hosted checks for evidence commit `753fc8a`:
  - `ci` run `27831947146` — success.
  - `cross-platform-smoke` run `27831947153` — success.
  - `cross-platform-source-smoke` run `27831947151` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for both final HEAD `a1151c7` and evidence commit `753fc8a`.
- `master == origin/master` at `753fc8a563dc88ce06a20876fb74285b992a172a`.
- PROJECT-CONTROL-0109 closed. PROJECT-CONTROL-0110 placeholder; not started.
