# TASK-0144 Next Local Product Work Selection

## Purpose
Pick, document, and queue the next safe local-only product/code-quality task candidates for the post-0106 queue without claiming release readiness or performing any release/NuGet/publish action.

## Current State
- PROJECT-CONTROL-0106 will close after TASK-0145. The queue needs the next set of safe, additive, local-only candidates.
- Several reasonable candidates have been identified: scanner severity explanation polish, config-check actionable diagnostics examples, baseline diff documentation and tests, SARIF rule metadata completeness, report/webui accessibility and offline UX polish, prompt-pack/context-export redaction hardening, sample gallery test coverage expansion.
- All candidates are documentation, test, or small refactor scope. None change the published package, scanner regex set, default CLI behavior, JSON schema, or SARIF profile.
- The alpha.3 release remains NO-GO and is not in scope.

## Scope
- Add an "Independent Local Product/Code-Quality Track" section to `docs/PROJECT_EXECUTION_QUEUE.md`.
- Add an "Independent Local Product/Code-Quality Track" section to `docs/NEXT_TASKS.md`.
- Add a short forward-looking note to `docs/ROADMAP.md` that lists the candidates and explicitly disclaims release readiness.
- Append a short note to `.codex/NEXT_STEPS.md` that PROJECT-CONTROL-0106 closes with the next set of candidates queued.
- Create one task file per candidate: `TASK-0146` through `TASK-0152`.

## Out Of Scope
- Implementing any of the candidates yet (this task is selection + planning only).
- Modifying source, tests, or workflows beyond the planning docs.
- Closing `RB-003` or `RB-008`.
- Any release, tag, or NuGet action.

## Affected Files
- `docs/PROJECT_EXECUTION_QUEUE.md` (additive track only).
- `docs/NEXT_TASKS.md` (additive track only).
- `docs/ROADMAP.md` (additive forward-looking note only).
- `.codex/NEXT_STEPS.md` (additive note only).
- `docs/tasks/TASK-0146-...md` through `TASK-0152-...md` (new task files).

## Implementation
1. Add the new track rows to the queue and NEXT_TASKS, marked "Pending" or "Planned" with the next PROJECT-CONTROL-0107 placeholder so the queue remains forward-looking.
2. Add a short "Forward-Looking Candidate Backlog" note to `docs/ROADMAP.md` that names the seven candidates and their categories.
3. Create each of the seven candidate task files with the full task template.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- Pure additive planning. No runtime, contract, or release impact.

## Acceptance Criteria
- All seven candidate task files exist with the full template.
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` carry the new "Pending" or "Planned" rows.
- `docs/ROADMAP.md` carries the candidate backlog note.
- `git diff --check` is clean.
- The local Markdown link gate is clean.

## Tests
- No new tests; planning-only.

## Validation
- `git diff --check` exit 0.
- Local Markdown link gate clean.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: queue next local product tasks`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
