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

- [ ] All 4 built-in skills pass validation (TASK-0274 engine) in CI self-check.
- [ ] `install` on clean fixture repo creates expected tree; second run = zero diff (idempotency test).
- [ ] Pre-existing user skill with conflicting name → operation refused with exit code 4 (security boundary per ADR-0007).
- [ ] `sync` updates only lock-tracked entries; user-modified owned skill → conflict diagnostic, no silent clobber.
- [ ] Lock file contains zero absolute paths (contract assertion).

## Test steps

`pnpm vitest run tests/integration/skills`.

## Risks

Template/source duplication → single source in templates/, packaging copies verbatim (TASK-0285 verifies tarball contents).

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
