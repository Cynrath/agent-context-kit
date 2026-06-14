# PROJECT-CONTROL-0107 Local Product Extension

## Purpose
Continue safe local product, code-quality, and test work after PROJECT-CONTROL-0106. Build on the TASK-0146 through TASK-0152 candidate set and select a small, additive next batch of guard tests, documentation polish, and minor scanner rule clarifications.

## Current State
- TASK-0140 through TASK-0152 are complete and pushed.
- 224/224 local tests are green.
- `0.2.0-alpha.3` remains NO-GO because `RB-003` and `RB-008` are unresolved.
- `0.2.0-alpha.2` is the current published release.
- Standard 3/3 hosted jobs are green for every commit on the current branch.

## Scope
- Add the next safe local product, code-quality, test, and documentation task candidates.
- Implement the highest-value items in order.
- Run the full local validation suite plus hosted 3/3 after each push.

## Out Of Scope
- Source/package version metadata change to `0.2.0-alpha.3`.
- Tag, GitHub Release, NuGet publish, or any package mutation.
- Force push, history rewrite, tag movement, immutable version reuse.
- Closing `RB-003` or `RB-008` without explicit maintainer-provided evidence.
- API-key publication, secret exposure, or fabricated owner/identity evidence.
- Commit message model-name or AI-generator disclosure.

## Affected Files
- `docs/tasks/PROJECT-CONTROL-0107-...md` plus all `TASK-0153+` task files.
- Source code, tests, scripts, and workflows touched by the new tasks.
- `docs/PROJECT_EXECUTION_QUEUE.md`, `docs/NEXT_TASKS.md`, and handoff docs.

## Implementation
1. Create every TASK-0153+ task file before implementation.
2. Execute the tasks in order.
3. Run the full local validation suite, commit logically, push, verify hosted 3/3.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.
- Generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, and context export artifacts remain local-only and untracked.
- NuGet publication, if ever authorized, remains OIDC-only.

## Compatibility
- Keep CLI command surface, JSON schema `2`, config `1`, baseline `1`, SARIF `2.1.0`, package ID, and tool command name compatible with `0.2.0-alpha.2` unless a future explicitly approved task changes them.

## Database Impact
None.

## Admin Impact
None required from the agent.

## Permission Impact
Verification jobs remain read-only. Local Git pushes are normal `master` pushes only.

## SEO/I18n Impact
None unless a task explicitly changes documentation or localization.

## Audit/Security Impact
- Adds additional small, additive guard tests and documentation polish.
- Preserves the alpha.3 NO-GO and `RB-003`/`RB-008` blocker visibility.

## Acceptance Criteria
- TASK-0153+ tasks are sequenced, each with a full task template, and executed in order.
- The full local validation suite is green.
- Pushed commits pass the standard 3/3 hosted jobs.
- No release write is performed; no `RB-003`/`RB-008` is closed.

## Tests
- Task-specific focused tests plus the complete local contract, localization, performance, package, documentation, security, readiness, and release gate set.

## Validation
- Local gates, hosted 3/3, and any task-specific manual verification.

## Risks
- Stale evidence, over-claiming, accidental release write, deleted user changes, or weakened security rules.
- Premature closing of maintainer-gated blockers.

## Rollback
- Revert ordinary commits; never rewrite published packages or move existing tags.

## Completion Evidence
Pending. Will be filled after the audit, validation, and any audit-driven fixes.

## Commit
- Logical, narrow commits per task; no generated `.ackit/` or `bin/`/`obj/` artifacts.

## Push
- Normal `master` pushes after validation.

## Hosted Checks
- Standard 3/3 (ci, cross-platform-smoke, cross-platform-source-smoke) after each significant push.
