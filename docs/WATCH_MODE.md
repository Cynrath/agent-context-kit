# Local Watch Mode Design

## Purpose
Design a local-only `ackit watch` command that re-runs the safe scan pipeline on file changes with debounce and a compact diff-first status output. The mode stays local-only, never opens a network connection, and supports `Ctrl+C` cancellation.

## Command Surface

```text
ackit watch [--debounce-ms 500] [--lang en|tr] [--json]
```

- `--debounce-ms N`: minimum interval between re-runs; default `500`.
- `--lang en|tr`: human output language; default `en`.
- `--json`: emit JSON-only output.

## Behavior

1. Resolve repository root.
2. Create a `FileSystemWatcher` rooted at the repository, with the existing Core `FileSystem` and an internal debounce helper.
3. Subscribe to `Created`, `Changed`, `Renamed`, and `Deleted` events.
4. Filter events by an ignore list that always includes:
   - `.git/`
   - `.ackit/`
   - `bin/`, `obj/`
   - generated `.html`, `.sarif`, `.json` outputs in well-known temp paths
   - editor swap and lock files (`*.swp`, `*~`, `.#*`)
5. Coalesce bursts of events inside `--debounce-ms`.
6. Re-run the same scan pipeline used by `ackit scan`, but print a compact diff-first status (added/removed/severity-changed finding counts) instead of the full table.
7. Stop on `Ctrl+C` (cancellation token).
8. Exit with code `0` on `Ctrl+C`, `1` only if a re-run itself fails, `2` for invalid invocation, and `3` for scanner/internal error.

## Security Boundary

- Local-only; no network connection.
- No telemetry.
- No persistent state.
- No daemon or service installation.
- Cancellation token stops the watcher cleanly.
- No background HTTP listener; stdio is the only surface.

## Testability

- The debounce helper is isolated behind an interface and unit-tested for debounce behavior, ignore-list filtering, and cancellation.
- The watcher does not start in the unit test suite to avoid sleeping; the integration smoke is a short manual run with a `time` shell wrapper.
- No new contract fixture depends on a wall-clock value.

## Risks

- `FileSystemWatcher` is inherently platform-specific and can drop events on bursty systems.
- Watcher spam can degrade local UX without debounce.
- Tests must not block on a real watcher.

## Fallback

If reliable testability is not available, ship this design and queue implementation behind a later task; do not fake completion.

## Implementation Plan: Step 1

TASK-0189 implements the previously design-only command. The Core abstractions live under `src/AgentContextKit.Core/Watcher/`:

- `FileWatcherEvent` and `FileWatcherChangeKind` record the normalized relative path, the kind, and the timestamp.
- `IFileWatcher` interface plus `PhysicalFileWatcher` (production) and `FakeFileWatcher` (tests).
- `PhysicalFileWatcher` is backed by `System.IO.FileSystemWatcher` with `IncludeSubdirectories = true`, a 64 KiB internal buffer, and subscriptions to `Created`, `Changed`, `Renamed`, and `Deleted`. Full paths are converted to repo-relative paths with `/` separators before raising events. Event handlers are wrapped in `try/catch` so a buggy subscriber cannot bring the watcher down.
- `WatchDebouncer` coalesces bursts of events inside a configurable window. The default is 500 ms. It accepts an injected clock so unit tests can drive decisions deterministically.
- `WatchIgnoreFilter` always blocks `.git`, `.hg`, `.svn`, `bin`, `obj`, `out`, `publish`, `node_modules`, `.pnp`, `.vs`, `.vscode`, `.idea`, `.next`, `.turbo`, and `.cache`. It also blocks any path that starts with one of the documented generated prefixes: `.ackit/cache`, `.ackit/reports`, `.ackit/webui`, `.ackit/prompt-packs`, `.ackit/context-exports`, `.ackit/sarif`, `.ackit/baseline`, and `.remember`. Editor swap patterns (`*.swp`, `*.swo`, `*~`, `.#*`, `*.tmp`, `*.bak`) and generated single-file outputs (`*.html`, `*.sarif`, `*.jsonl` at the repo root) are also blocked.
- `ScanChangeReportBuilder` wraps `BaselineClassifier.CreateManifest` and `BaselineDiffCalculator.Compare` to produce a small report DTO with added / removed / unchanged / severityChanged counts and a 25-row sample for each category. No raw match text or absolute local path is included.
- `WatchRunner` is the Core orchestration entry point. It runs the initial scan, subscribes the watcher, applies the ignore filter and debouncer, and re-runs the scan on each coalesced event. It returns a `WatchResult` with the counts. `WatchOptions` carries debounce, max runtime, one-shot, language, JSON, repository path, config, and an injected clock.

The CLI command `ackit watch` is a thin wrapper around `WatchRunner`. The CLI dispatches options, runs the runner, and writes the last `ScanChangeReport` (or a human-readable summary) to `Console.Out`. `Ctrl+C` cancels the runner; `--once` runs one scan and exits; `--max-runtime-ms <N>` caps wall clock and exits `0` on timeout. Invalid invocation of `--debounce-ms` (zero or negative) returns `1` with the localized `Invalid argument` message.

### Exit Codes

- `0`: clean shutdown via `Ctrl+C`, `--once`, or `--max-runtime-ms` timeout.
- `1`: invalid invocation (e.g. `--debounce-ms 0`).
- `2`: reserved; not used by the watch command.

### Local-Only Guarantees

- No network. No telemetry. No external tool call. No child process spawn.
- No persistent state across runs.
- No source mutation.
- The watcher does not read `Console.In` and never writes a banner, version, or help line on startup. It writes exactly one line per debounced change (or one JSON envelope with `--json`) and exits cleanly on cancellation.

## Linked Docs

- `docs/NO_NETWORK_DEFAULT_POLICY.md`
- `docs/CLI_REFERENCE.md`
- `docs/ROADMAP.md`
