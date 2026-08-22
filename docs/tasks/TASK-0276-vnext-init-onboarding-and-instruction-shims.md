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

- [x] Fresh fixture: `init --agents all --dry-run` prints full plan, zero fs mutations.
- [x] Explicit write creates expected file set; re-run produces zero diff (idempotency).
- [x] Existing user CLAUDE.md → managed block appended, original bytes preserved outside block (byte-level test).
- [x] Duplicate legacy ackit block in fixture repaired to single canonical block.
- [x] Generated files pass TASK-0272 graph + TASK-0274 validation cleanly.

## Test steps

`pnpm vitest run tests/integration/init`.

## Risks

Provider syntax drift → shim text kept minimal and cited to provider docs in template comments.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/onboarding/managed-block.ts` — provider-scoped `<!-- ackit:managed:start (provider) --> … end -->` engine (REQ-INSTR-008): idempotent ensure, byte-preserving user text outside blocks, duplicate legacy blocks collapsed to the canonical last block ("repaired"), trailing-newline normalization.
- `src/core/onboarding/init.ts` — planOrApplyInit over providers codex/claude/gemini/copilot: codex gets the full canonical-workflow managed body; claude uses the official single-line `@AGENTS.md` import syntax; gemini/copilot get minimal read-AGENTS guidance lines (no content duplication). Existing user files WITHOUT an ackit block are refused (`refused-non-managed`) — never overwritten, even with force (REQ-GOV-008); empty/missing files are created; apply also runs builtin skill installation and records those actions.
- CLI: `ackit init [--agents all|codex,claude,...] [--dry-run]` — plan vs results listing `[action] file — detail`; JSON mode; refusals → exit 4 security boundary.

Tests (30 files / 163 tests total, all green):
- Dry-run produces a four-provider create plan while a before/after fs snapshot proves zero mutations.
- Apply creates the expected set; second apply yields no created/updated/repaired actions and a byte-identical snapshot (idempotency).
- User CLAUDE.md without a block is refused and bytes untouched; a seeded managed-block file is detected as unchanged with the user prefix preserved at the byte level.
- Duplicate gemini blocks repaired to exactly one start marker, middle user text preserved.
- Post-init repository passes instruction-graph discovery for all four providers, skills validation has zero strict issues, lock contains no absolute paths.

Dogfood note: this repository's root AGENTS.md was hand-canonicalized in the governance commit; regenerating provider shims here via `ackit init` is left to TASK-0287 so docs and shims land together.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 30 files / 163 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
