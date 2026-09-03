# Plan — TASK-0071 post-release docs cleanup (post-v0.3.0 hardening)

Scope: forward-looking first-party docs only (`docs/reference/`,
`docs/concepts/`, `docs/guides/`, `README.md`). Historical records
(`docs/tasks/`, `docs/decisions/`, `docs/v0.2.0/`, `docs/rebuild/`,
`CHANGELOG.md` history sections) stay untouched.

## Changes

1. `docs/guides/getting-started.md` — install/tour pins `0.2.0` → `0.3.0`;
   tour `ackit sync --check` carries a current-master/next-release note
   (published npm `0.3.0` predates TASK-0072).
2. `docs/guides/agent-integration.md` — managed-asset lifecycle section gains
   the same `ackit sync` availability note.
3. `docs/reference/cli.md` — `sync` row + sync-options section marked
   current-master/next-release; `workflow set` row documents the optional
   `--profile` with configured `workflow.defaultProfile` fallback (TASK-0067).
4. `docs/reference/mcp.md` — `ackit_drift_check` marked same canonical
   evaluator as CLI (TASK-0070); `ackit_workflow_status` documents effective
   requirements (TASK-0067).
5. `docs/concepts/workflows.md` — profile intro references additive
   `workflow:` tuning; intent-gate bullet corrected from "accepted" to
   "existing" (docs-first factual fix: the gate proves existence).
6. `docs/reference/config.md` — `workflow:` row documents effective semantics
   (TASK-0067; the v0.3.0 limitation note is retired).

## Explicitly not changed (accurate-as-is)

- `CHANGELOG.md` `## [0.3.0]` known-limitations (immutable history; the next
  release section is authored in the v0.4.0 session, not here).
- `examples/` `v0.2.1` pins (immutable old releases remain functional;
  re-pinning is release-task scope).
- Historical `9 tools` mentions in task docs (accurate at write time; current
  count 15 is in `docs/reference/mcp.md` + CLI parity tests).
- ADRs (accepted historical decisions; forward wording lives in concepts/).

## Investigations (recorded in the task)

- Control characters (PR #10): no repository-owned script generates PR bodies
  (`scripts/*.mjs` have no PR path); terminal output is sanitized
  (`sanitizeTerminalText`, REQ-SEC-003, unit-tested). Verdict: external shell
  quoting — no product code invented.
- Windows/node-24 timeout: full suite 98 files / 554 tests green in ~122s;
  the e2e tarball smoke dominates (~119s of it) with evidence-based 300s
  budget; global 60s per-test budget is documented load-based (vitest
  default 5s is too tight under parallel load). No narrow repo-side fix;
  no global inflation performed.
