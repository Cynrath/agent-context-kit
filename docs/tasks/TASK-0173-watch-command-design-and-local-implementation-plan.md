# TASK-0173 `ackit watch` Design And Local Implementation Plan

## Purpose
Design and, only if safe, implement a local-only `ackit watch` command that re-runs the scan pipeline on file changes with debounce and a compact diff-first status.

## Current State
- No watch mode exists.
- The agent context kit is offline-first; no network is used by the scan pipeline.
- File-system change events are not currently consumed by the CLI.

## Evidence
- `ackit --help` does not list a `watch` command.
- The Core scanner pipeline accepts a list of files and produces deterministic findings.

## Scope
- Add `ackit watch [--debounce-ms 500] [--lang en|tr] [--json]`.
- Local-only `FileSystemWatcher` (or platform equivalent).
- Ignore `.git/`, `.ackit/`, `bin/`, `obj/`, generated reports, and package outputs.
- Debounce change events to avoid duplicate runs.
- On change, run the scan pipeline and print a compact diff-first status.
- Support `Ctrl+C` cancellation.
- Localized messages in English and Turkish.

## Out Of Scope
- Network calls.
- Persisting watcher state across restarts.
- Daemon mode or background service installation.
- Running on every keystroke or on editor swap files.

## Affected Files
- `src/AgentContextKit.Cli/**` (watch command)
- `src/AgentContextKit.Core/**` (watcher interface and debounce helper)
- `tests/AgentContextKit.Tests/**` (watcher unit tests)
- `docs/WATCH_MODE.md`
- `docs/CLI_REFERENCE.md`
- `docs/NO_NETWORK_DEFAULT_POLICY.md`

## Implementation Steps
1. Design the watcher behind an interface in Core.
2. Implement debounce and path filtering helpers.
3. Add the `watch` command in Cli with cancellation support.
4. Localize new user-facing strings.
5. If reliable testability is not available, ship design-only and queue implementation behind a later task.

## Security/Privacy Boundary
- Local-only.
- No network.
- No telemetry.
- No persistent state.

## Backward Compatibility
- Adds a new command; existing commands unchanged.

## Acceptance Criteria (if implemented)
- Watcher debounces and filters ignored paths.
- `Ctrl+C` cancels cleanly.
- Scan output is deterministic per change.
- Unit tests cover debounce and ignore-list filtering without long sleeps.
- English and Turkish messages exist.
- Existing test suite remains green.

## Acceptance Criteria (if design-only)
- `docs/WATCH_MODE.md` documents the design, including ignored paths, debounce, and cancellation.
- Risks and testability boundaries are recorded.
- Existing test suite remains green.

## Tests
- Debounce helper emits a single event for a burst of changes.
- Ignore-list filters `.git/`, `.ackit/`, `bin/`, `obj/`, and known generated outputs.
- Cancellation token stops the watcher.
- Command-level smoke test exists for `ackit watch` with a short timeout.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- Manual smoke: `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- watch --debounce-ms 500 --lang en` in a temp directory.

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation or design commit.

## Commit
- `feat: add local watch mode` (if implemented)
- `docs: design local watch mode` (if design-only)

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
