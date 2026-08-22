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

- [x] SARIF output validates against official schema sample in contract test; rule IDs/locations correct on fixture findings.
- [x] HTML renders fully offline (no external URL refs — regex gate).
- [x] Watch integration test: file change triggers single re-scan after debounce window; Ctrl+C abort path exits 0 cleanly.
- [x] Hook install preserves pre-existing user hook content byte-exact; uninstall removes only owned lines.
- [x] report serve refuses 0.0.0.0 without explicit flag (exit 2/4 per taxonomy).

## Test steps

`pnpm vitest run tests/unit/reporting tests/integration/reporting tests/integration/watch`.

## Risks

fs event storms → coalescing covered by debounce tests.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/reporting/sarif.ts` — SARIF 2.1.0: driver rules registry from unique finding ruleIds, level mapping (critical/high→error, medium→warning, low→note), repo-relative POSIX artifact URIs, startLine/startColumn regions, ackit/v1 fingerprint bag, per-result properties incl. suppression + policyDigest.
- `src/core/reporting/documents.ts` — Markdown summary (severity table + grouped findings, policy digest header) and self-contained HTML (inline <style> only, HTML-entity escaping for all dynamic text; zero external link/script tags).
- `src/core/watch/watch.ts` — debounced watcher coalescing fs events into one onChange batch with sorted repo-relative paths; ignored-dir filtering via shared ignore list; AbortSignal → clean close/resolve (Ctrl+C ⇒ exit 0).
- `src/core/watch/hooks.ts` — pre-commit hook installer appending a marker-delimited managed block (`ackit scan --staged --ci || exit 1`); existing foreign hooks preserved byte-exact with chaining semantics; idempotent re-install; uninstall strips only owned lines; status query.
- `src/core/reporting/serve.ts` + CLI — `report serve <file> [--host] [--port] [--allow-nonlocal]`: assertBindableHost refuses non-loopback without the explicit flag (exit 2); minimal in-memory HTTP server, no-store caching. scan gains --format terminal|json|sarif|markdown|html, --output <file>, --watch; hooks gains install/uninstall/status.

Tests (43 files / 218 tests total, all green; three consecutive full-suite runs identical):
- unit/reporting: SARIF structure (version/driver rules/levels/URIs/regions/fingerprints, backslash normalization), markdown table+entries, HTML offline regex gate (no <script>/<link>/external src|href) + XSS-escape check.
- integration/reporting: SARIF artifact persisted from findings contains no raw fixture secret; serve refusal matrix + real loopback listen/fetch/close; hook lifecycle byte-exactness (user prefix kept, single marker after reinstall, owned-lines-only removal).
- integration/watch: burst coalescing to a single callback with both changed paths; abort resolves done; .git events ignored.
- Fixed flakiness found under full-suite parallelism: stdio smoke now gates on expected frame count with drain grace instead of fixed sleeps (root cause: finishing before the tools/call response frame arrived).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · vitest 43 files / 218 tests=0 (×3 runs) · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0 · git diff --check=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
