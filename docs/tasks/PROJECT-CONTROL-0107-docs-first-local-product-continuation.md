# PROJECT-CONTROL-0107 Docs-First Local Product Continuation

## Purpose
Continue independent local product, code-quality, test, documentation, and security work after PROJECT-CONTROL-0106, using a strict docs-first plan-then-execute flow. The plan, the task files, and the queue/handoff updates are committed and pushed first; the actual implementation follows in TASK-0159 through TASK-0167.

## Current State
- `master` is at `a5686aac319e8e2660ee725167e818cf5e069c39` and aligned with `origin/master`.
- 238/238 local tests are green; `ackit scan --ci` and `ackit doctor` are clean.
- Standard 3/3 hosted jobs (ci, cross-platform-smoke, cross-platform-source-smoke) are green for the current HEAD.
- `0.2.0-alpha.3` remains NO-GO because `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) remain unresolved.
- TASK-0140 through TASK-0158 are complete; 238/238 is the current verified local test count.

## Scope
- Audit the post-0158 state and sync the active queue, NEXT_TASKS, handoff docs, and CHANGELOG.
- Polish scanner severity guidance and add a focused guard test if behaviour is added.
- Document and test the actionable `ackit config-check` diagnostics and the starter config files.
- Document and test the baseline diff workflow with the existing baseline classification.
- Verify and test the SARIF rule metadata completeness.
- Polish the offline HTML report and Web UI accessibility without changing the offline-only contract.
- Strengthen the prompt pack and context export redaction guard tests.
- Expand the sample gallery coverage tests and keep `scripts/test-samples.ps1` working.
- Run the full local validation suite plus hosted 3/3 at the end.

## Out Of Scope
- Source/package version metadata change to `0.2.0-alpha.3` or any other value.
- Tag, GitHub Release, NuGet publish, or any package mutation.
- Force push, history rewrite, tag movement, immutable version reuse.
- Closing `RB-003` or `RB-008` without explicit maintainer-provided evidence.
- API-key publication, secret exposure, or fabricated owner/identity evidence.
- Commit message model-name or AI-generator disclosure.

## Affected Files
- `docs/tasks/PROJECT-CONTROL-0107-docs-first-local-product-continuation.md` (this file).
- `docs/tasks/TASK-0159-...md` through `TASK-0167-...md`.
- `docs/PROJECT_EXECUTION_QUEUE.md`, `docs/NEXT_TASKS.md`, `docs/ROADMAP.md`.
- `.codex/NEXT_STEPS.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`.
- Source code, tests, scripts, and workflows touched by TASK-0160 through TASK-0167.
- `CHANGELOG.md`.

## Implementation
1. Create every TASK-0159+ task file before implementation.
2. Commit and push the docs-only planning commit first.
3. Execute TASK-0159 (post-0158 audit and state sync).
4. Execute TASK-0160 through TASK-0166 in order, each with focused validation, logical commit, push, and hosted 3/3.
5. Execute TASK-0167 (final validation and hosted check sync).

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
- Preserves the alpha.3 NO-GO and `RB-003`/`RB-008` blocker visibility.
- Closes the queue/handoff drift between PROJECT-CONTROL-0106 completion and the 238/238 milestone.
- Strengthens guard tests around scanner rule catalog, config-check, baseline, SARIF, HTML report, prompt pack, context export, and sample gallery.

## Acceptance Criteria
- TASK-0159 through TASK-0167 are each complete with focused validation.
- The full local validation suite is green with 238+/238+ tests passing.
- Pushed commits pass the standard 3/3 hosted jobs.
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` agree on the active control and the 238/238 milestone.
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
