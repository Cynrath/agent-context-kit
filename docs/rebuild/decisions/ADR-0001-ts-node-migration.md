# ADR-0001: TypeScript/Node.js/npm migration & toolchain

Status: Proposed (confirm in TASK-0266) · Date: 2026-08-22

## Decision
Rewrite ACKit as TypeScript (strict, ESM) on Node.js LTS, distributed as an npm package; CLI command `ackit`. Development via pnpm with exact `packageManager` pin and committed lockfile. Dev tooling: Vitest (test+coverage), tsc typecheck to `dist/` with source maps, one combined lint/format tool (Biome preferred; final choice justified here at confirmation).

## Node targets
Two current LTS lines (candidates 22/24 as of 2026-08); exact versions verified against MCP SDK + tooling engines during TASK-0266 and recorded here.

## Rationale
vNext must run where coding agents run (npx), integrate official MCP TS SDK natively, and shed the .NET distribution friction. pnpm gives strict node_modules and frozen-lockfile CI. Single lint/format tool keeps toolchain minimal (MS§5.5).

## Consequences
C# v1 runtime leaves the product path on this branch (REQ-ARCH-001). All v1 release immutability rules remain untouched (history preserved).
