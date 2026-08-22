# TASK-0284: vNext reporting SARIF markdown html watch hooks

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0270, TASK-0279
- Unlocks: TASK-0289 (report smoke gates)
- Requirement IDs: REQ-RPT-001, REQ-RPT-002, REQ-WATCH-001, REQ-WATCH-002, REQ-SCAN-007 remainder, REQ-GOV-005
- Related ADR/spec: MS§21–23

## Purpose

Complete the reporter matrix (SARIF/Markdown/HTML + optional local report UI) and the watch/hooks operational features.

## Scope

- SARIF 2.1.0 writer per REQ-RPT-001; Markdown summary; self-contained HTML (inline assets only); optional `report serve` bound to 127.0.0.1 with explicit override flag for anything else.
- `scan --watch`: debounce, incremental re-evaluation via TASK-0279 APIs, AbortSignal on Ctrl+C, clean exit codes, ignored-dir respect.
- Hooks installer: install/uninstall/status for pre-commit staged scan; existing-hook preservation with chained invocation; ownership markers.

## Out of scope

Remote report hosting; framework-based UI.

## Affected files

- `src/core/reporting/**`, `src/cli/commands/report.ts`, watch/hook modules
- `tests/unit/reporting/**`, `tests/integration/reporting/**`, `tests/integration/watch/**`

## Data/database impact

None.

## Security impact

SARIF/HTML outputs pass secret-leak and control-char sanitation suites; serve binds loopback by default (test asserts).

## Permission/auth impact

None.

## Localization impact

English report chrome.

## UX impact

Watch feedback latency bounded by incremental path (benchmark hook in TASK-0288).

## Logging/audit impact

Report files include tool version + policy digest headers.

## Acceptance criteria

- [ ] SARIF output validates against official schema sample in contract test; rule IDs/locations correct on fixture findings.
- [ ] HTML renders fully offline (no external URL refs — regex gate).
- [ ] Watch integration test: file change triggers single re-scan after debounce window; Ctrl+C abort path exits 0 cleanly.
- [ ] Hook install preserves pre-existing user hook content byte-exact; uninstall removes only owned lines.
- [ ] report serve refuses 0.0.0.0 without explicit flag (exit 2/4 per taxonomy).

## Test steps

`pnpm vitest run tests/unit/reporting tests/integration/reporting tests/integration/watch`.

## Risks

fs event storms → coalescing covered by debounce tests.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
