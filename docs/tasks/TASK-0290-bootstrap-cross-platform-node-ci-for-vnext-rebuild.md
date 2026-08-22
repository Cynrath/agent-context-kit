# TASK-0290: Bootstrap cross-platform Node CI for vNext rebuild

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0267
- Unlocks: TASK-0268 (completion gate), TASK-0286 (final hardening supersedes this workflow)
- Requirement IDs: REQ-CI-001 (minimum matrix subset), REQ-GOV-010, REQ-GOV-011
- Related ADR/spec: ADR-0001 (Node targets 22/24); docs/rebuild/VNEXT_EXECUTION_ORDER.md

## Purpose

Close the CI sequencing gap: TASK-0268 security fixtures require Windows AND POSIX validation, but full Node CI was deferred to TASK-0286. This task installs the minimal cross-platform pipeline now so engine/security work lands on real multi-platform evidence.

## Scope

- Replace the stale v1 .NET `.github/workflows/ci.yml` with a minimal Node CI: matrix ubuntu-latest + windows-latest + macos-latest × Node 22 + 24; pnpm via `packageManager`; frozen install; lint; format check; typecheck; tests; build.
- Update execution order/traceability and affected task dependencies.

## Out of scope

Immutable action SHA pinning, package smoke, self-scan, MCP smoke, release gates (TASK-0286); SARIF/reporting jobs.

## Affected files

- `.github/workflows/ci.yml`
- `docs/rebuild/VNEXT_EXECUTION_ORDER.md`, `docs/rebuild/VNEXT_TRACEABILITY.md`, `docs/tasks/TASK-0268-*.md`

## Data/database impact

None.

## Security impact

Runs the filesystem security fixture suite on Windows and POSIX runners before further engine work is accepted.

## Permission/auth impact

None. Workflow runs on push/pull_request to the rebuild branch only.

## Localization impact

None.

## UX impact

None.

## Logging/audit impact

CI run URLs recorded in completion notes as evidence.

## Acceptance criteria

- [x] `.github/workflows/ci.yml` runs ubuntu/windows/macos × node 22/24 with frozen pnpm install, lint, format:check, typecheck, test, build.
- [x] Workflow triggers on pushes to `rebuild/**` branches only; no master/release triggers.
- [x] A real run of this workflow is green on all six matrix legs.
- [x] VNEXT_EXECUTION_ORDER and VNEXT_TRACEABILITY updated; TASK-0268 lists this task as a completion dependency.

## Test steps

1. Push branch; observe GitHub Actions run for the bootstrap workflow.
2. Confirm all six matrix jobs green; record run URL and commit SHA.

## Risks

macOS runner quirks with symlink fixtures → fixtures use unprivileged junction/dir-symlink creation by design.

## Rollback plan

Revert workflow file; branch-local.

## Completion notes

Executed 2026-08-22.

- Workflow: `.github/workflows/ci.yml` — matrix ubuntu-latest/windows-latest/macos-latest × node "22"/"24" (six jobs); steps: checkout → setup-node → pnpm/action-setup (reads packageManager pin) → `pnpm install --frozen-lockfile` → lint → format:check → typecheck → build → tests. Triggers limited to `push`/`pull_request` on `rebuild/**`; no master/release paths. Action pinning to immutable SHAs is deliberately deferred to TASK-0286 per this task's out-of-scope list.
- Governance updates shipped in the same change set: canonical vNext AGENTS.md (stale .NET/NuGet/.codex references removed), VNEXT_EXECUTION_ORDER Wave-3 insertion with completion-gate note, VNEXT_TRACEABILITY row + ci-config class split (0290 bootstrap / 0286 final), REQ-GOV-010 reworded for the real remote branch, GOAL2_BOOTSTRAP reality anchors and prohibited-actions updated.
- Evidence (real runs):
  - Run 32590812858 — FAILED: exposed genuine cross-platform bug (`toPosix` depended on host path.sep; POSIX runners left backslashes unconverted). Fixed in commit `11b509d`.
  - Run 32591258510 — FAILED: second real bug (`isInsideRoot` used host separator for the boundary segment; mixed-separator containment failed off-Windows). Fixed in commit `d9f4904`.
  - Run 32591587589 — **SUCCESS**, all six legs green (ubuntu/node-22+24, windows/node-22+24, macos/node-22+24) at commit `d9f4904`. This run also executed the TASK-0268 security fixture suite on Windows and POSIX.
- Local chain re-verified before each push: lint/format/typecheck/build/test all exit 0 (83 tests).
- External actions: two fast-forward pushes of `rebuild/ackit-vnext` performed under REQ-GOV-010 as updated 2026-08-22; no other remote action.
