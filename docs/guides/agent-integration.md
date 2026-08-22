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
ackit skills install
ackit skills list
```
