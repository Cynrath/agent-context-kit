---
id: "TASK-0033"
title: "Public benchmark/demo evidence"
status: pending
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: null
---


## Purpose

Create reproducible public evidence across ~20 public OSS repositories and multiple ecosystems, with pinned SHAs, offline analysis only, plus maintainable demos for readiness/optimize/graph/profile/dashboard/Action/diagnostics, publishing safe methodology + aggregate data.

## Context

- Benchmark system exists (`benchmarks/run.mjs`, `generate-fixtures.mjs`, `thresholds.json`) but public evidence across real OSS repos not yet published.
- Need to avoid marketing claims, secret leakage, and forbidden operations in third-party repos.

## Goal

- Safe, reproducible, offline-only analysis evidence published in canonical docs + hosted docs.

## In scope

- Clone ~20 public OSS repositories (e.g., `vercel/next.js`, `facebook/react`, `microsoft/vscode`, `nodejs/node`, `golang/go` is Go but we scan via ACKit filesystem only, `python/cpython`, `rust-lang/rust`, `denoland/deno`, `sveltejs/svelte`, `vuejs/core`, `angular/angular`, `expressjs/express`, `prisma/prisma`, `supabase/supabase`, `obsidianmd/obsidian` is closed? pick public, `microsoft/TypeScript` etc.) — pin exact SHAs for each (record `git rev-parse HEAD` after shallow clone `depth 1` then full? but pin via `git fetch --depth 1 origin <sha>` or record origin default branch SHA at clone time).
- Allowed operations in those clones: `clone`, `read files`, `run ACKit's static/offline analysis` (`scan`, `readiness`, `instructions`, `pack` via SDK or CLI). No `npm/pnpm/yarn install`, `pip install`, `dotnet restore/build`, `cargo build`, `go test`, `repository scripts/hooks`, skills execution, arbitrary binaries.
- Run deterministic analysis: for each repo, `node dist/cli/index.js scan --json` + `readiness --json` + `instructions --json` (or SDK `scanRepository`), capture findings count, readiness score, time (`coldScanMs` via `performance.now`), `filesScanned`, but never publish raw secret-like findings (redacted aggregate only).
- Publish safe methodology + aggregate data in `docs/benchmarks/public-evidence.md` (or `docs/reference/benchmarks.md` + `docs/guides/benchmarks.md`) and hosted docs `agent-context-kit/benchmarks/index.html` via TASK-0031 sync.
- Create maintainable demos: `examples/demo-readiness-before-after.md`, `examples/demo-optimize-explain.md`, `examples/demo-instruction-graph.md`, `examples/demo-provider-pack.md`, `examples/demo-dashboard.md`, `examples/demo-github-action.md`, `examples/demo-diagnostics.md` — each with `README.md` + fixture repo snippet + command + expected output (against built CLI, verified).
- Ensure `ackit` operations are offline: no network during analysis (use disconnect harness if needed).
- Pin SHAs file: `benchmarks/public-repos.json` with `{name, url, sha, ecosystem}`.

## Out of scope

- `npm install` in third-party repos (prohibited).
- Publishing raw secret findings.
- Executing third-party repository code/scripts.
- Making unsupported marketing claims ("fastest").
- Installing arbitrary binaries.

## Affected files

- `benchmarks/public-repos.json` (new, pinned SHAs)
- `benchmarks/run-public.mjs` or `scripts/benchmark-public.mjs` (new, offline harness) OR reuse `benchmarks/run.mjs` with `--public-repos` flag
- `docs/benchmarks/public-evidence.md` (new) AND `docs/reference/benchmarks.md` update if exists
- `examples/demo-*` (new or update)
- `docs/guides/benchmarks.md` (if exists, add methodology link)

## Technical design

- Create `benchmarks/public-repos.json`:
  ```json
  [
    {"name":"microsoft/TypeScript","url":"https://github.com/microsoft/TypeScript.git","sha":"<40hex>","ecosystem":"typescript"},
    {"name":"vercel/next.js","url":"...","sha":"...","ecosystem":"typescript"},
    ...
  ]
  ```
  Generate via script that does `git ls-remote https://github.com/microsoft/TypeScript.git HEAD | cut -f1` (network allowed for maintainer cloning phase — distribution/maintainer may use network). But analysis itself offline.
- Script `benchmarks/run-public.mjs`:
  - For each entry: `git clone --depth 1 --branch <default> <url> /tmp/bench-<name>` or `git init + fetch sha` for exact pin.
  - Then run `process.chdir(repoPath)` and `scanRepository({canonicalPath})` via SDK (no CLI spawn with network). Measure `coldScanMs`.
  - Aggregate: `totalFiles`, `totalFindings`, `medianReadiness`, `ecosystems` breakdown.
  - Write `benchmarks/public-evidence.json` with aggregate, not per-file secrets.
- Safe publish: docs contain methodology (how clones done, SHAs pinned, offline guarantee, forbidden ops excluded), aggregate table:
  `| Repo | SHA (short) | Files | Findings | Readiness | coldScanMs |` but findings already redacted counts only, no secret evidence.
- Demos: each `examples/demo-*` contains minimal fixture (create temp fixture with known instructions) and `README.md` showing `ackit readiness --json` output snippet verified vs CLI.

## Security

- No secret findings published; only counts/redacted aggregates.
- No execution of third-party code.
- Offline guarantee: even during analysis, harness denies egress (reuse offline-runtime harness).

## Tests

| Class | Command | Gate |
|---|---|---|
| lint | `pnpm lint` | PASS |
| unit | verify `benchmarks/public-repos.json` valid JSON, 20 entries, sha 40hex | PASS |
| integration | run benchmarks/run.mjs on 1 public repo temp clone in CI? | PASS (if network allowed, else manual) |
| safety | grep `AKIA|ghp_` in `docs/benchmarks/public-evidence.md` == 0 | PASS |
| demo | `ls examples/demo-*` has 6+ demos, each `ackit --help` valid | PASS |

## Acceptance criteria

- [ ] `benchmarks/public-repos.json` pinned exact SHAs (~20 repos, multiple ecosystems typescript/javascript/python/go/rust/php)
- [ ] Script `benchmarks/run-public.mjs` exists, offline-only analysis, no forbidden ops, deterministic
- [ ] `docs/benchmarks/public-evidence.md` publishes safe methodology + aggregate data, no raw secrets
- [ ] Hosted docs `agent-context-kit/benchmarks/index.html` contains same aggregate (via sync script integration)
- [ ] Demos maintained for readiness before/after, optimize explain, instruction graph, provider pack, dashboard, GitHub Action, diagnostics (each verified vs built CLI)
- [ ] No `npm install` etc. in third-party repos
- [ ] `pnpm test` green, `git diff --check` clean

## Risks

- Cloning 20 repos large → use `--depth 1` shallow, clean after, or use fixture approach if CI network unavailable.
- GitHub rate limiting → SHAs pinned once, clones cached? But CI must be offline-safe; if network unavailable in CI, evidence is pre-generated locally and committed.

## Rollback plan

Delete `benchmarks/public-repos.json` and evidence docs via `git revert`.

## Completion notes

(placeholder) — include aggregate table, SHA list (short), script output, demo list, offline guarantee note.
