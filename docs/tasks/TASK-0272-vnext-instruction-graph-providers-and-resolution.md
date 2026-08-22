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

- [x] Codex fixture set passes: global/project discovery, root→cwd merge, nested AGENTS.md, override wins over base.
- [x] Copilot fixture: applyTo glob correctly associates instruction to matching paths only (negative case asserts non-match).
- [x] Precedence table-driven tests cover nested/provider/path-specific matrix.
- [x] Graph JSON contract snapshot stable; unknown provider file types reported as unmanaged-advisory, not crash.
- [x] SKILL.md nodes appear in graph linked to skill catalog entries.

## Test steps

`pnpm vitest run tests/unit/instructions tests/integration/instructions`.

## Risks

Provider semantics drift → adapters pinned to documented behavior with doc-source citations in code comments/ADR.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation (`src/core/instructions/`):
- `types.ts` — InstructionNodeSchema (strictObject) with the full REQ-INSTR-002 field set; PROVIDERS = codex|claude|gemini|copilot|shared ("shared" hosts provider-neutral open-standard skills surfaces); status/securityFlag enums.
- `frontmatter.ts` — YAML frontmatter extraction (yaml package) + applyTo normalization (string or list) per GitHub Copilot documented semantics.
- `references.ts` — markdown link extraction, external-link/root-escape detection (escape-aware resolver), hidden-unicode flag (U+200B..200F, U+2060..2064, U+FEFF), sha256 checksumContent.
- `graph.ts` — discovery via realpath'd root walk (skip .git/node_modules/.ackit/artifacts/dist/coverage); surface classifier for AGENTS.md/AGENTS.override.md/CLAUDE.md/GEMINI.md/copilot surfaces/.instructions.md/SKILL.md; deterministic precedence tiers: codex global=0 < codex base depth*10+1 (+50 override) < provider roots 100+depth*10 < path-specific 1000+depth*10; managed detection via ackit:managed markers; tokenEstimate via shared estimator; status oversized/broken-reference; zod validation of every node. resolveEffectiveStack filters by provider + applyTo picomatch and sorts by precedence.
- CLI: `ackit instructions [--provider id] [--for path]` — terminal tree (sorted, depth-indented) or pure JSON {schemaVersion ackit.instructions.v0, effectiveChain?, nodes, diagnostics}; config maxTokenEstimatePerFile honored.

Tests (23 files / 121 tests total, all green):
- unit/instructions/primitives.test.ts — estimator formula incl. CJK density; frontmatter parse/absence; applyTo match/non-match via same picomatch semantics as resolver; reference extraction sorted; external-link, root-escape, hidden-unicode flags; checksum determinism.
- integration/instructions/codex.test.ts — global seam + project root + nested packages/web + apps/api base/override discovered; effective chain order global→root→nested(tie-break by id)→override strictly last by precedence; override outranks its own-dir base; broken-reference status without crash; valid references recorded as ok; graph construction deterministic.
- integration/instructions/providers.test.ts — copilot applyTo positive/negative association incl. list-form globs and repo-wide-only default; claude chain isolation + nested ordering; SKILL.md as skill-kind node with stable id skill:<name>; foreign instruction-like file (CURSOR.md) silently absent from graph with zero diagnostics.

Notes: codex "global" is modeled through an injected directory seam (`codexGlobalDir`) — no environment reads, offline-safe; virtual path `codex-global/AGENTS.md` avoids leaking host paths (REQ-GOV-004). Cursor/Windsurf/Cline/Roo adapters remain omitted pending official-docs verification per ADR-0006.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 23 files / 121 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
