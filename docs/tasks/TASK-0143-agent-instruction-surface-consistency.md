# TASK-0143 Agent Instruction Surface Consistency

## Purpose
Confirm that every agent-instruction surface (`AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/project.mdc`, `.codex/*`, `docs/AI_WORKFLOW.md`, `docs/DEVELOPMENT_STANDARD.md`) carries the same set of rules, and add a focused test that guards against future drift.

## Current State
- After TASK-0140, the four primary surfaces carry the new commit/push policy.
- `docs/AI_WORKFLOW.md` and `docs/DEVELOPMENT_STANDARD.md` exist but their content has not been re-audited since the policy change.
- `.codex/SESSION_HANDOFF.md` and `.codex/CONTEXT_PACK.md` are intentionally historical and must not be rewritten; only short additive notes are added in TASK-0141.
- No test currently guards the cross-surface consistency of the rule set.

## Scope
- Re-read `docs/AI_WORKFLOW.md` and `docs/DEVELOPMENT_STANDARD.md` and align any rule with the new commit/push policy and the existing rule set.
- Add a focused xUnit test that asserts the four primary surfaces all contain a small set of canonical phrases.
- Do not modify `.codex/SESSION_HANDOFF.md` or `.codex/CONTEXT_PACK.md` beyond the additive notes added in TASK-0141.

## Out Of Scope
- Adding a new rule, secret, or detection.
- Changing the published `0.2.0-alpha.2` package.
- Any release or NuGet action.

## Affected Files
- `docs/AI_WORKFLOW.md` (alignment only if drift exists).
- `docs/DEVELOPMENT_STANDARD.md` (alignment only if drift exists).
- `tests/AgentContextKit.Tests/` (one new consistency test class).

## Implementation
1. Read each surface and confirm it contains the canonical phrases: "task-first", "force-push", "history rewrite", "release/NuGet publish", "alpha.3 NO-GO", "no model name in commits", "do not commit generated `.ackit/` outputs".
2. Where a phrase is missing, add the missing phrase in a small additive paragraph.
3. Add a focused xUnit test that loads the four primary surfaces and asserts the canonical phrases.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.

## Backward Compatibility
- Pure additive doc alignment plus a guard test. No runtime or contract change.

## Acceptance Criteria
- The new consistency test passes.
- `dotnet test` reports at least 199/199 green.
- `git diff --check` is clean.
- The local Markdown link gate is clean.

## Tests
- One new xUnit test class with at least four focused tests.

## Validation
- `dotnet build` clean.
- `dotnet test` green.
- Markdown link gate clean.

## Rollback
- Revert the commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: align agent instruction surfaces`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 3/3 expected.
