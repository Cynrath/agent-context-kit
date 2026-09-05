# Agent Integration Guide

ACKit makes a repository agent-ready and stays verifiable.

## Instruction surfaces

| Agent | File ACKit manages | Mechanism |
|---|---|---|
| Codex/AGENTS-family | `AGENTS.md` | managed block with canonical workflow |
| Claude Code | `CLAUDE.md` | managed block containing official `@AGENTS.md` import |
| Gemini CLI | `GEMINI.md` | managed block: "read AGENTS.md" |
| GitHub Copilot | `.github/copilot-instructions.md` | managed block |

`ackit init --dry-run` shows the plan; without the flag it writes. Files that
already exist WITHOUT an ACKit block are refused — user bytes are never
touched (REQ-GOV-008). Managed blocks update idempotently and repair legacy
duplicates.

## Managed-asset lifecycle (init → sync)

> Availability: `ackit sync` is RELEASED in `0.4.0` and ships in published npm
> `@cynrath/agent-context-kit@0.4.1`.

`ackit init` is the first-time onboarding; `ackit sync` is the later,
version-aware reconciliation. Both run on the same ownership engine — the
same refusals, conflicts, and no-write rules apply.

```bash
ackit sync --dry-run   # preview: what would change and why (writes nothing)
ackit sync --check     # read-only CI gate: exit 1 when out-of-sync or blocked
ackit sync             # apply: reconcile ACKit-owned assets
ackit sync --force     # additionally discard local edits on OWNED skills
```

Rules that hold for both commands:

- ACKit never silently rewrites repository instruction/skill files merely because the npm package was upgraded.
- Only ACKit-owned managed regions/assets are eligible for reconciliation when the user explicitly runs the state-changing sync/init command.
- Write decisions are content-driven: when canonical content is unchanged,
  files are not rewritten (`up-to-date`, zero diff, no timestamp churn).
- User-authored files without an ACKit managed block are refused
  (`refused-non-managed`), never modified.
- Third-party skills are never overwritten, even with `--force`
  (`refused-third-party`).
- An ACKit-owned skill modified locally since the last sync conflicts by
  default (`conflict-user-modified`); only `--force` discards local edits.
- `ackit doctor` reports managed-asset staleness read-only (`up-to-date` /
  `updates available` / `conflict-user-modified`) but never writes and never
  fails on staleness; use `ackit sync --check` for CI gating.

## MCP server

```bash
ackit mcp serve        # stdio, protocol-pure stdout
```

Client snippet (Claude-style config):

```json
{ "mcpServers": { "ackit": { "command": "ackit", "args": ["mcp", "serve"] } } }
```

Read-only tools: ackit_scan, ackit_doctor, ackit_pack,
ackit_instruction_graph, ackit_list_skills, ackit_validate_skills,
ackit_list_tasks, ackit_get_task, ackit_policy_check,
ackit_workflow_status, ackit_get_intent, ackit_get_checkpoint,
ackit_verification_bundle, ackit_drift_check, ackit_list_roles,
ackit_status (canonical task snapshot; MCP stays read-only — no
mutation surface by explicit decision).
Resources: repo://summary | instructions-graph | skills-catalog |
tasks-active | policy. Prompts: onboarding, task-execution,
scan-remediation, context-optimization.

Provider surfaces: capability table, sources with freshness dates, and
the per-surface parity statement live in
`docs/reference/provider-surfaces.md` (machine-readable:
`tests/fixtures/provider-capabilities.json`).

## Task status loop (read-only)

Start agent work loops with the canonical status projection instead of
hand-inspecting task, workflow, evidence, verdict, drift, and checkpoint
stores separately:

```bash
ackit status             # the single active task
ackit status TASK-0007   # explicit task
ackit --json status TASK-0007   # stable ackit.status.v1 contract
```

One call answers what task, what stage, what blocks completion (verbatim
gate strings with stable codes), what is stale (verification freshness +
independence, checkpoint staleness, evidence problems), and what next
(derived suggested commands plus the recorded checkpoint next action).
`ackit status` never mutates: no writes, no journal, no clock reads —
safe to poll between steps.

## Skills for agents

Install the built-ins so agents follow the same workflow the tool enforces:

```bash
ackit skills install     # or: ackit sync (also reconciles instruction shims)
ackit skills list
```
