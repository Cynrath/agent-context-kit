# TASK-0233: V100 performance and resource evidence expansion

## Purpose

Advance V100-07 with reproducible local mixed-corpus timing, peak-memory, interruption, and unreadable-file evidence while preserving the CLI contract and the non-SLA boundary.

## Verified starting state

- TASK-0230 recorded a 2,000-file uniform corpus at 5.446 seconds standalone and 7.635 seconds through the RC gate, below 30 seconds.
- The existing benchmark records elapsed time only and creates uniform small `.cs` files.
- `docs/PERFORMANCE_POLICY.md` identifies mixed file sizes/extensions, peak memory, cancellation/interruption, and unreadable-file behavior as missing evidence.
- The synchronous CLI does not expose a cancellation token; process interruption is the current user boundary.

## Dependencies

- TASK-0232 decisions and source-of-truth reconciliation completed.
- Release build exists for the no-build benchmark invocation.

## Scope

- Extend `scripts/measure-scan-performance.ps1` to create a sanitized mixed corpus, record peak working set, enforce a conservative memory tripwire, and optionally verify process interruption without source mutation or generated output.
- Add focused tests for the benchmark contract and unreadable text-file behavior.
- Update performance, RC evidence, release validation, and V100 gap documentation with actual results.
- Keep the result a regression tripwire, not an SLA or production-scale guarantee.

## Out of scope

- New CLI options, async scanner rewrite, parallel scanning, caching, or dependency additions.
- Claiming graceful in-process cancellation support.
- Hosted three-OS evidence or V100-07 closure before final-candidate hosted rerun.

## Planned files

- `scripts/measure-scan-performance.ps1`
- `tests/AgentContextKit.Tests/PerformanceResourceEvidenceTests.cs`
- `docs/PERFORMANCE_POLICY.md`
- `docs/RELEASE_CANDIDATE_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- this task file and active queue/handoff state

## Implementation steps

1. Generate deterministic proportions of small/medium text, configuration, Markdown, JSON, and oversized/binary-like files from synthetic content.
2. Execute the built CLI directly, capture stdout/stderr, elapsed time, exit code, and peak working set.
3. Add optional interruption verification against the disposable corpus and assert no generated `.ackit/` artifact or source mutation.
4. Add a deterministic fake-filesystem test that proves unreadable text files are skipped safely.
5. Run focused tests plus mixed-corpus/resource benchmark and record exact values.

## Data/database impact

None. Fixtures are disposable temp-directory data and are deleted in `finally`.

## Admin impact

None.

## Security impact

Synthetic content only; no repository upload, telemetry, external service, secret, PII, or private path is written to committed evidence.

## Permission/auth impact

None. Unreadable-file behavior is tested through an in-memory fake boundary, not ACL mutation.

## SEO/i18n impact

None. CLI localization and technical tokens are unchanged.

## Logging/audit impact

Benchmark output records only counts, profile, seconds, MiB, thresholds, and pass/fail state.

## Acceptance criteria

1. Default benchmark uses a documented mixed corpus and still accepts the existing required command.
2. Peak working set is printed and checked against a conservative documented threshold.
3. Optional interruption verification terminates the disposable scan and confirms no generated output/source mutation.
4. Unreadable text-file behavior has deterministic cross-platform test coverage.
5. Focused tests and benchmark pass; no CLI or JSON contract changes.
6. V100-07 is advanced but remains open pending final-candidate hosted confirmation unless all done evidence is available.
7. One local commit contains this task only.

## Validation commands

```powershell
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build --filter "FullyQualifiedName~PerformanceResourceEvidenceTests"
powershell -ExecutionPolicy Bypass -File scripts/measure-scan-performance.ps1 -FileCount 2000 -MaxSeconds 30 -FailOnThreshold -VerifyInterruption
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1 -FailOnIssues
ackit doctor
ackit scan --ci
git diff --check
```

## Risks

- Flaky machine-dependent limits. Mitigation: retain generous timing/memory tripwires and document non-SLA semantics.
- Orphaned benchmark process/temp data. Mitigation: direct process ownership and `finally` cleanup.
- Binary fixture self-noise. Mitigation: sanitized extensions/content and explicit expected exit 0.

## Rollback plan

Revert the TASK-0233 commit; the previous uniform timing-only benchmark returns unchanged.

## Completion-state requirements

- Actual timing, peak memory, interruption result, focused test count, and commit are recorded.
- No temp benchmark output or `.ackit/` artifact is tracked.
- TASK-0234 becomes current.

## Completion notes

Planned. No performance result is claimed before execution.
