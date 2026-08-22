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

- [ ] Unit matrix covers every REQ-SKILL-005 check with positive+negative fixture.
- [ ] Duplicate skill names across nested dirs flagged.
- [ ] Reference pointing outside repo root → strict error; relative deep chain > threshold → warning tier.
- [ ] SKILL.md containing `scripts/run.sh` → reported as present, zero execution attempts (assert via fs spy).
- [ ] Valid ACKit repo skills validate clean end-to-end.

## Test steps

`pnpm vitest run tests/unit/skills tests/security/skills`.

## Risks

Frontmatter edge cases (BOM, CRLF) → fixtures include mixed line endings per REQ-TEST-007.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
