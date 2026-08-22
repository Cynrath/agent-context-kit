# TASK-0276: vNext init onboarding and instruction shims

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0272, TASK-0275
- Unlocks: —
- Requirement IDs: REQ-INSTR-007, REQ-INSTR-008, REQ-INSTR-009, REQ-ONB-001, REQ-ONB-002
- Related ADR/spec: ADR-0006; MS§9, §25

## Purpose

Implement `ackit init`: repository detection, plan/diff/write lifecycle, managed-block instruction shims for AGENTS/CLAUDE/GEMINI/Copilot (+path-specific), and built-in skills installation.

## Scope

- Lifecycle per MS§25: detect repo/stack/workspaces/instructions/skills → safety checks → propose plan → explicit write → validate → print next actions; non-interactive `--agents all|codex,claude,copilot` and `--dry-run` for CI.
- Canonical workflow definition + minimal provider shims (no content duplication); agent-facing guidance lines per provider official syntax.
- Managed block engine: idempotent update, user-text preservation, duplicate-block repair.
- Own-repo dogfood: this repository's final instruction set generated via these templates.

## Out of scope

Graph/conflict engines (TASK-0272/0273); skills machinery internals (TASK-0275).

## Affected files

- `src/core/onboarding/**`, `templates/instructions/**`, `src/cli/commands/init.ts`
- `tests/integration/init/**`

## Data/database impact

None.

## Security impact

REQ-GOV-008 enforced at the most dangerous command; overwrite attempts on non-managed existing files are hard errors (exit 4).

## Permission/auth impact

None.

## Localization impact

Generated instructions English.

## UX impact

First-run npx story (REQ-ONB-001) verified in e2e smoke later (TASK-0285).

## Logging/audit impact

Init writes summarized as action list (created/updated/skipped with reasons).

## Acceptance criteria

- [ ] Fresh fixture: `init --agents all --dry-run` prints full plan, zero fs mutations.
- [ ] Explicit write creates expected file set; re-run produces zero diff (idempotency).
- [ ] Existing user CLAUDE.md → managed block appended, original bytes preserved outside block (byte-level test).
- [ ] Duplicate legacy ackit block in fixture repaired to single canonical block.
- [ ] Generated files pass TASK-0272 graph + TASK-0274 validation cleanly.

## Test steps

`pnpm vitest run tests/integration/init`.

## Risks

Provider syntax drift → shim text kept minimal and cited to provider docs in template comments.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
