---
id: "TASK-0057"
title: "skills interoperability projections"
status: pending
schemaVersion: 2
dependencies: ["TASK-0044"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Extend the existing Skills subsystem (no rebuild) with provider projections and safe interoperability (§14): keep ACKit's canonical `SKILL.md` parser/validator as the source of truth and add explicit import/export projections for Claude Code skill layouts, GitHub Copilot instruction files, and a generic layout — without adopting any vendor format as canonical or introducing lock-in.

## Scope

- Investigate (record findings in the task completion notes): Claude Code skills (`SKILL.md` + frontmatter `name`/`description` — already ACKit's canonical input format), Copilot instructions (`.github/instructions/*.instructions.md` with `applyTo` — already supported by the instruction graph), Codex/Gemini conventions where public and stable (projection only where technically safe; anything undocumented is not guessed).
- `src/core/skills/project.ts`: deterministic projection functions from canonical `SkillRecord` to provider layouts:
  - `projectSkillClaude(record)` → Claude Code-compatible `SKILL.md` frontmatter + body passthrough (identity projection where already compatible);
  - `projectSkillCopilot(record)` → `.github/instructions/<name>.instructions.md` with `applyTo` derived from skill assets/references (only when derivable; else explicit advisory);
  - `projectSkillGeneric(record)` → plain-markdown skill sheet (provider-agnostic fallback).
  Projections are pure functions with byte-deterministic output; no vendor-specific executable metadata is ever emitted.
- Import tolerance: validator accepts the already-supported formats unchanged (no new parsing paths); a projection round-trip test proves canonical → projected → reparse does not lose information the canonical schema tracks.
- CLI: `ackit skills export --provider claude|copilot|generic --out <dir>` (writes projected files; refuses to overwrite existing files without `--force` per REQ-GOV-008; output paths containment-checked) and `ackit skills validate` extended with `--projected <dir>` mode validating exported layouts.
- Tests: projection determinism, round-trip, overwrite refusal, containment (out dir inside root), no network, unknown provider refusal.

## Out of scope

- Vendor registry publishing, remote fetching, or any skill installation from the network (offline-first invariant).
- Rebuilding the skills parser or changing `SkillRecord` semantics.
- Guessing undocumented vendor formats (projection only where publicly documented and stable).

## Affected files

- `src/core/skills/project.ts` (new), `src/core/skills/validate.ts` (projected mode), `src/core/skills/index.ts`
- `src/cli/commands/skills.ts` (export/validate wiring), `src/cli/program.ts`
- `tests/unit/skills/*.ts`, `tests/integration/skills/*.ts` (new cases)

## Acceptance criteria

- [ ] Three projections produce deterministic, validated outputs from canonical skills; round-trip preserves canonical fields (checksum-stable test).
- [ ] Export refuses overwrites without explicit `--force`; all output paths contained in the repository root.
- [ ] Existing skills validation/discovery behavior unchanged (existing tests green).
- [ ] No network primitives, no executable metadata in projections (offline-egress + content assertions).
- [ ] Tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build`
3. `pnpm vitest run tests/unit/skills tests/integration/skills`
4. Full `pnpm test` + `node scripts/check-offline-egress.mjs`.

## Security considerations

- Projections emit data files only — no scripts, no shell metadata, no absolute paths.
- Export targets are containment-checked; no overwrite without explicit intent flag.

## Risks

- Vendor format drift — mitigated by projections being explicit, versioned outputs of the canonical record (documented per-provider notes).

## Rollback plan

Focused revert; additive module.

## Completion notes

(placeholder)
