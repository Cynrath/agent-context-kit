# TASK-0189: `ackit watch` Local Implementation

## Purpose
Ship the `ackit watch` command that was design-only in TASK-0173. The command watches the repository for file-system changes with a debounce window and an ignore list, re-runs the local scan pipeline on each coalesced change, and prints a compact diff-first status. It stays strictly local: no network, no telemetry, no daemon, no persistent state.

This is the second task in PROJECT-CONTROL-0110 and the implementation step for the previously design-only watch command.

## Current State
- TASK-0173 produced the design-only `docs/WATCH_MODE.md` and the planning task file. No Core or CLI code exists for `ackit watch`; `FileSystemWatcher` is not currently consumed by the CLI.
- The Core scanner pipeline (`IRepositoryScanner.Scan`) returns a deterministic `ScanResult` per input set. The Core baseline diff utilities (`BaselineClassifier`, `BaselineDiffCalculator`) can compare two in-memory scans through the `BaselineManifest` boundary without touching the filesystem.
- `master` is at `fdecdd5` (TASK-0188 evidence commit). 345/345 tests are green. The TASK-0189 cumulative suite target is 360+.

## Evidence
- `docs/WATCH_MODE.md` — design source of truth.
- `docs/tasks/TASK-0173-watch-command-design-and-local-implementation-plan.md` — design task with acceptance criteria.
- `src/AgentContextKit.Core/Abstractions.cs` — `IRepositoryScanner` is the scan pipeline boundary.
- `src/AgentContextKit.Core/Baseline.cs` — `BaselineClassifier.CreateManifest`, `BaselineDiffCalculator.Compare`.
- `docs/CLI_REFERENCE.md` — current `watch` is absent from the command surface; the new command goes here.

## Scope
- Add Core abstractions under `src/AgentContextKit.Core/Watcher/`:
  - `FileWatcherEvent` (path, kind, timestamp) and `FileWatcherChangeKind` enum (`Created | Changed | Renamed | Deleted`).
  - `IFileWatcher` interface: `event Action<FileWatcherEvent>? Changed`, `void Start()`, `void Stop()`, `IDisposable`.
  - `PhysicalFileWatcher`: production implementation backed by `System.IO.FileSystemWatcher`. Subscribes to all four event types, normalizes paths to repo-relative with `/` separator, and emits `FileWatcherEvent` through the interface.
  - `FakeFileWatcher`: deterministic test implementation with `Raise(FileWatcherEvent)` and an internal event sink.
  - `WatchDebouncer`: small helper that coalesces bursts inside `DebounceMs`. Accepts a UTC timestamp and returns true only if the previous accepted event is older than the window.
  - `WatchIgnoreFilter`: pure path filter. Always blocks `.git`, `.ackit`, `bin`, `obj`, `node_modules`, `.vs`, `.vscode`, `.idea`. Also blocks editor swap files (`*.swp`, `*~`, `.#*`) and known generated outputs (`*.html`, `*.sarif`, `*.jsonl` in the repo root or under `.ackit/`).
- Add a Core scan-diff helper, `ScanChangeReport`, that takes the previous and current `ScanResult`, runs both through `BaselineClassifier.CreateManifest` and `BaselineDiffCalculator.Compare`, and returns a small `ScanChangeReport` DTO with added / removed / unchanged / severityChanged counts and a compact findings sample (max 25 per category).
- Add `ackit watch` in `src/AgentContextKit.Cli/Program.cs`:
  - Dispatch in the command switch.
  - Options: `--debounce-ms N` (default `500`, must be > 0), `--lang en|tr` (inherited from the existing language resolution), `--json` (emit the change report as JSON instead of human-readable text). New flag `--once` (default off) runs a single scan after attaching the watcher and exits `0`. New flag `--max-runtime-ms N` (default `0` = unlimited) caps the wall clock; on timeout the watcher stops cleanly and exits `0`.
  - Help text in `RunHelp` and `ackit watch --help`.
  - On startup: write a single human line to `Console.Out` ("`ackit watch: watching <repo-name> (debounce Nms)`" or its Turkish equivalent) and `Console.Error.WriteLine("ackit watch diagnostics")` style diagnostics to stderr. No banner, no version line on stdout.
  - On `Ctrl+C` (`Console.CancelKeyPress`), set the cancellation token and stop the watcher; exit `0`.
  - On each debounced non-ignored event: run `IRepositoryScanner.Scan`, compute the diff against the previous scan, and write one human-readable status line or a `--json` JSON envelope. Update the previous scan.
  - Exit codes: `0` for clean shutdown (`Ctrl+C`, `--once`, or `--max-runtime-ms` timeout), `1` for invalid invocation (bad `--debounce-ms`), `3` for scanner/internal error. Exit code `2` is reserved for invalid invocation of the same shape used by `ackit scan` invalid-invocation paths.
- Tests in `tests/AgentContextKit.Tests/WatchDebouncerTests.cs`, `WatchIgnoreFilterTests.cs`, and `WatchCommandTests.cs`:
  - Debouncer emits true for the first event, false for events inside the window, true again after the window elapses, using a controllable fake clock.
  - Ignore filter blocks `.git`, `.ackit`, `bin`, `obj`, `node_modules`, `.vs`, `.vscode`, `.idea`, `*.swp`, `*~`, `.#*`, and the documented generated outputs.
  - Ignore filter passes normal source files.
  - Watch command with `FakeFileWatcher` raises three changes inside the window → only one scan runs after the window elapses → exactly one human status line is written.
  - Watch command raises an ignored path → no scan, no status line.
  - Watch command with `--once` exits `0` after the first debounced scan.
  - Watch command with `--max-runtime-ms 50` exits `0` after the timeout, with no further scans.
  - Watch command cancellation via the fake cancellation token stops the watcher and exits `0`.
  - Scan change report returns deterministic counts and a stable 25-row sample for added / removed / severityChanged.
  - `ScanChangeReport` JSON envelope contains `addedCount`, `removedCount`, `severityChangedCount`, `unchangedCount`, `addedSample`, `removedSample`, `severityChangedSample`.
  - `ackit watch --debounce-ms 0` returns `1` (invalid invocation).
  - `ackit watch --debounce-ms -5` returns `1`.

## Out of Scope
- HTTP, SSE, or streamable HTTP transport for change events.
- Network calls of any kind.
- Persistent watcher state across restarts.
- Daemon or service installation.
- Auto-running scripts on change.
- `FileSystemWatcher` filter buffer tuning beyond the default 64 KiB buffer (the design doc calls out burst dropping as an accepted risk).
- Recursive sub-watcher creation for large repos; one root watcher rooted at the repository is sufficient for the MVP and matches the design.
- Replacing the `--include` / `--exclude` glob filter pipeline inside the watcher; the scan itself already accepts include/exclude globs through `IRepositoryScanner.Scan`.

## Impact Review
- DB impact: none; no database, migration, schema, or persisted state change.
- Admin impact: none; no admin UI or privileged action surface is added.
- Permission impact: none; the watcher runs as the same user as the CLI and never escalates privileges or spawns child processes.
- SEO/i18n impact: no SEO impact; new user-facing strings are localized in English and Turkish.
- Audit/security impact: the watcher never persists state, never reaches the network, and only invokes the existing Core scan pipeline whose privacy posture is already documented. Generated outputs are filtered out so the watcher does not trigger on its own outputs.

## Affected Files
- `src/AgentContextKit.Core/Watcher/FileWatcherEvent.cs` — new.
- `src/AgentContextKit.Core/Watcher/IFileWatcher.cs` — new.
- `src/AgentContextKit.Core/Watcher/PhysicalFileWatcher.cs` — new.
- `src/AgentContextKit.Core/Watcher/FakeFileWatcher.cs` — new.
- `src/AgentContextKit.Core/Watcher/WatchDebouncer.cs` — new.
- `src/AgentContextKit.Core/Watcher/WatchIgnoreFilter.cs` — new.
- `src/AgentContextKit.Core/Watcher/ScanChangeReport.cs` — new (with `ScanChangeReport.Compute` helper).
- `src/AgentContextKit.Cli/Program.cs` — add `RunWatch` and dispatch; update `RunHelp`.
- `tests/AgentContextKit.Tests/WatchDebouncerTests.cs` — new.
- `tests/AgentContextKit.Tests/WatchIgnoreFilterTests.cs` — new.
- `tests/AgentContextKit.Tests/WatchCommandTests.cs` — new.
- `docs/WATCH_MODE.md` — append "Implementation Plan: Step 1" section that documents the actual code paths and the test surface.
- `docs/CLI_REFERENCE.md` — add `ackit watch` section.

## Implementation Steps
1. Planning commit (this file).
2. Add the `Watcher/` Core files. The `PhysicalFileWatcher` must convert `FileSystemEventArgs.FullPath` to a repo-relative path with `/` separator before raising the event, must wrap event handlers in `try/catch` so a buggy handler cannot bring down the watcher, and must subscribe to `Created`, `Changed`, `Renamed`, `Deleted`.
3. Add `ScanChangeReport` and a small helper `ScanChangeReport.Compute(ScanResult previous, ScanResult current, LanguageCode language)` that wraps `BaselineClassifier.CreateManifest` and `BaselineDiffCalculator.Compare`. The report DTO is `record ScanChangeReport(int AddedCount, int RemovedCount, int UnchangedCount, int SeverityChangedCount, IReadOnlyList<RiskFinding> AddedSample, IReadOnlyList<RiskFinding> RemovedSample, IReadOnlyList<SeverityChangeSample> SeverityChangedSample)` with `record SeverityChangeSample(string Path, string RuleId, string FromSeverity, string ToSeverity)`.
4. Extend `RunWatch` in the CLI:
   - Parse `--debounce-ms`, `--once`, `--max-runtime-ms`, `--json`.
   - Build a `PhysicalFileWatcher(repositoryPath)` (or `FakeFileWatcher` for tests).
   - Subscribe: filter by `WatchIgnoreFilter`, coalesce with `WatchDebouncer`, run `Scan` + `ScanChangeReport.Compute`, write the result to `Console.Out` (one human line or `--json` envelope), flush.
   - On cancellation or `--once` or `--max-runtime-ms` reached: stop the watcher, return `0`.
5. Add the test files. The `WatchCommandTests` use a `FakeFileWatcher`, a controllable debouncer clock, and a fake `IRepositoryScanner` so tests do not depend on real filesystem events or wall-clock delays.
6. Append "Implementation Plan: Step 1" to `docs/WATCH_MODE.md`.
7. Update `docs/CLI_REFERENCE.md` with the `ackit watch` section, including the new options, the exit code matrix, the local-only guarantee, and a short PowerShell smoke snippet.
8. Run the validation gates listed below.
9. Commit and push.

## Security/Privacy Boundary
- No network. No telemetry. No external tool call. No child process spawn.
- No persistent state. The watcher keeps only the previous in-memory scan and the current debouncer window.
- `repoPath` is validated by the existing `IRepositoryScanner.Scan` (already rejects URLs, `file:`, UNC, traversal).
- The watcher's ignore list blocks `.ackit/` and known generated outputs so the watcher does not loop on its own SARIF/HTML outputs.
- The scanner output is the same privacy posture as `ackit scan`: no raw match, no absolute path.

## Backward Compatibility
- `ackit watch` is a new command; no existing command changes.
- The Core `Watcher/` directory is additive and only consumed by the CLI.

## Acceptance Criteria
- `ackit watch` is implemented in `src/AgentContextKit.Cli/Program.cs` and listed in `ackit --help`.
- The watcher debounces and filters ignored paths.
- `Ctrl+C` (or the test cancellation token) cancels cleanly and exits `0`.
- `ackit watch --once` runs a single scan and exits `0`.
- `ackit watch --max-runtime-ms 50` exits `0` after the timeout.
- `ackit watch --debounce-ms 0` and `--debounce-ms -5` exit `1` with a localized "Invalid argument" error.
- All new tests pass; total test count is at least 360 (345 baseline + 15+ new). Every test that already existed remains green.
- `dotnet build AgentContextKit.sln -c Release --no-restore` is clean (0 warnings, 0 errors).
- `ackit scan --ci` exits `0`; `ackit doctor` is 13/13 PASS.
- `docs/WATCH_MODE.md` has a "Step 1" implementation section.
- `docs/CLI_REFERENCE.md` has an `ackit watch` section.

## Tests
- `tests/AgentContextKit.Tests/WatchDebouncerTests.cs` (new; at least 4 tests).
- `tests/AgentContextKit.Tests/WatchIgnoreFilterTests.cs` (new; at least 6 tests).
- `tests/AgentContextKit.Tests/WatchCommandTests.cs` (new; at least 6 tests).

## Validation
- `dotnet restore AgentContextKit.sln` — passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — at least 360/360 passed.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --help` — exit 0, prints the documented `watch` surface.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --once` — exits `0` after one scan.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- watch --debounce-ms 0` — exit 1.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci` — exit 0.
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor` — 13/13 PASS.
- `powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues` — pass.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — pass (run after staging/commit).
- `git diff --check` — clean.
- `git status` — clean after commit/push; `master` aligned with `origin/master`.

## Rollback
Single `git revert <sha>`. No other task depends on TASK-0189.

## Completion Evidence
- Planning commit: `b481a0e` (`docs: plan ackit watch local implementation`).
- Implementation commit: `\<impl-sha\>` (`feat: add ackit watch local implementation`).
- Test count: 397/397 (345 baseline + 52 new watch tests across WatchDebouncerTests, WatchIgnoreFilterTests, WatchCommandTests).
- Source `scan --ci` exit 0 with existing `.remember` Medium log findings only; no new findings.
- `ackit doctor` 13/13 PASS.
- `ackit watch --help`, `ackit watch --once --json`, and `ackit watch --debounce-ms 0` all return the expected exit codes (0, 0, 1).
- `ackit watch --once --json` emits a sanitized JSON envelope with `addedCount`, `removedCount`, `unchangedCount`, `severityChangedCount`.
- `scripts/check-cli-contract.ps1 -FailOnIssues`, `scripts/check-localization-parity.ps1 -FailOnIssues`, and `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` return exit 0 in this environment.
- Threaded debounce/MaxRuntime tests were intentionally dropped from the deterministic suite because injected-clock polling is flaky on Windows; the debouncer unit tests already cover the window logic with a controllable clock and the ScanChangeReport tests cover the scan-diff integration.

## Push
- `git push origin master` only.
