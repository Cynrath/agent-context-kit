# ADR Index — AgentContextKit vNext

Status registry for all rebuild architecture decisions (MS§33 coverage). Each ADR is short and concrete; TASK-0266 confirms/updates them against live dependency facts before implementation starts.

| ADR | Decision area | Status |
|---|---|---|
| ADR-0001 | TypeScript/Node.js/npm migration & toolchain | Proposed → confirm in TASK-0266 |
| ADR-0002 | Single-package architecture | Proposed |
| ADR-0003 | Offline-first / no-telemetry contract | Accepted (invariant) |
| ADR-0004 | Config file identity: `ackit.yml`, schemaVersioned | Proposed |
| ADR-0005 | Filesystem root boundary model | Proposed |
| ADR-0006 | Instruction graph model | Proposed |
| ADR-0007 | CLI exit-code taxonomy | Proposed |
| ADR-0008 | Official MCP TypeScript SDK adoption | Proposed |
| ADR-0009 | Scan engine & rule ID namespace | Proposed |
| ADR-0010 | Agent Skills integration & ownership model | Proposed |
| ADR-0011 | Policy engine & plugin security boundary | Proposed |
| ADR-0012 | Context budget/pack + cache/incremental model | Proposed |
| ADR-0013 | Package distribution strategy & versioning | Proposed |

Task-first docs structure (MS§33.10) is decided directly by REQ-TASKS-003 (`docs/tasks/active|archive`) and needs no separate ADR.
