# MCP Reference

`ackit mcp serve` runs the ACKit Model Context Protocol server over **stdio**
using the official TypeScript SDK (`@modelcontextprotocol/sdk`, pinned per
ADR-0008). Stdout is protocol-pure; diagnostics go to stderr.

Server identity: name `ackit`, version from package.json (single source of
truth).

## Tools (read-only)

| Tool | Arguments | Returns |
|---|---|---|
| ackit_scan | changed?, ci?, root? | canonical scan report JSON + exit_code_hint |
| ackit_doctor | root? | config ok/errors + task-doctor integrity |
| ackit_pack | maxTokens?, format?, includeGlobs?, root? | pack markdown or JSON |
| ackit_instruction_graph | root? | instruction graph nodes |
| ackit_list_skills | root? | skill records |
| ackit_validate_skills | root? | tiered issues |
| ackit_list_tasks | all?, root? | task rows (id/status/title) |
| ackit_get_task | id, root? | full task doc or unknown-task error |
| ackit_policy_check | root? | policy chain + digest + diagnostics |
| ackit_workflow_status | taskId | workflow profile/stage/required artifacts (null for legacy tasks) |
| ackit_get_intent | id | intent document + fingerprint |
| ackit_get_checkpoint | taskId | latest checkpoint + resume context |
| ackit_verification_bundle | taskId | deterministic verification bundle (markdown) |
| ackit_drift_check | taskId | deterministic drift findings |
| ackit_list_roles | — | portable role contracts |

Write tools are intentionally absent (state mutation stays CLI-only by
explicit decision). Any future write tool requires a new ADR with an explicit
capability/permission gate design before registration.

## Resources

`repo://summary` · `repo://instructions-graph` · `repo://skills-catalog` ·
`repo://tasks-active` · `repo://policy`

## Prompts

onboarding · task-execution(taskId?) · scan-remediation ·
context-optimization(maxTokens?)

All templates are deterministic: identical arguments ⇒ byte-identical prompt.
