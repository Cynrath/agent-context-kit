# TASK-0265: vNext preflight and baseline verification

## Metadata

- Parent epic: TASK-0264
- Dependencies: none (first executable task)
- Unlocks: TASK-0266
- Requirement IDs: REQ-GOV-001, REQ-GOV-002, REQ-GOV-010, REQ-ARCH-001, REQ-ARCH-002
- Related ADR/spec: docs/rebuild/VNEXT_REQUIREMENTS.md; docs/rebuild/GOAL2_BOOTSTRAP.md

## Purpose

Formalize the rebuild starting point on `rebuild/ackit-vnext`: verify Git reality (local/remote SHA), installed ACKit version/syntax, doctor + CI scan results, and record the reproducible preflight evidence summary before any implementation begins.

## Scope

- Confirm branch `rebuild/ackit-vnext` exists locally and `master` SHA matches remote.
- Re-run `ackit --version`, `ackit doctor`, `ackit scan --ci --json`; store outputs under gitignored `artifacts/rebuild-baseline/`.
- Record findings baseline (current expectation: exit 0, Low/Medium only) and any repo-hygiene issues into this task's completion notes.
- Verify GOAL 1 planning artifacts exist (`docs/rebuild/*`, filled tasks TASK-0264..0289).

## Out of scope

- Any source change; branch creation (already done in Goal 1); fixing scan findings beyond recording them.

## Affected files

- `docs/tasks/TASK-0265-*.md` (this file); gitignored artifacts only otherwise.

## Data/database impact

None.

## Security impact

Confirms clean security starting point before code exists.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

None.

## Logging/audit impact

Preflight record becomes audit evidence for REQ-FIN-003 final report.

## Acceptance criteria

- [ ] Local HEAD == origin/master at start; recorded in completion notes.
- [ ] `ackit doctor` exits 0 on the branch.
- [ ] `ackit scan --ci` exits 0 with no High/Critical findings.
- [ ] Baseline JSON files present in `artifacts/rebuild-baseline/` (gitignored).
- [ ] All `docs/rebuild/VNEXT_*.md` + `GOAL2_BOOTSTRAP.md` present.
- [ ] No implementation code added by this task.

## Test steps

1. `git rev-parse HEAD` and `git rev-parse origin/master`.
2. `ackit doctor`; expect exit 0.
3. `ackit scan --ci --json > artifacts/rebuild-baseline/preflight-scan.json`; expect exit 0.
4. `Test-Path docs/rebuild/VNEXT_REQUIREMENTS.md` etc.

## Risks

Dirty tree from user work → do not overwrite; reconcile first.

## Rollback plan

No-op task; nothing to roll back except notes.

## Completion notes

(placeholder)
