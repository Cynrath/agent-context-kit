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

- [x] Local HEAD == origin/master at start; recorded in completion notes.
- [x] `ackit doctor` exits 0 on the branch.
- [x] `ackit scan --ci` exits 0 with no High/Critical findings.
- [x] Baseline JSON files present in `artifacts/rebuild-baseline/` (gitignored).
- [x] All `docs/rebuild/VNEXT_*.md` + `GOAL2_BOOTSTRAP.md` present.
- [x] No implementation code added by this task.

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

Executed 2026-08-22 on branch `rebuild/ackit-vnext`.

- Git reality: local HEAD `b93c1f0f1d7ec5ab03b55db97fdb58b71e54388e` (GOAL 1 planning commit `docs(rebuild): define vNext execution contract and task graph`); `origin/master` = `c49f97f8eb2d520dc759c6fa603079f187b851b7`; merge-base(HEAD, origin/master) = origin/master, so the branch is based exactly on current remote master. Working tree clean at start (`git status --short` empty).
- Installed ACKit: `1.0.0-rc.1` (v1 .NET tool). `ackit doctor` exit 0 (13 checks PASS incl. CriticalRedactRisk).
- `ackit scan --ci --json` exit 0; findings: 12 Low (ACKIT004), 4 Medium (ACKIT003); no High/Critical.
- Baseline artifacts stored under gitignored `artifacts/rebuild-baseline/`: preflight-scan.json, preflight-doctor.txt, ackit-version.txt, git-head.txt, git-origin-master.txt.
- Planning artifacts verified present: docs/rebuild/VNEXT_REQUIREMENTS.md, VNEXT_EXECUTION_ORDER.md, VNEXT_TRACEABILITY.md, GOAL2_BOOTSTRAP.md, decisions/ contains 14 ADR files, master epic TASK-0264 and all child task docs TASK-0265..0289 exist with unfilled acceptance criteria.
- No implementation code added by this task (docs-only edit to this file).
- External actions: none (no push/tag/release/publish).
