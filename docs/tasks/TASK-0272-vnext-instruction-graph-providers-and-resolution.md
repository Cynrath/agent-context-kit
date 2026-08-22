# TASK-0272: vNext instruction graph providers and resolution

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0268
- Unlocks: TASK-0273, TASK-0276, TASK-0277, TASK-0280
- Requirement IDs: REQ-INSTR-001, REQ-INSTR-002, REQ-INSTR-003, REQ-INSTR-004, REQ-INSTR-005, REQ-TEST-001 (precedence unit), REQ-TEST-004 (graph contract)
- Related ADR/spec: ADR-0006 (instruction graph model); MS§8

## Purpose

Implement the Instruction Graph: discovery of all instruction surfaces, provider adapters with officially verified semantics, node metadata model, and resolution of scope/precedence/inheritance/override.

## Scope

- Discovery for AGENTS.md, AGENTS.override.md, CLAUDE.md, GEMINI.md, .github/copilot-instructions.md, .github/instructions/**/*.instructions.md, .agents/skills/**/SKILL.md.
- Provider adapters: codex (AGENTS family incl. override + nested), claude, gemini, copilot (repo + applyTo path-specific). Cursor/Windsurf/Cline/Roo adapters ONLY after official-docs verification recorded in ADR appendix; otherwise omitted this release.
- Node model with all REQ-INSTR-002 fields; checksums; token estimates via shared estimator.
- Resolver: root→nested inheritance, closer-scope override, applyTo glob matching, managed/unmanaged classification.
- `ackit instructions` command exposing graph as terminal tree + JSON.

## Out of scope

Conflict/staleness detection logic (TASK-0273); file generation/shims (TASK-0276).

## Affected files

- `src/core/instructions/**`
- `tests/unit/instructions/**`, `tests/integration/instructions/**`, fixtures under `tests/fixtures/`

## Data/database impact

None.

## Security impact

securityFlags populated (external refs, escapes) feeding TASK-0271/0273 rules; discovery itself never follows out-of-root links (fs engine).

## Permission/auth impact

None.

## Localization impact

None beyond English messages.

## UX impact

`ackit instructions` readable tree; JSON stable ordering.

## Logging/audit impact

checksum+status enable staleness audits later.

## Acceptance criteria

- [ ] Codex fixture set passes: global/project discovery, root→cwd merge, nested AGENTS.md, override wins over base.
- [ ] Copilot fixture: applyTo glob correctly associates instruction to matching paths only (negative case asserts non-match).
- [ ] Precedence table-driven tests cover nested/provider/path-specific matrix.
- [ ] Graph JSON contract snapshot stable; unknown provider file types reported as unmanaged-advisory, not crash.
- [ ] SKILL.md nodes appear in graph linked to skill catalog entries.

## Test steps

`pnpm vitest run tests/unit/instructions tests/integration/instructions`.

## Risks

Provider semantics drift → adapters pinned to documented behavior with doc-source citations in code comments/ADR.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
