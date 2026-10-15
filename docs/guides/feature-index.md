# ACKit feature reference (v0.5.4)

This index covers the documented, implemented ACKit surfaces. The [CLI reference](../reference/cli.md), [SDK reference](../reference/sdk.md), [MCP reference](../reference/mcp.md) and [README](../../README.md) are authoritative for exact contracts. This index does not claim features beyond the current published code.

## Repository onboarding and agent context

| Capability | Entry point | Documentation |
| --- | --- | --- |
| Agent instruction onboarding and managed asset synchronization | `ackit init`, `ackit sync` | [Getting started](getting-started.md), [instruction graph](../concepts/instruction-graph.md) |
| Instruction graph, nesting, provenance and provider applicability | `ackit instructions --explain` | [Instruction graph](../concepts/instruction-graph.md), [provider surfaces](../reference/provider-surfaces.md) |
| Open-standard agent skills and projections | `ackit skills list`, `ackit skills validate` | [Agent skills](../concepts/agent-skills.md), [CLI](../reference/cli.md) |
| Context budget, task-aware deterministic packing and provider profiles | `ackit pack` | [Context budget](../concepts/context-budget.md), [configuration](../reference/config.md) |
| Repository advice and low-risk, opt-in remediation | `ackit optimize --explain` | [CLI](../reference/cli.md), [getting started](getting-started.md) |
| Monorepo discovery | `ackit workspaces` | [Monorepos](monorepo.md) |

## Repository safety and quality

| Capability | Entry point | Documentation |
| --- | --- | --- |
| Security/hygiene scanner, redacted findings and SARIF | `ackit scan --ci` | [Rules](../reference/rules.md), [CI](ci.md) |
| Explainable agent-readiness scoring | `ackit readiness` | [Getting started](getting-started.md), [CLI](../reference/cli.md) |
| Deterministic policy/rule packs and risk tiers | `ackit policy check` | [Policy](../reference/policy.md) |
| Drift checks and completion blockers | `ackit drift check`, `ackit status` | [Drift](../reference/drift.md), [workflows](../concepts/workflows.md) |
| Runtime and evidence security boundaries | Offline-first CLI and read-only MCP | [Security model](../security/SECURITY_MODEL.md), [threat model](../security/THREAT_MODEL.md) |
| Reproducible performance measurements | Repository benchmark scripts | [Public benchmark methodology](../benchmarks/public-evidence.md) |

## Task, evidence and verification lifecycle

| Capability | Entry point | Documentation |
| --- | --- | --- |
| Docs-first tasks and task completion criteria | `ackit task` | [Workflow adoption](workflow-adoption.md), [CLI](../reference/cli.md) |
| Intents, workflow profiles and stage transitions | `ackit intent`, `ackit workflow` | [Intent](../concepts/intent.md), [workflows](../concepts/workflows.md) |
| Evidence registry and acceptance-criterion links | `ackit evidence` | [Evidence and verification](../concepts/evidence-verification.md) |
| State-bound verification bundles, independent verdicts, staleness/replay checks | `ackit verification` | [Evidence and verification](../concepts/evidence-verification.md), [trust-flow demo](demo-trust-flow.md) |
| Canonical read-only status, next actions and lifecycle gates | `ackit status` | [Workflows](../concepts/workflows.md), [CLI](../reference/cli.md) |
| Checkpoints, portable handoffs and deterministic resume | `ackit checkpoint`, `ackit task resume` | [Checkpoints](../concepts/checkpoints.md), [workflow example](workflow-example.md) |
| Role contracts and sanitized local journal | `ackit role`, `ackit journal` | [CLI](../reference/cli.md), [architecture](../architecture/overview.md) |

## Integrations and developer surfaces

| Capability | Entry point | Documentation |
| --- | --- | --- |
| Stable TypeScript public SDK | `@cynrath/agent-context-kit` | [SDK](../reference/sdk.md) |
| Read-only MCP server via stdio | `ackit mcp serve` | [MCP](../reference/mcp.md), [agent integration](agent-integration.md) |
| GitHub Action and CI automation | `Cynrath/agent-context-kit` Action | [CI](ci.md), [README](../../README.md) |
| VS Code extension, diagnostics and task/status views | `Cynrath.ackit-vscode` | [README](../../README.md), [architecture](../architecture/overview.md) |
| Local watch, report UI, dashboard and diagnostics | `ackit scan --watch`, `ackit dashboard`, `ackit diagnostics` | [CLI](../reference/cli.md), [architecture](../architecture/overview.md) |
| GitHub Spec Kit community bridge | `@cynrath/ackit-spec-kit-bridge` (separate package) | [Integration guide](spec-kit-bridge.md) |
| Supported provider projections | Codex, Claude Code, GitHub Copilot, Gemini and generic | [Provider surfaces](../reference/provider-surfaces.md), [agent integration](agent-integration.md) |

## Documentation availability

Context7 indexes selected maintained documentation and the root README. Docs7 presents the human-readable navigation and agent endpoints. Neither service is a dependency of the offline-first ACKit runtime. See [Context7/Docs7 administration](context7-docs7.md).
