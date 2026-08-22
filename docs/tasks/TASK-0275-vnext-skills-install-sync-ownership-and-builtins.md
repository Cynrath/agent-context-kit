# TASK-0275: vNext skills install sync ownership and builtins

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0274
- Unlocks: TASK-0276 (init installs skills)
- Requirement IDs: REQ-SKILL-002, REQ-SKILL-003, REQ-SKILL-004, REQ-GOV-008 (no user overwrite)
- Related ADR/spec: ADR-0010; MS§7.1–7.3

## Purpose

Ship ACKit's four built-in skills plus the managed install/sync/ownership machinery that never touches third-party skills.

## Scope

- Author built-in skills under `templates/skills/`: ackit-workflow, ackit-scan-and-fix, ackit-context-optimization, ackit-policy-authoring — content per MS§7.1 activation triggers/steps; progressive disclosure with references/.
- Skills command family: list/discover/validate/install/sync/doctor/scaffold wired to CLI.
- Ownership manifest `.ackit/skills.lock.json`: ACKit-owned entries with version+checksum; no absolute paths; third-party entries listed read-only or absent.
- install/sync idempotency: identical re-run produces zero diff; existing non-owned skill with same name → hard block with guidance.

## Out of scope

init lifecycle orchestration (TASK-0276 calls these APIs).

## Affected files

- `templates/skills/**` (source of truth), `src/core/skills/install/**`
- `tests/integration/skills/**`

## Data/database impact

None.

## Security impact

Checksum verification prevents silent tampering of managed skills; overwrite protection enforced by ownership checks.

## Permission/auth impact

None.

## Localization impact

Skill content English.

## UX impact

Command outputs consistent with global options contract.

## Logging/audit impact

Lock file is auditable state; changes reviewable in git.

## Acceptance criteria

- [x] All 4 built-in skills pass validation (TASK-0274 engine) in CI self-check.
- [x] `install` on clean fixture repo creates expected tree; second run = zero diff (idempotency test).
- [x] Pre-existing user skill with conflicting name → operation refused with exit code 4 (security boundary per ADR-0007).
- [x] `sync` updates only lock-tracked entries; user-modified owned skill → conflict diagnostic, no silent clobber.
- [x] Lock file contains zero absolute paths (contract assertion).

## Test steps

`pnpm vitest run tests/integration/skills`.

## Risks

Template/source duplication → single source in templates/, packaging copies verbatim (TASK-0285 verifies tarball contents).

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Builtins (`templates/skills/` — single source of truth): ackit-workflow, ackit-scan-and-fix, ackit-context-optimization, ackit-policy-authoring. Each SKILL.md has kebab name + description per the open standard; progressive disclosure via references/ (task-lifecycle, severity-playbook, ranking, merge-order).

Engine (`src/core/skills/install.ts`):
- discoverBuiltinSkills with upward template-dir resolution from module location + injectable builtinsDir seam (tests/packaging).
- installSkills = idempotent install+sync in one ownership-safe operation: missing→installed; identical→up-to-date (zero diff); differs & untracked→refused-third-party; differs & owned & locally modified→conflict-user-modified unless --force; owned & unchanged→updated. Lock entry records version (=package version) + sha256 of builtin SKILL.md at last sync + repo-relative file list.
- readSkillsLock/writeSkillsLock (.ackit/skills.lock.json) and lockHasAbsolutePaths contract helper (REQ-SKILL-004: no absolute paths, no backslashes).
- CLI `ackit skills install [--force]`: JSON outcomes or plain lines; any refusal/conflict → exit 4 security-boundary per ADR-0007.

Tests (28 files / 154 tests total, all green):
- 4 builtins pass validateSkills cleanly when staged into standard layout.
- Clean install creates tree; second run byte-identical snapshot (idempotency).
- Third-party takeover of an owned name → refused-third-party, user bytes untouched.
- Sync lifecycle via injected builtin dir: v1 install → local edit → v2 bump → conflict without force (no clobber) → --force updates to v2 and lock checksum matches new builtin.
- Lock absolute-path contract assertion over real lock content.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 28 files / 154 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
