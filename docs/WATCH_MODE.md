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

## Linked Docs

- `docs/NO_NETWORK_DEFAULT_POLICY.md`
- `docs/CLI_REFERENCE.md`
- `docs/ROADMAP.md`
