# TASK-0171 `ackit diff` For Baselines

## Purpose
Add read-only `ackit diff` to compare two baseline snapshots and classify findings as added, removed, unchanged, severity-escalated, or severity-reduced.

## Current State
- Baseline schema version: `1`.
- JSON schema version: `2`.
- Existing baseline classification is documented in `docs/BASELINE_MODEL.md`.

## Evidence
- `ackit baseline --output <repo-relative.json>` produces a baseline file.
- The baseline model already records `Existing` and `New` classes per finding.

## Scope
- Add `ackit diff --from <from.json> --to <to.json> [--lang en|tr] [--json]`.
- Classify findings by `ruleId` + `path` + `match`.
- Report `added`, `removed`, `unchanged`, `severityEscalated`, `severityReduced` counts.
- Use repository-relative paths only.
- Localized messages in English and Turkish.

## Out Of Scope
- Mutating either baseline file.
- Network calls.
- Implementing a remote baseline store.
- Changing the baseline schema version.

## Affected Files
- `src/AgentContextKit.Cli/**` (diff command)
- `src/AgentContextKit.Core/**` (baseline comparison)
- `tests/AgentContextKit.Tests/**` (diff tests)
- `docs/BASELINE.md`
- `docs/BASELINE_MODEL.md`
- `docs/JSON_OUTPUT.md`
- `docs/CLI_REFERENCE.md`

## Implementation Steps
1. Add `diff` command with `--from`, `--to`, `--lang`, `--json` flags.
2. Implement classification logic in Core.
3. Localize new user-facing strings.
4. Add tests for classification, JSON output, and invalid input.

## Security/Privacy Boundary
- Read-only.
- No mutation of input files.
- No network.
- Repository-relative paths only.

## Backward Compatibility
- Adds a new command; existing commands unchanged.
- JSON schema is additive and version `2` remains stable.

## Acceptance Criteria
- Added finding detected.
- Removed finding detected.
- Unchanged finding detected.
- Severity escalation detected.
- Severity reduction detected.
- Invalid baseline path returns exit code `2`.
- JSON output is deterministic.
- English and Turkish messages exist.
- Existing test suite remains green.

## Tests
- Added finding detected.
- Removed finding detected.
- Unchanged finding detected.
- Severity escalation detected.
- Severity reduction detected.
- Invalid baseline path handled safely.
- JSON output stable/deterministic.

## Validation
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- diff --from .ackit/tmp/before.json --to .ackit/tmp/after.json --lang en --json`

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after implementation and tests.

## Commit
- `feat: add baseline diff command`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
