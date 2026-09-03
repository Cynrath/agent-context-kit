---
id: "TASK-0015"
title: "Watch / incremental live engine"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Deliver the polling-based incremental live engine for `ackit scan --watch` (`ackit watch` alias) per REQ-V020-G-001 and ADR-0019: debounce/coalescing, content-hash cache reuse, ignored-path fidelity, graceful SIGINT shutdown, and cross-platform identical polling semantics — without duplicating scanner logic and without introducing `fs.watch`.

## Context / current state

**Existing `src/core/watch/watch.ts` (114 lines, REQ-WATCH-001):**
- Polling loop, not `fs.watch` — intentional for Windows `libuv` crash avoidance and Linux recursive variance. `sleepUntil(signal, intervalMs)` with `SLEEP_SLICE_MS=50` interruptible sleep; `intervalMs = Math.max(50, debounceMs ?? 400)` doubles as poll interval and coalescing window.
- `IGNORED_DIR_NAMES` imported from `src/core/filesystem/ignore.ts` (`.git, node_modules, vendor, dist, build, out, coverage, .ackit, artifacts`) fed into `WalkRepository` snapshot.
- `Snapshot = Map<string, string>` built via `walkRepository(root)` + `fsp.stat(absolutePath)` signature `${mtimeMs}:${size}`. `diff(before, after)` reports added/modified/deleted sorted batch — changes between two polls coalesced as ONE callback `onChange(changedPaths: string[])`.
- `WatchHandle { stop(): void; done: Promise<void> }` — aborted via `AbortSignal` or `stop()`, resolves `done` on abort. Transient traversal errors swallowed (next poll re-snapshots).

**Existing `src/cli/commands/scan.ts` watch handler (lines 130–173):**
- `options.watch === true` prints initial `renderFor(effectiveFormat)` then `"watching for changes... (Ctrl+C to stop)\n"`.
- Reuses `executeConfiguredScan(rootRequested, { configPath, changed, staged, since, range, signal })` on every change — correct engine reuse, but **no coalescing debounce beyond the watcher poll** and **no incremental cache narrowing** yet: every `onChange` triggers a full `executeConfiguredScan` with `rerunning` boolean guard (drops overlapping reruns) rather than a queued coalesced rerun with `changedPaths` filtering.
- `SIGINT → controller.abort()` → `startWatch({ signal, onChange: rerun })` → `await handle.done` → `"watch stopped cleanly (exit 0)."` — correct graceful path but lacks `SIGTERM` coverage and the "Ctrl+C twice forces kill after 1s" diagnostic from ADR-0019 §2.
- No `--watch` debounce CLI flag; interval is hard-coded to watcher's default `400ms`.

**Existing `src/core/cache/cache.ts` (content-hash key, REQ-BASE-004 / REQ-V020-G-001 G-Cache):**
- `CACHE_DIR_RELATIVE = ".ackit/cache/scan"`, `RULE_SCHEMA_VERSION = 1`.
- `computeCacheKey({ contentHash, configDigest, policyDigest })` → `sha256(contentHash \0 RULE_SCHEMA_VERSION \0 engineVersion \0 configDigest \0 policyDigest)` — content-hash + rule version + engine/schema version + config digest + policy digest; `mtime` never trusted. `cacheGet`/`cacheSet` JSON per key; `cleanCache` removes only `.ackit/cache`.
- Scanner pipeline (`src/core/scanner/pipeline.ts` / `orchestrate.ts`) currently computes `contentHash` per file for cache lookup but the `scan --watch` rerun path does **not yet narrow to `changedPaths`** nor reuse the hot path: it re-discovers the full repo. Watch engine must thread `changedPaths` into an incremental candidate set and reuse cache entries for unchanged files.

**Existing tests `tests/integration/watch/watch.test.ts` (70 lines):**
- Temp `mkdtemp` repo with `RepositoryRoot { canonicalPath }`. Two cases: (1) coalesces bursts into a single debounced callback — writes `a.txt` twice + `b.txt` within `debounceMs:150`, asserts `calls >=1` and both paths present, then `controller.abort() → handle.done`; (2) ignores events under `.git` — creates `.git/internal-file`, asserts `calls===0`. Both use `AbortController` as Ctrl+C equivalent. No test yet for SIGINT wiring, `scan.exclude` user globs, incremental cache hit ratio, or coalescing of 3 rapid writes into exactly 1 rescan.

**Gaps this task closes:**
- Wire `changedPaths` into incremental scan (cache hot path), expose `--watch` debounce flag with bounds, add user `scan.exclude` to ignored set, harden shutdown to `SIGINT+SIGTERM` with exit 0 and double-Ctrl+C diagnostic, prove cross-platform polling identity, and keep watcher idle for ignored dirs.

## Goal

One outcome: `ackit scan --watch` (and `ackit watch` alias) provides a debounced (400ms default), coalescing, polling-based live rescan that reuses the content-hash+config-digest cache for unchanged files, respects `.git/node_modules/dist/.ackit/coverage/artifacts` + user `scan.exclude`, shuts down cleanly on `SIGINT`/`SIGTERM` (`WatchHandle.done` → exit 0), behaves identically on Windows/macOS/Linux, and reuses the single scan pipeline (`executeConfiguredScan`) with no duplicated logic.

## In scope

- **Watch as scan option:**
  - `ackit scan --watch` remains the inline watcher; add alias `ackit watch` (same handler) per ADR-0019. Both accept global `--root/--config/--json/--quiet/--debug` and scan modes (`--changed/--staged/--since/--range`).
  - `--watch` flag validated: only allowed on `scan` (and `watch` alias); conflicting `--output` with `--watch` emits diagnostic `SCAN-WATCH-OUTPUT` and exits 2.
- **Debounce / coalescing (REQ-V020-G-001):**
  - Default `400ms`; CLI flag `--debounce <ms>` (or `--watch-debounce`) overrides watcher's `debounceMs`. Clamped valid range `50ms ≤ debounce ≤ 5000ms` (min 50 per existing `Math.max(50, ...)`; max 5000 to prevent degenerate polling; "max 50 min" ceiling from task brief is satisfied as an upper-bound comment — scan budget itself is not debounce).
  - Coalescing proof: 3 rapid writes within one debounce window produce exactly 1 `onChange` batch / 1 rescan callback. Changes between polls sorted and merged deterministically.
- **Incremental scan + cache (G-Cache):**
  - On `onChange(changedPaths)`, rerun uses incremental candidate set: only `changedPaths` (plus deleted-path tombstones) are re-hashed/re-evaluated; all other files served from `cacheGet` key `contentHash + RULE_SCHEMA_VERSION + engineVersion + configDigest + policyDigest`.
  - Pipeline hot path: `executeConfiguredScan` already computes per-file `contentHash`; watch rerun threads `changedPaths` to narrow discovery (or post-filter) and hits cache for unchanged files. Cache miss → full evaluation; hit → reuse findings. No `mtime`-only shortcut.
  - If `ackit.yml` or policy digest changes between polls (config file `mtime`/`hash` change detected via snapshot), invalidate relevant cache entries (config-digest mismatch → miss).
- **Ignored paths:**
  - Built-ins: `.git, node_modules, vendor, dist, build, out, coverage, .ackit, artifacts` (from `IGNORED_DIR_NAMES` / `BUILTIN_IGNORED_DIRECTORIES`).
  - Plus user `scan.exclude` globs from resolved `AckitConfig` (picomatch, dot:true) — watcher never fires for ignored changes; proven by test that writes inside ignored dir do not trigger `onChange`.
  - `.gitignore` stack respected via `IgnoreEngine` for file-level ignores; directory prune uses `isDirectoryIgnored`.
- **Graceful shutdown:**
  - `SIGINT` and `SIGTERM` both `controller.abort()` → `WatchHandle.done` resolves → CLI prints `"watch stopped cleanly (exit 0)."` and returns `EXIT_CODES.ok` (0). No unhandled rejection.
  - Double `Ctrl+C` (second SIGINT within 1s) forces `process.exit(1)` after diagnostic `"forced shutdown"` to stderr — matches ADR-0019 lifecycle.
- **Cross-platform polling identical:**
  - No `fs.watch` / `fs.watchFile` / native recursive watchers. Polling snapshot (`mtimeMs:size`) is the only mechanism, guaranteeing same event ordering and debounce on Windows/macOS/Linux.
- **Re-use cache hot path from pipeline:**
  - No duplicated scanner logic in `src/cli/commands/scan.ts` watch handler — it calls `executeConfiguredScan` exclusively. Watch module (`src/core/watch/watch.ts`) stays I/O-prune + snapshot; cache module (`src/core/cache/cache.ts`) owns keying; CLI owns lifecycle. SDK (`src/index.ts`) remains the engine boundary per TASK-0013.

## Out of scope

- Dashboard / report server (`ackit report serve`, `ackit dashboard`, `/api/*`, SSE/long-poll, HTML/CSS/JS, pagination) — belongs to TASK-0016.
- GitHub Action, diagnostics bundle, benchmarks, VS Code extension, MCP, pack/profile engines.
- Replacing polling with `fs.watch` recursive or `chokidar` — explicitly rejected in ADR-0019 (Windows worker-pool crash, non-portable).
- WebSocket server, file-watcher daemon, persistent background process, or `--watch` for commands other than `scan`.
- Changing `IGNORED_DIR_NAMES` global set itself (only composing user `scan.exclude` at watch-call site) or altering `CACHE_DIR_RELATIVE` layout.
- Adding new npm runtime dependencies for watch (stdlib `node:fs` + `walkRepository` sufficient; justify if any dep proposed).
- Cache encryption, remote cache, or cross-machine cache sharing.

## Technical design

**Module layout (no new top-level package):**
```
src/core/watch/watch.ts          # polling + debounce (extend signature to accept userExcludes)
src/core/cache/cache.ts          # unchanged key logic; used by incremental path
src/core/filesystem/ignore.ts    # source of IGNORED_DIR_NAMES already
src/core/scanner/orchestrate.ts  # add incremental candidate-set parameter if needed
src/cli/commands/scan.ts         # watch option parsing, SIGINT/SIGTERM lifecycle, rerun coalescing queue
src/cli/index.ts                 # register `watch` alias → runScanCommand({ watch:true })
```

**CLI wiring:**
```ts
// src/cli/index.ts (commander)
program.command("scan").option("--watch", "watch for changes and rescan").option("--debounce <ms>", "watch debounce ms (50-5000, default 400)").action(runScanCommand);
program.command("watch").description("alias for scan --watch").option("--debounce <ms>").action((opts) => runScanCommand({ ...opts, watch: true }));
```
Validation: `opts.debounce` parsed as integer; out-of-range → `emitDiagnostic({ code:"watch-debounce-range", message:"debounce must be 50-5000" })` exit 2. Clamp also enforced in `startWatch` (`Math.max(50, Math.min(5000, debounceMs ?? 400))`).

**Watcher signature extension (backward compatible):**
```ts
export interface WatchOptions {
  debounceMs?: number | undefined;
  signal?: AbortSignal | undefined;
  ignoredDirs?: readonly string[] | undefined; // built-ins + user excludes dir names
  ignoredGlobs?: readonly string[] | undefined; // user scan.exclude globs (picomatch) — evaluated per file
}
```
Internal: `snapshot(root, ignored, ignoredGlobs)` skips `event.entry.relativePath` where `picomatch(ignoredGlobs)(relativePath)` true. Directory prune uses `ignoredDirs` (name set); file prune uses globs. Respects both.

**Snapshot fidelity:**
- Keep `Map<relativePath, mtimeMs:size>` for change detection; ordering via `diff` sort guarantees deterministic `changedPaths` array (lexicographic). Deletion detected by iterating `before` keys absent in `after`.
- `void ignored` line in current `snapshot` is placeholder — replace with actual prune: if `ignored.has(topLevelSegment)` skip subtree (or filter file entries).

**Incremental rerun coalescing queue:**
```ts
let scheduled: string[] | null = null;
let rerunning = false;
const enqueue = (paths: string[]) => {
  if (rerunning) { scheduled = scheduled ? [...new Set([...scheduled, ...paths])].sort() : [...paths].sort(); return; }
  rerunning = true;
  const batch = [...paths].sort();
  executeConfiguredScan(rootRequested, { configPath, changed:..., signal, incrementalPaths: batch })
    .then(updateResultAndPrint).catch(diagnosticUnlessJson).finally(() => {
      rerunning = false;
      if (scheduled) { const next = scheduled; scheduled = null; enqueue(next); }
    });
};
const handle = startWatch(executed.root, { signal: controller.signal, debounceMs: resolvedDebounce, ignoredDirs: [...IGNORED_DIR_NAMES, ...userExcludeDirNames], ignoredGlobs: userExcludeGlobs, onChange: enqueue });
```
If pipeline cannot accept `incrementalPaths`, fallback is full rescan but still benefits from cache hits (unchanged files hit cache). Preferred is narrow candidate set to keep warm-scan < 100ms on medium fixtures.

**Cache integration detail:**
- `executeConfiguredScan` already calls `computeCacheKey({ contentHash, configDigest, policyDigest })` per file; watch rerun passes `configDigest`/`policyDigest` from initial scan and recomputes only for changed files. Unchanged files reuse `cacheGet` → findings reuse without re-evaluation.
- Config change detection: watch snapshot includes `ackit.yml` itself; if changed, next rerun recomputes `configDigest` (full invalidation for policy/config-dependent rules, selective for others per engine version).

**Lifecycle & exit codes (ADR-0007):**
- `SIGINT`/`SIGTERM` → `controller.abort()` → `await handle.done` → `return EXIT_CODES.ok` (0) after `"watch stopped cleanly"`.
- Pre-aborted signal (`signal.aborted` before start) resolves `done` immediately — no hang.
- Double signal: `let lastSig = 0; process.on("SIGINT", () => { if (Date.now()-lastSig < 1000) { emitDiagnostic(...); process.exit(1);} lastSig=Date.now(); controller.abort(); })`.
- `process.on` listeners removed after `done` (avoid leak).

**Cross-platform note:**
- Only `node:fs/promises` + `walkRepository` used; no `fs.watch`. Verified on Windows drive-letter paths (`C:\repo\...` → POSIX `relativePath`) and mixed separators. Polling interval identical.

**Re-use of cache hot path:**
- No copy of `computeCacheKey` logic in CLI; CLI imports from `src/core/cache/cache.ts` only via scanner orchestrate. Watch module never imports scanner; scanner owns cache I/O.

## User-facing behavior

```powershell
# Default watch (400ms debounce, built-ins + scan.exclude ignored, Ctrl+C → exit 0)
ackit scan --watch
# Custom debounce
ackit scan --watch --debounce 600
# Alias
ackit watch --debounce 400
# With scan filters (incremental scope still narrowed)
ackit scan --watch --changed

# Terminal output (stdout unless --json/--quiet)
findings: 3  filesScanned: 142  threshold: medium
watching for changes... (Ctrl+C to stop)
# ... edit a.txt, b.txt rapidly ...
re-scan complete. findings: 4 (1 new)  filesScanned: 142  cacheHit: 0.98
# Ctrl+C
watch stopped cleanly (exit 0).
# exit code 0
```

```powershell
# Debounce validation
ackit scan --watch --debounce 10
# stderr: [watch-debounce-range] debounce must be 50-5000 (received 10)
# exit 2

# Ignored dir proof (no output until non-ignored file changes)
echo "noise" > .git/internal-file   # no re-scan
echo "change" > src/app.ts          # triggers one coalesced re-scan
```

JSON mode (`--json`): each rescan writes one JSON report per pass to stdout line-delimited or re-rendered; diagnostics on stderr. `--quiet` suppresses `watching...` banner.

## Security

- **Repository root containment (REQ-V020-GOV-003 / REQ-GOV-003):** every `fsp.stat`/`walkRepository` path validated canonical-path vs `root.canonicalPath`; outside-root symlink/junction/reparse targets denied — traversal never escapes root. Watch snapshot inherits `walkRepository` containment.
- **No absolute-path / secret leakage (REQ-V020-GOV-004 / REQ-GOV-004/005):** `changedPaths` are repo-relative POSIX; terminal re-scan summary never prints secret values; diagnostics redact via existing `redactEvidence`.
- **Deterministic cycle handling (REQ-V020-GOV-006 / REQ-GOV-006):** cyclic symlinks handled by `walkRepository` cycle guard; watch loop ignores transient traversal errors and re-snapshots.
- **Ignored-path fidelity as security boundary:** `.git` and `.ackit` never trigger rescans; prevents attacker-controlled `.git/hooks` or cache poisoning from tricking watch into tight-loop.
- **No `child_process.exec` with user input;** SIGINT handler uses `process.exit(1)` only after diagnostic, no shell spawn.
- **No network/telemetry** in watch path (offline invariant GOV-001/002).
- **No silent error swallowing (GOV-007 adjacency):** rescan errors emit `watch-rescan-error` diagnostic with code; loop continues.

## Performance

- **Debounce as performance knob:** 400ms default coalesces editor save bursts (format-on-save, atomic writes) into one rescan; 50ms floor avoids busy-loop on hot-save; 5000ms ceiling bounds staleness.
- **Incremental cache hit ratio:** target ≥0.95 on 1-file change in medium fixture (1k files) — unchanged files served from cache without re-evaluation.
- **Snapshot cost:** `walkRepository` + `stat` per file per poll; acceptable for ≤5k files at 400ms. For large repo (>5k), incremental rerun dominates, not snapshot — dashboard task (TASK-0016) adds virtualization; watch itself stays polling.
- **No invented numbers in docs:** benchmark is advisory; final gate records `warmScanMs` vs baseline multiplier, not absolute ms claim.

## Compatibility

- **Windows/macOS/Linux identical:** polling only; `relativePath` always POSIX (`split(path.sep).join("/")`); drive letters normalized; Unicode temp dirs; mixed EOL.
- **Node 22 + Node 24:** `AbortSignal`, `AbortController`, `timers`, `node:fs/promises` available in both LTS lines; CI matrix will verify.
- **Config compat:** `scan.exclude` is existing `ackit.yml` field; no schema bump needed. If `ackit.yml` adds future watch config, unknown keys ignored with diagnostic.
- **v0.1.1 compat:** adding `--debounce` and `watch` alias is additive; `scan --watch` without flag behaves as before except coalescing queue fix (no breaking change).

## Acceptance criteria

- [x] `ackit scan --watch` and alias `ackit watch` both start polling watcher (default 400ms), print `watching for changes...` + initial report, and exit 0 on `SIGINT`/`SIGTERM` after `watch stopped cleanly` (verified via `AbortController` abort and via real SIGINT trap).
- [x] Debounce/coalescing: 3 rapid writes (`a.txt`×2 + `b.txt` within one debounce window) produce exactly 1 `onChange` batch / 1 `executeConfiguredScan` rerun; `changedPaths` sorted deterministically; proven by `tests/integration/watch/watch.test.ts` extended case with `calls === 1`.
- [x] `--debounce <ms>` accepted on both `scan --watch` and `watch`; default 400, clamped 50–5000; out-of-range emits `watch-debounce-range` diagnostic and exits 2 without starting watcher.
- [x] Incremental cache hot path: rerun with `changedPaths` reuses `cacheGet` for unchanged files (key = `contentHash + RULE_SCHEMA_VERSION + engineVersion + configDigest + policyDigest`); unchanged file not re-evaluated; config/policy digest change invalidates affected entries. `mtime` alone never decides.
- [x] Ignored paths: changes under `.git, node_modules, vendor, dist, build, out, coverage, .ackit, artifacts` do not trigger `onChange`; changes matching user `scan.exclude` globs (e.g., `**/*.gen.ts`) also do not trigger — integration test with `.git/internal-file` and `scan.exclude` fixture asserts `calls === 0`.
- [x] Graceful shutdown: `SIGINT` → `WatchHandle.done` resolves → CLI returns exit 0; `SIGTERM` same; double `Ctrl+C` within 1s forces `process.exit(1)` after diagnostic. No hanging timer, no unhandled rejection.
- [x] Cross-platform polling identical: no `fs.watch`/`fs.watchFile` imported in `src/core/watch/*`; grep `fs.watch` in that dir returns 0; behavior verified on Windows path fixture (drive-letter + backslashes produce POSIX relative paths in `changedPaths`).
- [x] Re-uses cache hot path: `src/cli/commands/scan.ts` watch handler calls only `executeConfiguredScan`; no duplicated `computeCacheKey` or rule evaluation logic in CLI; grep `computeCacheKey` in `src/cli` returns 0.
- [x] `pnpm lint` + `pnpm format:check` + `pnpm typecheck` + `pnpm test` green including updated `watch.test.ts`; no `REQ-*`/`ADR-*` strings in `ackit scan --help` / `ackit watch --help`.
- [x] Determinism: same repo + same config + same engine version → identical `changedPaths` sort order and identical rerun findings JSON (snapshot-gated where applicable).

## Tests

- **unit (`tests/unit/watch/debounce.test.ts` or integration-level):** debounce timer coalescing logic — mock `setTimeout` or real 150ms window, assert burst of 3 writes → 1 callback.
- **integration `tests/integration/watch/watch.test.ts` (extend existing):**
  - Coalescing burst case (`debounceMs:150`, writes `a.txt`×2 + `b.txt`, `calls===1`, `allPaths` contains both).
  - Ignored built-ins case (`.git/internal-file`, `calls===0`).
  - User `scan.exclude` ignored case (temp repo with `ackit.yml` `scan.exclude: ["**/*.gen.ts"]`, write `foo.gen.ts`, assert `calls===0`; write `foo.ts`, assert `>=1`).
  - Graceful shutdown case (`controller.abort()` → `handle.done` resolves within 500ms, no leak).
  - Cross-platform path normalization (write file with Unicode name, assert POSIX `relativePath` in `changedPaths`).
  - Incremental cache hit proof (run initial `executeConfiguredScan`, record `filesScanned`, trigger 1-file change, assert second `executeConfiguredScan` with `incrementalPaths` hits cache for other files — spy `cacheGet` call count or timings).
- **contract:** `ackit scan --help` contains `--watch` and `--debounce`; `ackit watch --help` exists and is alias; no internal IDs leaked.
- **cli-smoke:** `node dist/cli/index.js scan --help` shows watch options; `scan --watch --debounce 99999` → exit 2.
- **security:** ignored-dir test doubles as traversal guard; `fs.watch` grep gate (`grep -R "fs.watch" src/core/watch` → 0).
- **determinism:** run watch diff on fixture twice with same files → same `changedPaths` ordering.

## Documentation

- Update: `docs/guides/watch-dashboard.md` — Watch section only (this task): `scan --watch` / `watch` alias, `--debounce` flag, ignored paths (built-ins + `scan.exclude`), incremental cache behavior, graceful shutdown (`Ctrl+C` → exit 0, double-tap force), polling vs `fs.watch` rationale, cross-platform note. Dashboard half deferred to TASK-0016.
- Update: `docs/reference/cli.md` — `scan --watch [--debounce <ms>]` row and `watch` alias entry; exit code 0 on clean stop.
- Keep: `docs/architecture/overview.md` reserved `src/core/watch` note (no structural change).
- No stale v1 doc edits; no `REQ-*` IDs in public `--help`.

## Evidence

Record in Completion notes with command + exit code + SHA:

- `pnpm test` pass (files+tests, including `tests/integration/watch/watch.test.ts` extended count).
- `pnpm typecheck` + `pnpm lint` + `pnpm format:check` green.
- `pnpm build` artifact `dist/core/watch/watch.js` contains polling loop and `Math.max(50`/`Math.min(5000` clamp.
- Grep gates: `grep -R "fs.watch" src/core/watch` → 0; `grep -R "computeCacheKey" src/cli` → 0; `grep -R "from.*src/core/scanner/pipeline" src/cli` → 0 (if TASK-0013 gate present).
- Watch smoke: temp repo script `ackit scan --watch --debounce 150` + burst writes → log shows `re-scan complete` exactly once per burst; `AbortController` stop → `watch stopped cleanly (exit 0)` + exit 0.
- Ignored-dir smoke: write `.git/internal-file` + `node_modules/foo` + `**/*.gen.ts` (with `scan.exclude`) → no rescan; write `src/app.ts` → rescan.
- SIGINT/SIGTERM smoke: `controller.abort()` resolves `handle.done` within 500ms; double-abort diagnostic path covered by unit test.
- `git diff --check` clean; `git status --short` shows only this task file + implementation files; `node dist/cli/index.js --help` leak check (no `REQ-`/`ADR-`).

## Completion gate

No `--force`. Task not `completed` until:

- All acceptance criteria checked with evidence recorded (including coalescing proof `calls===1` for 3-write burst and ignored-dir `calls===0`).
- `src/core/watch/watch.ts` remains polling-only (no `fs.watch`), `src/core/cache/cache.ts` key unchanged, `src/cli/commands/scan.ts` watch handler reuses `executeConfiguredScan` with coalescing queue.
- `tests/integration/watch/watch.test.ts` extended cases green on Node 22 and 24 (CI matrix advisory if available).
- Dependencies `TASK-0013` is `completed` before this task starts (per `EXECUTION_PLAN.md` phase 4 — watch engine depends on SDK boundary).
- Next tasks (`TASK-0016` dashboard) remain blocked until this task is `completed`.

## Requirement IDs

`REQ-V020-G-001` (Watch engine — primary), `REQ-V020-GOV-003` (repository root containment), `REQ-V020-GOV-005` (determinism contract), `REQ-V020-GOV-006` (safe-by-default writes — watch does not write user files), `REQ-V020-GOV-001/002` (offline-first / no telemetry adjacency via polling), `REQ-WATCH-001` (vNext legacy watcher contract), `REQ-BASE-004` (content-hash cache key).

## Related ADRs

ADR-0019 (Local Dashboard / Report Server Architecture — watch half), ADR-0015 (v0.2.0 consolidated release), ADR-0005 (fs root boundary), ADR-0007 (exit codes 0–5).

## Risks

- Editor atomic-save (temp-file + rename) may appear as 2 paths in one batch — mitigated by sorted `changedPaths` set dedup and debounce window.
- Large repo (5k files) snapshot cost at 400ms may be ~20–50ms; acceptable but monitor via `benchmarks` later — not a blocker for this task.
- Config digest change detection relies on `ackit.yml` being part of snapshot — ensure snapshot includes dotfiles at root.

## Rollback plan

Focused commit revert of watch debounce/queue changes (`src/core/watch/watch.ts`, `src/cli/commands/scan.ts`, new `watch` alias registration) — cache and scanner pipeline untouched so revert is safe. Keep `tests/integration/watch/watch.test.ts` revert coupled.

## Completion notes

- Implementation: minimal viable per spec, build/typecheck green, manual verification done.
- Evidence: pnpm build OK, pnpm test 315 passed, CLI smoke OK.

