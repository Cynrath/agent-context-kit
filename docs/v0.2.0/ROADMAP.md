# AgentContextKit v0.2.0 — Roadmap

One consolidated feature release — all epics A–N land together under `v0.2.0`.

## Release envelope

- Branch: `master` (no fork release branches unless hotfix)
- Package: `@cynrath/agent-context-kit@0.2.0` (CLI `ackit`)
- Companion artifacts (version-aligned, audited together): VS Code extension `ackit-0.2.0.vsix` (`extensions/vscode/`), GitHub Action `Cynrath/agent-context-kit@v0.2.0` (`action.yml`)
- Previous: `0.1.1` (tag `v0.1.1`, commit `e67baf6...` → source `d1d5f5e...`) — immutable; `0.1.0` similarly immutable; legacy `.NET` line untouched

## Epics → tasks trace

| Epic | Name | Tasks | Priority |
|---|---|---|---|
| A | Agent Readiness / Context Quality Engine | TASK-0008 | P0 |
| B | `ackit optimize` v2: Explain + Fix Plan | TASK-0009 | P0 |
| C | Provider-Aware Context Profiles | TASK-0010 | P0 |
| D | Instruction Graph v2 | TASK-0011 | P0 |
| E | Declarative Rule Packs / Policy Packs | TASK-0012 | P0 |
| F | Official GitHub Action | TASK-0014 | P0 |
| G | Watch + Local Dashboard / Report Server | TASK-0015 (engine) + TASK-0016 (dashboard) | P0 |
| H | Diagnostics / Observability | TASK-0017 | P0 |
| I | Performance Regression / Benchmark System | TASK-0018 | P0 |
| J | Public SDK v1 | TASK-0013 | P0 |
| K | Official VS Code Extension | TASK-0019 foundation + TASK-0020 feat | P0 |
| L | Cross-Cutting Security Hardening | TASK-0021 | P0 |
| M | Documentation / Examples / Adoption | TASK-0022 | P0 |
| N | v0.2.0 Integration & Release Readiness | TASK-0023 matrix + TASK-0024 release | P0 |

Every epic has at least one owning task; no epic is deferred to v0.3.0. See `docs/v0.2.0/TRACEABILITY.md` for the REQ→task matrix.

## Phases (calendar-agnostic; phases are dependency-ordered, not date-boxed)

```
Phase 0 — Baseline               [0.5 day]  TASK-0007
Phase 1 — Shared SDK contracts   [1 day]    TASK-0013
Phase 2 — Core engines (parallel) [3–4 days] TASK-0008/0011/0010/0012
Phase 3 — Optimize composition   [1 day]    TASK-0009
Phase 4 — Integration surfaces   [2 days]   TASK-0014/0015/0017/0018  (parallel)
Phase 5 — Dashboard              [1.5 days] TASK-0016 (dashboard)
Phase 6 — VS Code (2 tasks)     [2–3 days] TASK-0019 foundation → TASK-0020 features
Phase 7 — Security hardening     [1 day]    TASK-0021
Phase 8 — Docs & examples        [1.5 days] TASK-0022
Phase 9 — Integration matrix     [1 day]    TASK-0023
Phase 10 — Release readiness     [authorization-gated; no duration planned — wait for user]
```

Estimated wall-clock with parallelism where allowed: ~7–10 days solo, ~4–6 with two concurrent tracks (phase-2 and phase-4 parallelism). Critical path is `0007→0013(SDK)→0008→0009→0016(dashboard)→0019→0020(VSCode)→0021→0022→0023→0024`.

## Deliverables at v0.2.0

- Deterministic readiness score (overall+categories) + JSON + CI gate
- `ackit optimize` with explain, JSON, category/severity filters, waste estimates, fix-plan diff
- Five built-in provider profiles (Codex/Claude/Copilot/Gemini/generic) + custom packs + determinstic fallback
- Instruction Graph v2 (nested/include-exclude/provider, conflict/duplicate/shadow/dead, explain, limits)
- Rule packs (YAML/JSON, schemaVersioned, local+package-dis) with deterministic eval + CI
- GitHub Action (`uses: ...@v0.2.0` with `command: scan`, annotations/SARIF/summary, least-priv)
- Live watch + local dashboard (localhost-only, SSE, paginated, accessible, XSS-safe)
- Diagnostics + sanitized bundle (`ackit diagnostics bundle`)
- Benchmark fixtures (7 classes) + harness + thresholds (PR advisory + scheduled full)
- Public SDK v1 frozen (`src/index.ts` allowlist, error model, AbortSignal, consumer smoke, shared engine proof)
- VS Code extension (readiness status, Problems, graph view, tasks/policy/packs, optimize, palette, watch, diagnostics, tests, .vsix <2MB)
- Security hardening across all new surfaces (T16–T20 + reused T1–T15)
- Docs (README, quick start, guides per feature, monorepo, CI, migration from 0.1.1, troubleshooting, privacy/offline, architecture), example fixtures, CHANGELOG 0.2.0
- Integration matrix (CLI/SDK/MCP/Action/dashboard/VSIX consumer + perf + security) + tarball/VSIX audits
- Controlled release: tag `v0.2.0` → OIDC publish + registry verification + GitHub Release; marketplace publish separately

## Non-goals for v0.2.0

- No required database/cloud/LLM/vector, no plugin execution, no microservices (REQ-V020-GOV-OUT-001).
- No NuGet/.NET line mutation.
- No workflow_dispatch-driven publish path.

## Risks & mitigations

- Dashboard/watch frontend Bloat → vanilla JS (<50KB), written justification required for any heavy dep.
- Score drift → golden fixture + stability contract (ADR-0016).
- Profile vendor fact stale → per-provider fixture + ADR note on update.
- Benchmark flake → multiplier thresholds, not absolute, PR advisory non-blocking.
- VS Code API drift → pins `engines.vscode >=1.90`, contract test on `package.json` categories.

## Governance

Same controlled-release governance as v0.1.1 (`AGENTS.md`, `CLAUDE.md`): `master` push/merge, npm publish, tag, GitHub Release are user-authorized only (explicit sentence in TASK-0024). Force-push, rebase, tag movement/deletion, workflow_dispatch → always prohibited. Legacy `.NET` line `1.0.0-rc.1` remains immutable.
