# TASK-0289: vNext final hardening verification gate

## Metadata

- Parent epic: TASK-0264
- Dependencies: ALL prior tasks (0265..0288)
- Unlocks: GOAL 2 completion / final report
- Requirement IDs: REQ-FIN-001, REQ-FIN-002, REQ-FIN-003, REQ-GOV-012, REQ-GOV-001, REQ-GOV-002, REQ-GOV-003, REQ-GOV-004, REQ-GOV-005, REQ-GOV-006, REQ-GOV-007, REQ-GOV-008, REQ-GOV-009, REQ-GOV-010, REQ-GOV-011, REQ-TEST-003 (final sweep), REQ-TEST-004 (final sweep), REQ-TEST-005 (final sweep), REQ-TEST-006 (final sweep), REQ-TEST-007 (final sweep), REQ-TEST-008
- Related ADR/spec: MS§46–48

## Purpose

Single authoritative closeout: run the full Final Acceptance Gate, clean-environment verification matrix, packaged smoke suite, self-dogfooding checks, and produce the MS§48 final report.

## Scope

- REQ-FIN-001 checklist executed section by section with evidence links.
- Clean-env verification: fresh install --frozen-lockfile → lint → format:check → typecheck → test → build.
- Packaged CLI smoke: full command battery from MS§47; tarball reinstall in temp; MCP smoke.
- Self-dogfood: doctor PASS, scan clean-or-justified-suppressions, task doctor on this repo, pack generation, skills validation.
- Dead code/duplicate code sweep; dependency audit; determinism re-check; cross-platform assertions reviewed in CI logs.
- Final report per REQ-FIN-003 incl. external-actions-none statement.

## Out of scope

Publishing/tagging/release (remain user-authorized actions outside Goal 2).

## Affected files

- Possible small hardening fixes discovered by the gate (each with its own focused commit)
- Final report location: this task's completion notes + docs/rebuild status update

## Data/database impact

None.

## Security impact

Final security fixture sweep is release-blocking evidence.

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

Gate failures translate directly into prioritized fixes before completion claim.

## Logging/audit impact

All gate outputs archived under gitignored artifacts + summaries inline.

## Acceptance criteria

- [ ] Every MS§46 checkbox verified with pointer to concrete evidence (test name/CI link/local transcript).
- [ ] Full verification matrix green on dev machine AND CI matrix.
- [ ] Tarball reinstall smoke green on 3 OS.
- [ ] Self-scan zero unjustified findings; suppressions each carry reason+expiry.
- [ ] `git status` clean; `git diff --check` clean; commit list reviewed for conventional format.
- [ ] Final report written; no "future work" backlog items — only real blockers if any.

## Test steps

The gate itself defines them (MS§47 sequence verbatim).

## Risks

Late discoveries cascading → buffer via advisory-first thresholds from TASK-0288 and earlier per-task gates.

## Rollback plan

Hardening fixes individually revertible; gate may be re-run at will.

## Completion notes

(placeholder)
