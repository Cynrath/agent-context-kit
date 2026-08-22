# TASK-0274: vNext agent skills parser and validation engine

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0268
- Unlocks: TASK-0275, TASK-0277 (catalog in packs)
- Requirement IDs: REQ-SKILL-001, REQ-SKILL-005, REQ-SKILL-006, REQ-TEST-001 (skill parser), REQ-TEST-003 (duplicate/out-of-root ref fixtures)
- Related ADR/spec: ADR-0010; MS§7, §7.4

## Purpose

Implement Agent Skills discovery, frontmatter parsing (YAML), and the strict-vs-warning validation engine per the open standard.

## Scope

- Discovery of `.agents/skills/<name>/SKILL.md` (+ optional scripts/references/assets) across repo incl. workspaces later.
- Parser: YAML frontmatter with name+description; kebab-name ↔ parent-dir match enforcement.
- Validation checks (REQ-SKILL-005 full list): missing/invalid frontmatter, missing fields, mismatch, invalid names, duplicates, overlong description, broken/missing references, suspicious external paths, root escapes, oversized SKILL.md, deep reference chains. Strict errors separated from compatibility warnings.
- Trust model: scripts detected and reported, never executed (REQ-SKILL-006).

## Out of scope

Install/sync/builtins content (TASK-0275); instruction-graph node integration is consumed there but owned by TASK-0272.

## Affected files

- `src/core/skills/**`
- `tests/unit/skills/**`, `tests/security/skills/**`

## Data/database impact

None.

## Security impact

Root-escape and external-path reference detection blocks exfil-style skill layouts early; script non-execution policy codified in tests.

## Permission/auth impact

None.

## Localization impact

Validation messages English.

## UX impact

`ackit skills validate` exit codes: 0 clean / 1 findings / 2 usage — consistent with taxonomy.

## Logging/audit impact

Findings reuse scan finding contract shape where sensible (documented mapping).

## Acceptance criteria

- [x] Unit matrix covers every REQ-SKILL-005 check with positive+negative fixture.
- [x] Duplicate skill names across nested dirs flagged.
- [x] Reference pointing outside repo root → strict error; relative deep chain > threshold → warning tier.
- [x] SKILL.md containing `scripts/run.sh` → reported as present, zero execution attempts (assert via fs spy).
- [x] Valid ACKit repo skills validate clean end-to-end.

## Test steps

`pnpm vitest run tests/unit/skills tests/security/skills`.

## Risks

Frontmatter edge cases (BOM, CRLF) → fixtures include mixed line endings per REQ-TEST-007.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/skills/types.ts` — SkillRecord (name/description/relativePath/checksum/tokenEstimate/scripts/references/assets), SkillIssue with strict|warning tiers, SKILL_PATH_PATTERN for `.agents/skills/<name>/SKILL.md` at any depth, kebab-name validator, MAX_DESCRIPTION_LENGTH=1024, MAX_REFERENCE_CHAIN_DEPTH=3.
- `src/core/skills/validate.ts` — validateSkills: discovery over realpath'd root; frontmatter via shared extractFrontmatter (BOM-tolerant); strict checks SKILL-FRONTMATTER-MISSING (also covers invalid YAML), SKILL-NAME-MISSING/INVALID (kebab), SKILL-DIR-MISMATCH, SKILL-DESCRIPTION-MISSING, SKILL-DUPLICATE (cross-directory), SKILL-BROKEN-REF, SKILL-ROOT-ESCAPE (strict); warnings SKILL-DESCRIPTION-LONG, SKILL-OVERSIZE (shared estimator), SKILL-EXTERNAL-REF, SKILL-DEEP-CHAIN (BFS depth>3). Scripts/references/assets dirs are enumerated and reported only — the module performs no dynamic imports or process spawning (REQ-SKILL-006).
- CLI: `ackit skills validate` (0 clean / 1 findings / 2 usage per taxonomy; JSON mode schemaVersion ackit.skills.v0 with skills+issues) and `ackit skills list`.

Tests (24 files / 133 tests total, all green):
- REQ-SKILL-005 matrix positive+negative per check incl. duplicate names across nested workspace-style roots, out-of-root strict error (4× ../ from skill depth), broken local ref strict, deep-chain warning tier assertion, CRLF+BOM fixture without false positives.
- Zero-execution proof: `node:child_process` module mocked at top level with spies; full validation run asserts spawn/exec/execFile never called while scripts/run.sh presence is reported.
- Real-repository end-to-end validation runs clean.

Notes: two genuine cross-platform fixes surfaced by tests and folded in: skill discovery now POSIX-normalizes candidate paths before pattern matching (Windows backslashes previously hid every skill), and frontmatter extraction strips a leading BOM so CRLF/BOM fixtures parse. Root-escape semantics documented: escaping requires more `..` than the skill's depth; shallower overshoot resolves to an existing-root path handled as broken-ref/valid.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 24 files / 133 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
