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

- [ ] `.github/workflows/ci.yml` runs ubuntu/windows/macos × node 22/24 with frozen pnpm install, lint, format:check, typecheck, test, build.
- [ ] Workflow triggers on pushes to `rebuild/**` branches only; no master/release triggers.
- [ ] A real run of this workflow is green on all six matrix legs.
- [ ] VNEXT_EXECUTION_ORDER and VNEXT_TRACEABILITY updated; TASK-0268 lists this task as a completion dependency.

## Test steps

1. Push branch; observe GitHub Actions run for the bootstrap workflow.
2. Confirm all six matrix jobs green; record run URL and commit SHA.

## Risks

macOS runner quirks with symlink fixtures → fixtures use unprivileged junction/dir-symlink creation by design.

## Rollback plan

Revert workflow file; branch-local.

## Completion notes

(placeholder)
