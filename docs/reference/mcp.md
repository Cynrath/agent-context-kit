# MCP Reference

`ackit mcp serve` runs the ACKit Model Context Protocol server over **stdio**
using the official TypeScript SDK (`@modelcontextprotocol/sdk`, pinned per
ADR-0008). Stdout is protocol-pure; diagnostics go to stderr.

Server identity: name `ackit`, version from package.json (single source of
truth).

## Tools (read-only)

| Tool | Arguments | Returns |
|---|---|---|
| ackit_scan | changed?, ci? | canonical scan report JSON + exit_code_hint |
| ackit_doctor | — | config ok/errors + task-doctor integrity |
| ackit_pack | maxTokens?, format? | pack markdown or JSON |
| ackit_instruction_graph | — | instruction graph nodes |
| ackit_list_skills | — | skill records |
| ackit_validate_skills | — | tiered issues |
| ackit_list_tasks | all? | task rows (id/status/title) |
| ackit_get_task | id | full task doc or unknown-task error |
| ackit_policy_check | — | policy chain + digest + diagnostics |
| ackit_workflow_status | taskId | workflow profile/stage/required artifacts + effective evidence/verdict requirements (null for legacy tasks) |
| ackit_get_intent | id | intent document + fingerprint |
| ackit_get_checkpoint | taskId | latest checkpoint + resume context |
| ackit_verification_bundle | taskId | deterministic verification bundle (markdown) |
| ackit_drift_check | taskId | deterministic drift findings (same canonical evaluator as CLI `drift check`) |
| ackit_status | taskId? | canonical read-only task status snapshot (same `ackit.status.v1` contract as CLI `status`) |
| ackit_list_roles | — | portable role contracts |

The repository root is resolved once at server construction (`--root` for the
CLI, `ACKIT_ROOT`, or `createAckitMcpServer(repositoryRoot)` for the SDK). Tools
cannot override that boundary. Per-call `root` and pack `includeGlobs` are not
supported inputs; repository configuration and the canonical pack safety gates
control discovery.

`ackit_scan.changed` defaults to `false`; `true` restricts the scan to Git changes.
`ci` defaults to `false`: report-only scans append `exit_code_hint=0` even when
findings exist. With `ci: true`, the hint is `1` only when an unsuppressed finding
meets the configured policy severity threshold; otherwise it is `0`. This hint
does not terminate the MCP server or turn findings into a protocol error. CLI
readiness gates are separate from this severity hint.

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
