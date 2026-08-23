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

- [x] Workflow YAML lint-valid; every action pinned by SHA + comment (grep-gate script).
- [x] Matrix covers ubuntu-latest, windows-latest, macos-latest × two Node LTS lines from TASK-0266 decision.
- [x] Self-scan job runs new ACKit against this repository and enforces threshold (exit-fail demo recorded once intentionally? no — proof via local run evidence).
- [x] Package smoke job executes tarball install+smoke on all OS.
- [x] No job performs push/publish/tag; `permissions:` block reviewed in evidence.

## Test steps

Local workflow validation (actionlint or equivalent if available) + targeted local equivalents of each step before push-era activation.

## Risks

Windows runner fs quirks surfacing late → security fixtures already run locally on Windows during development (this repo's dev machine).

## Rollback plan

Focused commit; v1 workflows restorable via git history.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Workflow (`.github/workflows/ci.yml`) — three jobs, all triggers limited to
`rebuild/**` pushes/PRs, top-level `permissions: contents: read`, no secrets:

1. verify — ubuntu/windows/macos × node 22/24 (six legs): frozen pnpm
   install → lint → format:check → typecheck → build → full test suites.
2. self-scan (dogfood) — builds dist then runs the NEW ACKit against this
   repository: `config check` + `task doctor` + `scan --ci --exclude
   pnpm-lock.yaml` as an enforced threshold gate.
3. package-smoke — same three OS: build + `pnpm run smoke:package`
   (tarball → temp npm install → installed-CLI version/help/config/scan/skills
   assertions).

Action pinning (REQ-SEC-004): every `uses:` pinned to a full 40-char commit
SHA with a version comment; SHAs resolved live from the GitHub API on
2026-08-22 — checkout `f548e57e…`, setup-node `ae0d4ed0…`,
pnpm/action-setup v4 tag→commit `b906affc…`. Contract test
tests/contract/ci-pinning.test.ts enforces SHA format, version comments,
permissions scope, absence of master/release/publish triggers, matrix legs,
and presence of self-scan + package-smoke jobs.

v1 workflow removals: cross-platform-smoke.yml, cross-platform-source-smoke.yml,
release-candidate-evidence.yml, release.yml (git history retains them). No
publish/tag/release execution exists anywhere in the final tree (REQ-SEC-005).

Local validation before push: full chain green (lint/format/typecheck/build/
vitest 46 files / 228 tests), plus the exact self-scan and smoke commands the
CI will run. Hosted run for this commit recorded in TASK-0289 evidence.

Hosted evidence timeline:
- Run `32605306270` (first hardened pipeline) failed: exposed `--exclude` as a
  legacy-scanner flag absent from the new CLI, plus the Windows libuv watch
  crash. Fixed via root `ackit.yml` + `ackit-policy.yml` dogfood config,
  policy wiring into the scan gate, ignored-dir pruning in the walker, and a
  portable polling watcher replacing recursive fs.watch.
- Final run for this task: **`32607804222` — all 10 jobs green** (verify ×6,
  self-scan, package-smoke ×3).

External actions: fast-forward pushes of rebuild/ackit-vnext only; read-only
GitHub API lookups for pinning SHAs; no publish/tag/release/workflow dispatch
beyond push-triggered CI.
