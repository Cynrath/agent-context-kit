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

> Availability: `ackit sync` is RELEASED and ships in the published npm
> package (see CHANGELOG for the release that introduced it).

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
ackit_list_tasks, ackit_get_task, ackit_policy_check.
Resources: repo://summary | instructions-graph | skills-catalog |
tasks-active | policy. Prompts: onboarding, task-execution,
scan-remediation, context-optimization.

## Skills for agents

Install the built-ins so agents follow the same workflow the tool enforces:

```bash
ackit skills install     # or: ackit sync (also reconciles instruction shims)
ackit skills list
```
