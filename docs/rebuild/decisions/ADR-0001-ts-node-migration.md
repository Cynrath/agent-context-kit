# ADR-0001: TypeScript/Node.js/npm migration & toolchain

Status: Accepted · Date: 2026-08-22 (confirmed in TASK-0266)

## Decision
Rewrite ACKit as TypeScript (strict, ESM) on Node.js LTS, distributed as an npm package; CLI command `ackit`. Development via pnpm with exact `packageManager` pin and committed lockfile. Dev tooling: Vitest (test+coverage), tsc typecheck to `dist/` with source maps, one combined lint/format tool. Lint/format tool confirmed: **Biome** — single binary covers lint+format with no plugin configuration surface, keeping toolchain minimal per MS§5.5.

## Node targets
Verified 2026-08-22 against the official Node.js release schedule (`nodejs/release` schedule.json): v22 LTS (maintenance until 2027-04-30), v24 LTS (active, EOL 2028-04-30), v26 current (LTS begins 2026-10-28). **Supported set: `>=22`, CI matrix lines 22 and 24** (≥2 LTS lines per REQ-ARCH-003). Both lines satisfy official MCP SDK engine requirement (`>=18`).

## Rationale
vNext must run where coding agents run (npx), integrate official MCP TS SDK natively, and shed the .NET distribution friction. pnpm gives strict node_modules and frozen-lockfile CI. Single lint/format tool keeps toolchain minimal (MS§5.5).

## Consequences
C# v1 runtime leaves the product path on this branch (REQ-ARCH-001). All v1 release immutability rules remain untouched (history preserved).
