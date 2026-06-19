# TASK-0190: `ackit watch` Debounce + Ignore-List + Cancellation Unit Tests

## Purpose
Expand the deterministic unit-test surface for the `ackit watch` command implemented in TASK-0189. The tests added here exercise the edge cases that the initial implementation test set did not cover: path normalization (Windows backslashes), zero-window debounce behavior, concurrent burst handling, watcher disposal safety, cancellation semantics, and the documented ignore-list variations. All tests use `FakeFileWatcher` and the injectable clock so they do not depend on real file-system timing or wall-clock sleeps.

This is the third task in PROJECT-CONTROL-0110. It does not change runtime behavior; it only adds tests.

## Current State
- TASK-0189 implemented the Core watcher abstractions and the CLI command. 397/397 tests are green.
- Existing test files: `WatchDebouncerTests.cs` (7 tests), `WatchIgnoreFilterTests.cs` (36 tests), `WatchCommandTests.cs` (9 tests). The debouncer and filter tests already use an injectable clock and a pure path filter; the watch-command tests use the `FakeFileWatcher`.
- The watcher's `MaxRuntime` and threaded behavior is covered indirectly; the tests added here close gaps in path normalization, debounce-window boundaries, watcher disposal, and cancellation semantics.

## Evidence
- `src/AgentContextKit.Core/Watcher/WatchDebouncer.cs` — debouncer with injectable clock.
- `src/AgentContextKit.Core/Watcher/WatchIgnoreFilter.cs` — pure path filter.
- `src/AgentContextKit.Core/Watcher/FakeFileWatcher.cs` — test fake with `Raise` and `Raised` history.
- `src/AgentContextKit.Core/Watcher/WatchRunner.cs` — orchestration entry point.
- `tests/AgentContextKit.Tests/WatchDebouncerTests.cs`, `WatchIgnoreFilterTests.cs`, `WatchCommandTests.cs` — current coverage.

## Scope
Add tests to the existing test files (no new test files; this keeps the suite surface small):

- In `WatchDebouncerTests.cs`:
  - Zero window accepts every distinct timestamp (already covered; add a stronger variant with monotonically increasing timestamps and confirm each is accepted).
  - Equal timestamp to last accepted is rejected (window of 500 ms, two events at exactly the same timestamp).
  - Window boundary is inclusive at the exact window edge.
  - Reset() between two accepts allows immediate second accept (already covered).
- In `WatchIgnoreFilterTests.cs`:
  - Windows-style backslash paths (`src\\bin\\foo.dll`) are normalized and ignored.
  - Mixed separators (`src\\bin/foo.dll`) are normalized and ignored.
  - File at root `README.md` is not ignored.
  - Empty segments (`src//foo.cs`) are tolerated and not ignored when the rest is a normal source path.
  - Path `.ackit/cache` (without trailing slash) is treated as a generated prefix.
- In `WatchCommandTests.cs`:
  - One-shot with `MaxRuntime = 0` runs exactly one scan (already covered; add a second variant that asserts the `LastReport` is non-null).
  - Empty `RepositoryPath` raises `ArgumentException` from `PhysicalFileWatcher` (covered at Core type boundary; the CLI is responsible for passing a valid path; this test pins the boundary).
  - `FakeFileWatcher.Dispose()` is idempotent and does not throw.
  - `FakeFileWatcher.Raise` after `Stop` still records into `Raised` for test inspection.
  - Cancellation through the watcher event handler when `OneShot = false` is exposed: the runner returns the partial result it has when the loop exits via the injected clock passing the deadline. We do not block on a real wall clock; we drive the injected clock past the deadline and confirm `WatchRunner.Run` returns within a small wall-clock budget.

## Out of Scope
- New Core types or new public methods on existing types.
- Real `FileSystemWatcher` integration tests.
- Wall-clock-based debounce integration tests (covered separately in `WatchCommandTests` through the synchronous `OneShot` path).
- Stress or load tests.

## Impact Review
- DB impact: none.
- Admin impact: none.
- Permission impact: none.
- SEO/i18n impact: none.
- Audit/security impact: none; the tests assert documented behavior without changing it.

## Affected Files
- `tests/AgentContextKit.Tests/WatchDebouncerTests.cs` — add 2 tests.
- `tests/AgentContextKit.Tests/WatchIgnoreFilterTests.cs` — add 5 tests.
- `tests/AgentContextKit.Tests/WatchCommandTests.cs` — add 3 tests.

## Implementation Steps
1. Planning commit (this file).
2. Extend `WatchDebouncerTests.cs` with the boundary tests above.
3. Extend `WatchIgnoreFilterTests.cs` with the normalization tests.
4. Extend `WatchCommandTests.cs` with the disposal and cancellation tests.
5. Run the test suite and verify no regression.
6. Implementation commit.
7. Push.

## Acceptance Criteria
- New tests run in under one second combined.
- All existing tests remain green.
- The watch-command cancellation test uses the injected clock only (no `Thread.Sleep` longer than 50 ms).

## Tests
- 10 new tests total (2 debouncer + 5 filter + 3 watch command).

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` — all green; total at least 407/407.

## Rollback
Single `git revert <sha>`. No runtime change.

## Completion Evidence
- Planning commit: `7349fc7` (`docs: plan task 0190 watch edge case tests`).
- Implementation commit: `8b6d4d5` (`test: add watch edge case tests`).
- Test count: 407/407 (397 baseline + 10 new edge case tests across WatchDebouncerTests, WatchIgnoreFilterTests, WatchCommandTests).

## Push
- `git push origin master` only.
