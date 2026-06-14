# PROJECT-CONTROL-0106 Repo Rules And Continuation Sync

## Purpose
Sync repository agent-instruction surfaces with the current user authorization model, close the queue/handoff stale references, and validate that the new `ACKIT006` and `ACKIT007` scanner rule documentation is consistent across the Core catalog, tests, JSON/SARIF contract docs, and active planning artifacts — without claiming release readiness.

## Current State
- `master` is at `a179bae944054a9cb2a85c8f999f92910cab6210` and aligned with `origin/master`.
- 197/197 local tests are green; `ackit scan --ci` and `ackit doctor` are clean.
- The standard 3/3 hosted jobs (ci, cross-platform-smoke, cross-platform-source-smoke) are green for the current HEAD.
- `0.2.0-alpha.3` remains NO-GO because `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) remain unresolved.
- The active PROJECT-CONTROL-0104 row in `docs/PROJECT_EXECUTION_QUEUE.md` is still marked "In progress"; `docs/NEXT_TASKS.md` lists PROJECT-CONTROL-0105 as completed. The two queue documents disagree.
- `AGENTS.md` still contains the outdated "Never push, publish, force-push, or create remotes from an agent session." rule, which now contradicts the explicit user authorization for normal `master` pushes during the active control task.
- `.codex/NEXT_STEPS.md` still references PROJECT-CONTROL-0104 as the active control rather than PROJECT-CONTROL-0106.

## Scope
- Sync the agent-instruction surfaces with the current user authorization model.
- Reconcile the active queue, NEXT_TASKS, and handoff docs.
- Confirm `ACKIT006` and `ACKIT007` are described consistently across `SCANNER_RULES.md`, `SARIF_OUTPUT.md`, `JSON_OUTPUT.md`, `SECURITY_MODEL.md`, `CHANGELOG.md`, and the Core catalog.
- Add the next safe local product candidates to the queue.
- Run the full local validation suite and confirm hosted 3/3 stays green.

## Out Of Scope
- Source/package version metadata change to `0.2.0-alpha.3` or any other value.
- Tag, GitHub Release, NuGet publish, or any package mutation.
- Force push, history rewrite, tag movement, immutable version reuse.
- Closing `RB-003` or `RB-008` without explicit maintainer-provided evidence.
- API-key publication, secret exposure, or fabricated owner/identity evidence.
- Commit message model-name or AI-generator disclosure.

## Affected Files
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/project.mdc`
- `docs/AI_WORKFLOW.md` (if it exists)
- `docs/DEVELOPMENT_STANDARD.md` (if it exists)
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/NEXT_STEPS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `docs/SCANNER_RULES.md` (only if drift remains)
- `docs/SARIF_OUTPUT.md` (only if drift remains)
- `docs/JSON_OUTPUT.md` (only if drift remains)
- `docs/SECURITY_MODEL.md` (only if drift remains)
- `CHANGELOG.md` (small `[Unreleased]` addendum)
- `docs/ROADMAP.md` (additive roadmap section only)
- `docs/tasks/TASK-0140-...md` through `TASK-0145-...md`

## Implementation
1. Create every TASK-0140+ task file before implementation.
2. Execute TASK-0140 (agent rule sync), then TASK-0141 (queue/handoff), then TASK-0142 (scanner rule docs), then TASK-0143 (agent instruction surface), then TASK-0144 (next work selection), then TASK-0145 (final validation).
3. After each task: run the relevant local gates, commit logically, push, and verify the standard 3/3 hosted jobs.

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
Verification jobs remain read-only. Local Git pushes are normal `master` pushes only when the active control task explicitly authorizes them.

## SEO/I18n Impact
None unless a task explicitly changes documentation or localization.

## Audit/Security Impact
- Removes the contradiction between `AGENTS.md` and the current user authorization.
- Closes the active queue divergence and surfaces the `0.2.0-alpha.3` NO-GO and `RB-003`/`RB-008` blockers as still-open.
- Preserves the scanner rule catalog contract: ACKIT006 and ACKIT007 are described consistently in code, tests, and documentation.

## Acceptance Criteria
- TASK-0140, 0141, 0142, 0143, 0144, and 0145 are each complete with focused validation.
- The full local validation suite passes with 197+/197+ green tests.
- Pushed commits pass the standard 3/3 hosted jobs.
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` agree on the active control and completed history.
- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.cursor/rules/project.mdc` agree on the new commit/push policy.
- No release write is performed; no `RB-003`/`RB-008` is closed.

## Tests
- Task-specific focused tests plus the complete local contract, localization, performance, package, documentation, security, readiness, and release gate set.

## Validation
- Local gates, hosted 3/3, and any task-specific manual verification.

## Risks
- Accidental release write, weakened security rules, or premature closing of maintainer-gated blockers.
- Drift between the queue and the live repo state.

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
