# Performance Policy

## Scope
Performance evidence currently covers offline repository enumeration, stack detection, risk scanning, and CLI rendering. It does not cover remote services because the MVP makes no remote calls.

## Synthetic Benchmark
Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/measure-scan-performance.ps1 -FileCount 2000 -MaxSeconds 30 -FailOnThreshold
```

The script creates a disposable repository under the user temp directory, writes a mixed synthetic non-sensitive corpus, runs the built Release CLI directly, reports elapsed wall-clock time and peak working set, and deletes the fixture.

Use `-VerifyInterruption` for the local interruption probe. It terminates only the owned disposable `dotnet` scan process and verifies that no `.ackit/` output or source-sentinel mutation remains. The CLI still does not expose an in-process scan cancellation token.

## Current Threshold
- 2,000 synthetic source files.
- Mixed small/medium text, Markdown, JSON, YAML, CSV, TypeScript/C#, binary, and over-1-MiB files.
- 30-second local ceiling.
- 512 MiB peak-working-set ceiling.
- Exit code must be `0`.
- Threshold is a regression tripwire, not a production SLA.

The generous ceilings are intended to catch accidental pathological behavior across ordinary maintainer machines. Actual timings and working set vary with filesystem, antivirus, CPU, SDK/runtime startup, and disk cache. Peak working set is an observed process-level value, not a managed-heap budget or capacity guarantee.

## TASK-0233 Local Evidence

Recorded on 2026-07-10 using the 2,000-file default mixed profile:

| Evidence | Result |
| --- | --- |
| Distribution | 746 small text, 1,000 medium text, 4 oversized text, 250 binary |
| Elapsed | 5.185 seconds; PASS under 30 seconds |
| Peak working set | 44.6 MiB; PASS under 512 MiB |
| Interruption probe | PASS; owned process terminated, no `.ackit/` output, sentinel unchanged |
| Unreadable text behavior | PASS; deterministic fake-filesystem test skips `UnauthorizedAccessException` without findings/failure |
| Focused tests | 2/2 PASS |

This evidence is local and machine-specific. It advances V100-07 but does not replace final-candidate hosted confirmation.

## Resource Boundaries
- Scanner file reads are local and sequential in the current implementation.
- Generated HTML previews and tables are capped.
- Build/output directories are excluded by default.
- No cancellation token or explicit managed-memory budget is currently exposed by the CLI. TASK-0233 verifies process interruption and observes peak working set without claiming graceful in-process cancellation.

## Release-Candidate Evidence Still Required
- A successful manual `.github/workflows/release-candidate-evidence.yml` run on Windows, Ubuntu, and macOS for the selected final candidate, using the expanded mixed-corpus/time/memory script.
- Review any runner-specific timing or peak-working-set variance before final acceptance.

Mixed corpus, peak memory, process interruption, and unreadable-file behavior now have local evidence. V100-07 remains open until the final-candidate hosted rerun is reviewed.
