# ADR Index — AgentContextKit vNext

Status registry for all rebuild architecture decisions (MS§33 coverage). Each ADR is short and concrete; TASK-0266 confirms/updates them against live dependency facts before implementation starts.

| ADR | Decision area | Status |
|---|---|---|
| ADR-0001 | TypeScript/Node.js/npm migration & toolchain | Accepted (confirmed TASK-0266) |
| ADR-0002 | Single-package architecture | Accepted |
| ADR-0003 | Offline-first / no-telemetry contract | Accepted (invariant) |
| ADR-0004 | Config file identity: `ackit.yml`, schemaVersioned | Accepted |
| ADR-0005 | Filesystem root boundary model | Accepted |
| ADR-0006 | Instruction graph model | Accepted |
| ADR-0007 | CLI exit-code taxonomy | Accepted |
| ADR-0008 | Official MCP TypeScript SDK adoption | Accepted (SDK 1.30.0 verified) |
| ADR-0009 | Scan engine & rule ID namespace | Accepted |
| ADR-0010 | Agent Skills integration & ownership model | Accepted |
| ADR-0011 | Policy engine & plugin security boundary | Accepted |
| ADR-0012 | Context budget/pack + cache/incremental model | Accepted |
| ADR-0013 | Package distribution strategy & versioning | Accepted (`@cynrath/agent-context-kit`) |
| ADR-0014 | Task system & docs-first workflow model | Accepted |
| ADR-0015 | v0.2.0 consolidated release architecture | Accepted (2026-08-27) |
| ADR-0016 | Readiness scoring model + provider profile model | Accepted (2026-08-27) |
| ADR-0017 | Instruction graph v2 | Accepted (2026-08-27) |
| ADR-0018 | Rule-pack format & security boundary | Accepted (2026-08-27) |
| ADR-0019 | Local dashboard architecture | Accepted (2026-08-27) |
| ADR-0020 | GitHub Action architecture | Accepted (2026-08-27) |
| ADR-0021 | Public SDK boundary + VS Code extension integration | Accepted (2026-08-27) |
| ADR-0022 | Performance benchmark / regression policy | Accepted (2026-08-27) |
| ADR-0023 | Multi-artifact version & release strategy | Accepted (2026-08-27) |
| ADR-0024 | Cross-cutting security hardening | Accepted (2026-08-27) |

All MS§33 decision areas are covered: migration (0001), single-package (0002), offline contract (0003), fs boundary (0005), instruction graph (0006), skills (0010), policy + plugin boundary (0011), context budget + cache/incremental (0012), MCP (0008), task docs (0014), distribution/versioning (0013); plus extras config identity (0004), exit codes (0007), scan rules (0009). v0.2.0 adds readiness (0016), graph v2 (0017), rule packs (0018), dashboard (0019), action (0020), SDK+VS Code (0021), benchmarks (0022), multi-artifact release (0023), security hardening (0024).

Registry verification facts recorded in TASK-0266 completion notes (Node LTS schedule, MCP SDK version, npm name availability). v0.2.0 additions are in `docs/decisions/` and mirrored in `docs/rebuild/decisions/` for continuity.
