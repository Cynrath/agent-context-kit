# TASK-0286: vNext CI supply chain hardening

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0285
- Unlocks: TASK-0289 (CI green is a gate input)
- Requirement IDs: REQ-CI-001, REQ-CI-002, REQ-CI-003, REQ-SEC-004, REQ-SEC-005, REQ-ARCH-003 (LTS matrix)
- Related ADR/spec: MS§27.2–27.3, §28

## Purpose

Build the hardened CI pipeline (3 OS × ≥2 Node LTS) with immutable action pinning, self-scan, and package smoke — no publishing.

## Scope

- `.github/workflows/ci.yml`: checkout→setup-node→pnpm (corepack path per ADR) → frozen install → format/lint → typecheck → unit/integration/contract/security suites → build → CLI smoke → MCP smoke → self-scan (`doctor` + `scan --ci` via dist or packed bin) → tarball inspection/smoke.
- All `uses:` pinned to full commit SHA with version comment.
- No workflow triggers publish/tag/release; release-readiness verification only (script/workflow optional).
- Matrix deduplicated via reusable job definitions where sensible.

## Out of scope

Any registry/release execution; nightly schedules unless justified in completion notes.

## Affected files

- `.github/workflows/ci.yml`, possible `scripts/ci/*` helpers
- Removal/replacement of v1 .NET workflows (list in evidence)

## Data/database impact

None.

## Security impact

Closes v1 lesson #10 (unpinned actions); supply-chain posture documented in SECURITY docs update (TASK-0287 references).

## Permission/auth impact

Workflow permissions scoped minimal (contents: read); no secrets required for CI.

## Localization impact

None.

## UX impact

Contributors get deterministic cross-platform signal.

## Logging/audit impact

CI artifacts limited to reports; retention minimized.

## Acceptance criteria

- [ ] Workflow YAML lint-valid; every action pinned by SHA + comment (grep-gate script).
- [ ] Matrix covers ubuntu-latest, windows-latest, macos-latest × two Node LTS lines from TASK-0266 decision.
- [ ] Self-scan job runs new ACKit against this repository and enforces threshold (exit-fail demo recorded once intentionally? no — proof via local run evidence).
- [ ] Package smoke job executes tarball install+smoke on all OS.
- [ ] No job performs push/publish/tag; `permissions:` block reviewed in evidence.

## Test steps

Local workflow validation (actionlint or equivalent if available) + targeted local equivalents of each step before push-era activation.

## Risks

Windows runner fs quirks surfacing late → security fixtures already run locally on Windows during development (this repo's dev machine).

## Rollback plan

Focused commit; v1 workflows restorable via git history.

## Completion notes

(placeholder)
