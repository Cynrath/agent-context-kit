# TASK-0285: vNext package DX public API and tarball smoke

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0276, TASK-0277, TASK-0283, TASK-0284 (feature-complete surface)
- Unlocks: TASK-0286, TASK-0288
- Requirement IDs: REQ-API-001, REQ-PKG-001, REQ-ARCH-009, REQ-CI-003 (owns smoke impl), REQ-DX-001 remainder, REQ-TEST-005
- Related ADR/spec: ADR-0002 (single package), ADR-0013 (distribution); MS§24, §27.1

## Purpose

Finalize the npm package surface: public programmatic API, package metadata/files whitelist, source/package single-truth enforcement, and real-tarball smoke testing.

## Scope

- Public API exports (scanRepository, buildInstructionGraph, buildContextPack, loadAckitConfig + minimal types); internal symbols blocked via entry-point design; API stability contract documented.
- package.json final fields (bin ackit, files whitelist, engines, exports map incl. types), provenance-friendly metadata.
- Version/identity single-source check contract tests (CLI help vs MCP identity vs report header).
- Tarball smoke script: pack → install into temp dir → run version/help/doctor/fixture scan → assert outputs.

## Out of scope

Publishing (forbidden — REQ-GOV-010); CI wiring itself (TASK-0286).

## Affected files

- `src/index.ts` (public entry), package.json, `scripts/package-smoke.*`
- `tests/contract/api-surface/**`, `tests/e2e/tarball/**`

## Data/database impact

None.

## Security impact

files whitelist prevents accidental artifact/secret packaging (inspection test enumerates tarball contents against allowlist).

## Permission/auth impact

None.

## Localization impact

None.

## UX impact

`npx` zero-install path verified end-to-end on packed artifact.

## Logging/audit impact

Tarball inspection output archived in task evidence.

## Acceptance criteria

- [ ] API contract test: exported symbol set equals documented allowlist exactly (no accidental deep exports).
- [ ] Tarball contents ⊆ allowlist; no .ackit cache/artifacts/tests inside package.
- [ ] Smoke: installed-from-tarball CLI passes --version/--help/doctor/scan on fixture repo.
- [ ] Version consistency triple-check passes across help/MCP/report.
- [ ] `pnpm build && pnpm pack` clean from fresh clone simulation (ci-style local run recorded).

## Test steps

`pnpm vitest run tests/contract/api-surface tests/e2e/tarball` + `pnpm pack` inspection commands.

## Risks

ESM/bin shebang pitfalls on Windows → smoke runs on all three OS in CI matrix (TASK-0286).

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
