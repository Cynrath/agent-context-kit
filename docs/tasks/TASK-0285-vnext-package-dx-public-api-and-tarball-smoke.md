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

- [x] API contract test: exported symbol set equals documented allowlist exactly (no accidental deep exports).
- [x] Tarball contents ⊆ allowlist; no .ackit cache/artifacts/tests inside package.
- [x] Smoke: installed-from-tarball CLI passes --version/--help/doctor/scan on fixture repo.
- [x] Version consistency triple-check passes across help/MCP/report.
- [x] `pnpm build && pnpm pack` clean from fresh clone simulation (ci-style local run recorded).

## Test steps

`pnpm vitest run tests/contract/api-surface tests/e2e/tarball` + `pnpm pack` inspection commands.

## Risks

ESM/bin shebang pitfalls on Windows → smoke runs on all three OS in CI matrix (TASK-0286).

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- Public API entry `src/index.ts` exporting exactly: scanRepository (API-friendly alias over the scan pipeline, src/api/scan-repository.ts), buildInstructionGraph, resolveEffectiveStack, buildContextPack, loadAckitConfig, validateSkills + the minimal type set (Finding/ScanResult/ScanRule/Severity/ScanCategory/ScanDiagnostic, InstructionNode/Graph/ProviderId, PackManifestEntry/PackResult, SkillIssue/SkillRecord, AckitConfig). Internal symbols stay internal by construction; the export list is contract-tested.
- package.json finalized: exports map `.` (+`./mcp` for MCP server consumers) with types conditions, top-level "types", files whitelist [dist, templates, schemas, README.md, CHANGELOG.md, LICENSE], prepack = build + gen:schemas. Bin ackit unchanged; engines/packageManager per ADR-0001.
- scripts/package-smoke.mjs — real-tarball e2e: pnpm pack → npm install into isolated temp consumer → run installed dist CLI: --version equals source version, --help lists all core commands, config check ok, scan --json parses on a fixture with a valid skill, skills validate clean. Cross-platform via node-entry invocation (no .bin shims) and shell-guarded pnpm/npm calls.

Tests (44 files / 220 tests total, all green):
- contract/api-surface: exported keys === allowlist exactly (sorted equality), all exports are functions.
- e2e/tarball: tar listing ⊆ allowlist with explicit negatives (tests/, .ackit/, artifacts/ absent); version triple-check CLI==identity==report header==package.json; full `pnpm run smoke:package` executed as a vitest e2e test (pack+install+smoke inside one gated run).

Fresh-clone simulation evidence: prepack hook rebuilt dist and regenerated schemas before pack in every smoke run this session; final chain re-run recorded below.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest 44 files / 220 tests=0 · smoke:cli=0 · smoke:package=OK · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290 (no npm publish).
