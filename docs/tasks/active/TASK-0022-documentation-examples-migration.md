---
id: "TASK-0022"
title: "Documentation / examples / migration — v0.2.0 epic M (planning-only)"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0021
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Implement epic M — **Documentation / examples / migration** for the consolidated v0.2.0 release. Bring every user-facing surface shipped in epics A–L to documented, example-backed, migration-guided parity: README, quick-start, per-feature guides (readiness, optimize, provider profiles, instruction graph v2, rule packs, GitHub Action, watch/dashboard, diagnostics, SDK, VS Code, monorepo, CI recipes), privacy/offline/security model, architecture overview, per-feature `examples/` fixtures, `CHANGELOG.md` `[0.2.0]` entry per Keep a Changelog, and `docs/guides/migration-v0.1.1-to-v0.2.0.md`. Planning-only run — no version bump, no publish, no tag.

Requirement IDs: **REQ-V020-M-001**, **REQ-V020-M-002**, **REQ-V020-GOV-010**. Depends on **TASK-0021** (cross-cutting security hardening must be documented — threat-model deltas, redaction, headers, binding, pack limits feed the security/privacy docs).

## Context / current state

Current `master` at `0.1.1` (`@cynrath/agent-context-kit`, CLI `ackit`, Node >=22, `pnpm@11.22.0`, 218-line `README.md`):

- **README** (`README.md`, 218 lines): covers v0.1.1 features (instruction graph, skills, scan, context packs, tasks, policy, incremental/baselines, reports, monorepo, MCP), install/ quickstart, CLI overview table, `ackit.yml` snippet (schemaVersion 1), instruction-graph, scanning, context-budget, policy, workspaces, exit-codes, security, docs index, MCP setup, requirements, development, versioning. No v0.2.0 features mentioned (readiness, optimize v2, profiles, rule packs, Action, watch/dashboard, diagnostics, SDK, VS Code, benchmarks).

- **Guides**: `docs/guides/getting-started.md` (56 lines, 30-sec tour `init`/`skills install`/`scan`/`instructions`/`pack`/`task`), `docs/guides/ci.md`, `docs/guides/monorepo.md`, `docs/guides/agent-integration.md`. No `readiness.md`, no `optimize.md`, no `provider-profiles.md`, no `rule-packs.md`, no `watch-dashboard.md`, no `vscode.md`, no `migration-*.md`, no `troubleshooting.md`.

- **Concepts**: `docs/concepts/instruction-graph.md`, `docs/concepts/context-budget.md`, `docs/concepts/agent-skills.md`. No `concepts/readiness.md`, no `concepts/provider-profiles.md` (planned in TASK-0008/0010).

- **Reference**: `docs/reference/cli.md` (39 lines, command table + scan options), `docs/reference/config.md`, `docs/reference/rules.md`, `docs/reference/exit-codes.md`, `docs/reference/mcp.md`, `docs/reference/schemas.md`. No `reference/readiness.md`, `reference/diagnostics.md`, `reference/sdk.md` (stub), `reference/benchmarks.md`, `reference/rule-packs.md`.

- **Architecture**: `docs/architecture/overview.md` — single-package `src/core/*` diagram, no reserved-subsystem note for `src/core/readiness`, `src/core/profiles`, `src/core/policy/packs`, `src/core/dashboard`, `src/core/diagnostics`, `extensions/vscode`, `benchmarks/` until TASK-0007 added it.

- **Security/privacy**: `docs/security/THREAT_MODEL.md`, `docs/security/SECURITY_MODEL.md`, `SECURITY.md` (v0.1.1 state). No v0.2.0 deltas (dashboard XSS/binding/CSP, rule-pack traversal/ReDoS/size limits, action pinning/injection, diagnostics redaction, VS Code no-telemetry).

- **History**: `docs/history/v1.md` preserved.

- **Examples**: `examples/` is sparse — `templates/` + `templates/skills` (if present), no per-feature runnable fixtures (`examples/readiness-high/`, `examples/provider-copilot/`, `examples/rule-pack-demo/`, `examples/sdk-consumer.mjs`, `examples/watch-dashboard/` etc.). `benchmarks/fixtures/` not yet populated.

- **Changelog**: `CHANGELOG.md` has `[0.1.1]` `2026-08-25` and `[0.1.0]` entries plus legacy v1 verbatim section. No `[0.2.0]` entry.

- **Dependencies already landed when this task starts** (per `EXECUTION_PLAN.md`): TASK-0007 (baseline), TASK-0013/SDK, TASK-0008 readiness, TASK-0011 graph v2, TASK-0010 profiles, TASK-0012 rule packs, TASK-0009 optimize v2, TASK-0014 Action, TASK-0015 watch engine, TASK-0017 diagnostics, TASK-0018 benchmarks, TASK-0016 dashboard, TASK-0019/0020 VS Code foundation+features, **TASK-0021 security hardening** (hard gate). Docs task must not start before TASK-0021 is `completed` so security guarantees are stable to describe.

Relevant files/modules:

- `README.md` (218 lines), `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`
- `docs/guides/getting-started.md`, `docs/guides/ci.md`, `docs/guides/monorepo.md`, `docs/guides/agent-integration.md`
- `docs/concepts/instruction-graph.md`, `docs/concepts/context-budget.md`, `docs/concepts/agent-skills.md`
- `docs/reference/cli.md`, `docs/reference/config.md`, `docs/reference/rules.md`, `docs/reference/exit-codes.md`, `docs/reference/mcp.md`, `docs/reference/schemas.md`
- `docs/architecture/overview.md`, `docs/decisions/README.md`, `docs/decisions/ADR-0015..0024`, `docs/rebuild/decisions/ADR-0015..0024`
- `docs/security/THREAT_MODEL.md`, `docs/security/SECURITY_MODEL.md`
- `docs/history/v1.md`, `docs/v0.2.0/{REQUIREMENTS,TRACEABILITY,EXECUTION_PLAN,ROADMAP,DEFINITION_OF_DONE}`
- `docs/guides/readiness.md` *(to create)*, `docs/guides/optimize.md` *(to create)*, `docs/guides/provider-profiles.md` *(create)*, `docs/guides/rule-packs.md` *(create)*, `docs/guides/watch-dashboard.md` *(create)*, `docs/guides/vscode.md` *(create)*, `docs/guides/migration-v0.1.1-to-v0.2.0.md` *(create)*, `docs/guides/troubleshooting.md` *(create)*, `docs/concepts/readiness.md` *(create)*, `docs/reference/diagnostics.md` *(create)*, `docs/reference/sdk.md` *(rewrite)*, `docs/reference/benchmarks.md` *(create)*
- `examples/**` (per-feature fixtures), `templates/**`, `benchmarks/**`
- `schemas/*.schema.json` (readiness, profile, rule-pack, instruction-graph v2, diagnostics)
- `action/README.md` (Action consumer-facing)
- `extensions/vscode/README.md`
- `.ackit/` must remain gitignored; no generated junk committed

## Goal

One concrete outcome: a **verified, example-backed, migration-complete documentation set** where every v0.2.0 feature (readiness, optimize v2, provider profiles, instruction graph v2, rule packs, GitHub Action, watch/dashboard, diagnostics, SDK, VS Code, monorepo, CI recipes, security/privacy) is explained in a guide/reference/architecture entry, linked to a runnable `examples/` fixture that `ackit scan --ci` / `ackit readiness --json` can exercise, with zero dead links, `CHANGELOG.md [0.2.0]` per Keep a Changelog, and a tested migration note from `v0.1.1`.

## In scope

- **README rewrite**: update top status badge from `v0.1.1` to `v0.2.0` summary (keep honest unpublished-until-authorized wording per REQ-V020-GOV-010/REQ-DOC-004), add new-feature summary (readiness 0–100 + categories, `optimize --explain/--fix`, provider profiles, graph v2, rule packs, Action, watch/dashboard, diagnostics bundle, SDK, VS Code, benchmarks) with docs-index table linking to every new guide; re-verify 30-sec tour commands against real CLI; keep offline-first/deterministic claims test-backed.
- **Quick-start refresh**: `docs/guides/getting-started.md` — add profile selection (`--profile codex|claude|copilot|gemini|generic`), `readiness`/`optimize` one-liners, `diagnostics` hint, keep `ackit init --dry-run` plan-first flow; every code block extracted and smoke-run in tests.
- **Guides (create or rewrite)**:
  - `docs/guides/readiness.md` — categories, weights, `readiness.weights` config, deduction severity→points map, `N/A` re-normalization, `--fail-below` / `--ci` gating, `baselineScore`/`threshold` JSON fields.
  - `docs/guides/optimize.md` — taxonomy (duplicated/conflicting/shadowed/stale/oversized/redundant), `--explain`, `--category`/`--min-severity`/`--format`, `tokenWasteEstimate` (estimate-labeled), `--fix --dry-run` diff-first boundary, managed-surface scope, rollback (`git diff`/`revert`).
  - `docs/guides/provider-profiles.md` — built-in profiles (codex/claude/copilot/gemini/generic), `schemas/profile.schema.json`, selection order `CLI --profile > ackit.yml profile > auto-detect`, `applyTo` wins, custom `profiles/*.yml` + `ackit.yml profiles.extend` (local only), fixtures per provider.
  - `docs/guides/instruction-graph-v2.md` *(or update `docs/concepts/instruction-graph.md` + new guide)* — schema v2 fields (`includeScopes`/`excludeScopes`/`providerApplicability`/`provenance`/`shadowedBy`/`duplicateOf`/`orderIndex`), scope resolution hardening (nested, monorepo, symlink→realpath, Windows POSIX, limits), conflict/duplicate/shadow/dead detection.
  - `docs/guides/rule-packs.md` — pack format (`schemas/rule-pack.schema.json`), `ackit.yml policy.rulePacks` + `extends` (local/pre-installed package only, no URL fetch), composition/locking/collision diagnostics, presence/pattern/config evaluation, CI counting, ReDoS/size limits, no JS execution.
  - `docs/guides/ci.md` update — GitHub Action `action.yml` (ADR-0020 choice recorded), inputs `command`/`args`/`fail-threshold`, outputs `findings-json`, annotations + SARIF + job summary + JSON artifact, `permissions: contents: read, checks: write?` least-privilege, dogfood workflow `.github/workflows/ackit-action-dogfood.yml`, local `uses: ./` smoke.
  - `docs/guides/watch-dashboard.md` — `ackit scan --watch` / `ackit watch` debounce 400ms, `--watch` incremental + cache, ignored dirs, `SIGINT` graceful shutdown, `ackit report serve` / `ackit dashboard` localhost-only (`127.0.0.1` default, `--port 0`, `--host` requires `--allow-nonlocal`), live views (readiness, findings, graph per-file, tasks, policy, context), SSE/poll choice (ADR-0019), vanilla JS <50KB, WCAG AA, CSP/`nosniff`, paginated large-repo behavior.
  - `docs/reference/diagnostics.md` *(+ `docs/guides/diagnostics.md` stub if needed)* — `ackit diagnostics` (`--json`, `bundle --out`), sanitized bundle contents + manifest `bundle-manifest.json` (sha256 + redaction count), what is never included (secret shapes `[REDACTED]`, absolute paths `<local-path>`, env vars).
  - `docs/reference/sdk.md` rewrite — frozen `src/index.ts` allowlist (`scanRepository`, `loadAckitConfig`, `buildContextPack`, `buildInstructionGraph`, `resolveEffectiveStack`, `validateSkills`, plus v0.2.0 `scoreRepository`, `evaluateRulePack`, `BuildGraphOptions` extension), types strict, `AckitError` (`code`+`remediation`), `AbortSignal` cancellation (<200ms), `type: module` + `sideEffects: false` + `engines.node >=22`, ESM-only with CJS `await import()` shim, no side effects, reuse by CLI/MCP/Action/dashboard/VS Code.
  - `docs/guides/vscode.md` — `extensions/vscode/` location (ADR-0021), `esbuild`, `vsce package` → `.vsix` <2MB, activation `onStartupFinished`, commands (`ACKit: Refresh/Show Graph/Optimize/Diagnostics`), readiness status bar + tree, Problems `DiagnosticCollection` (`ACKITxxx`), current-file instruction stack, tasks view, CodeActions, version-alignment warning, no telemetry, marketplace guard (separate authorization).
  - `docs/guides/monorepo.md` update — profile/policy/graph path-scoping per workspace (distinct from workspace semantics).
  - `docs/reference/cli.md` + `docs/reference/config.md` + `docs/reference/schemas.md` — add `--profile`, `readiness.weights`, `policy.rulePacks`, `--fail-below`, `--watch`, diagnostics, `--explain` flags; document `ackit.yml` schemaVersion 2 additive keys.
  - `docs/guides/troubleshooting.md` (new) — common diagnostics (`config check`, `doctor`, `diagnostics --json`, `diagnostics bundle`), cache clean (`cache clean` touches only `.ackit/cache`), determinism contract, Windows path normalization, SIGINT/cancellation, limit diagnostics (`INSTR-LIMIT-*`, `POL-PACK-LIMIT`).
  - `docs/security/THREAT_MODEL.md` + `docs/security/SECURITY_MODEL.md` + `SECURITY.md` delta — dashboard localhost binding/headers/XSS/redaction, rule-pack traversal/ReDoS/limits/no-exec, Action pinning/permissions/injection, SDK no-exit/no-path-leak, diagnostics sanitization, VS Code no-telemetry.
  - `docs/architecture/overview.md` — extend diagram/text for `src/core/readiness`, `src/core/profiles`, `src/core/policy/packs`, `src/core/dashboard`, `src/core/diagnostics`, `extensions/vscode`, `benchmarks/` + Action/SDK data flow; mark single-package `core` vs separate `extensions/vscode` artifact (ADR-0021/0023).
- **Examples & fixtures**: under `examples/` (one maintained fixture per major feature, each runnable), e.g.:
  - `examples/readiness-high/` — small repo scoring ~85+ with 6 categories covered
  - `examples/readiness-n-a/` — repo without `docs/tasks` showing `taskHygiene: n/a` re-normalize
  - `examples/optimize-duplicate/` — duplicated AGENTS triggering `ACKITOPT`/optimize finding
  - `examples/provider-copilot/` — copilot `applyTo` globs fixture
  - `examples/provider-codex/` + `examples/provider-generic/` — profile delta fixtures
  - `examples/instruction-graph-nested/` — 4-level nesting + `includeScopes`/`excludeScopes`
  - `examples/rule-pack-demo/` — `forbiddenPattern` + `presence: README.md must exist` 2-finding fixture
  - `examples/rule-pack-collision/` — two packs colliding on same rule id
  - `examples/watch-dashboard-smoke/` — minimal repo for watch+serve smoke
  - `examples/sdk-consumer/` — `sdk-consumer.mjs` ESM import smoke (also `examples/sdk-consumer.mjs`)
  - `examples/vscode-smoke/` — fixture workspace for VS Code Problems/stack smoke
  - `examples/monorepo-pnpm/` — `pnpm` workspaces fixture (existing monorepo guide fixture, refreshed)
  Each example has `README.md` + `ackit.yml` (if needed) + optional `.ackit-fixture.json` proving `ackit scan --json` valid; `examples/README.md` index explains copy-paste usage, `npx @cynrath/agent-context-kit@0.2.0 scan --ci` per fixture.
- **Changelog**: `CHANGELOG.md` `[0.2.0] - 2026-09-xx` section per **Keep a Changelog** with `Added`/`Changed`/`Fixed`/`Security`, referencing new ADRs 0015–0024 where relevant; legacy section untouched verbatim; unpublished wording until authorize.
- **Migration**: `docs/guides/migration-v0.1.1-to-v0.2.0.md` — breaking changes (if any: `ackit.yml` additive keys default-preserving, graph schema v2 additive, readiness optional), deprecations, upgrade steps (install `0.2.0`, `config check`, `scan`, `readiness`, `optimize --dry-run`), troubleshooting.
- **Doc quality gates**: every guide's code blocks are smoke-extracted and run; every example passes `ackit scan --ci` (or documents expected threshold); every doc link is dead-link-gated; `pnpm gen:schemas` drift-free.
- **REQ-V020-GOV-010 compliance**: no `REQ-*`, `ADR-*`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext` strings in public CLI `--help` or MCP human-facing prompts (contract-tested); docs cite concepts not internal IDs in prose unless in ADR/traceability tables.

## Out of scope

- No product feature implementation — engines (readiness, optimize v2, profiles, graph v2, rule packs, watch, dashboard, diagnostics, SDK, VS Code, benchmarks, Action) are already built in predecessors; this task only documents what exists and adds fixtures/docs (if a fixture reveals a product bug, file a follow-up task — do not expand scope silently).
- No `package.json` version bump (stays `0.1.1` until TASK-0024); no `npm publish`, tag `v0.2.0`, GitHub Release, workflow_dispatch, force-push, history rewrite, tag movement.
- No new runtime dependencies — if a doc tooling dep is truly needed (e.g., markdown link-check), justify per REQ-V020-GOV-OUT-001 (why stdlib insufficient, security/size/maintenance impact, alternatives) or use existing `markdown-link` style gate.
- No telemetry, no network calls in product code, no remote LLM/API, no vector DB/RAG, no arbitrary JS plugin execution (REP-GOV-001/002/007/009).
- No stale v1 doc resurrection beyond `docs/history/v1.md`.
- No generated junk committed (`.ackit/`, `artifacts/`, `dist/`, `node_modules/`, coverage, VSIX, tarballs).
- No docs sprawl — keep canonical set listed above; giant generated handoff files stay out of `docs/`.

## Technical design

Update/create mapping to requirement IDs:

| Doc / example | Source requirement | Content contract |
|---|---|---|
| `README.md` (218→~320 lines) | REQ-V020-M-001 | New-feature summary (9 bullets), docs index table, verified quick-start, badges, honest unpublished note; `pnpm gen:schemas` drift-free |
| `docs/guides/getting-started.md` | M-001 | Profile + readiness + optimize one-liners; code blocks smoke-tested |
| `docs/guides/readiness.md` + `docs/concepts/readiness.md` | M-001, A-001..006 | Weights table, deduction taxonomy, N/A handling, `--fail-below`, JSON schema `ackit.readiness.v1` snippet |
| `docs/guides/optimize.md` | M-001, B-001..005 | Finding schema, flags matrix, waste estimates, `--fix --dry-run` diff, managed-surface boundary |
| `docs/guides/provider-profiles.md` + `docs/concepts/provider-profiles.md` | M-001, C-001..005 | `profile.schema.json` excerpt, selection order diagram, 5 built-ins inventory, custom profiles |
| `docs/concepts/instruction-graph.md` + `docs/guides/instruction-graph-v2.md` | M-001, D-001..003 | Graph v2 fields, scope hardening sequence, conflict/duplicate/shadow/dead fixtures |
| `docs/guides/rule-packs.md` | M-001, E-001..003 | `rule-pack.schema.json`, loading precedence, `locked`, collision, ReDoS/size limits |
| `docs/guides/ci.md` + `action/README.md` | M-001, F-001..003 | `action.yml` inputs/outputs, annotations/SARIF/summary/artifact, dogfood, pinning |
| `docs/guides/watch-dashboard.md` | M-001, G-001..004 | Watch debounce/incremental/ignored-dirs/shutdown, dashboard localhost/CSP/pagination, SSE choice (ADR-0019) |
| `docs/reference/diagnostics.md` | M-001, H-001..002 | `diagnostics --json` schema, `bundle --out` manifest, sanitization table |
| `docs/reference/sdk.md` + `examples/sdk-consumer.mjs` | M-001, J-001..003 | Allowlist table, `AckitError`/`AbortSignal`, ESM/CJS, side-effects-free proof |
| `docs/guides/vscode.md` + `extensions/vscode/README.md` | M-001, K-001..003 | Extension location/bundling/VSIX <2MB, commands, Problems/tree/status bar, marketplace guard |
| `docs/guides/monorepo.md` | M-001 | Workspace vs path-scoped semantics, profile per-workspace scoping |
| `docs/reference/cli.md` + `config.md` + `schemas.md` | M-001 | Flag tables, `ackit.yml` v2 additive keys (`readiness.weights`, `profile`, `policy.rulePacks`, `diagnostics`), `ackit.schema.json` v2 snippet (not applied as schema change here — docs only if schema already bumped by TASK-0007) |
| `docs/guides/troubleshooting.md` | M-001 | `doctor`/`diagnostics`/`config check`/`cache clean`/`scan --watch` failure modes |
| `docs/security/THREAT_MODEL.md` + `SECURITY_MODEL.md` | M-001, L-001..002 | v0.2.0 deltas 7 surfaces (dashboard, packs, action, SDK, VSIX, diagnostics, graph), grep-gate reference |
| `docs/architecture/overview.md` | M-001 | Diagram note: `src/core/{readiness,profiles,policy/packs,dashboard,diagnostics}`, `extensions/vscode`, `benchmarks/`, `action/` data flows |
| `docs/guides/migration-v0.1.1-to-v0.2.0.md` | M-001 | Added/Changed/Fixed/Security deltas, breaking-change table (mostly additive), upgrade checklist |
| `examples/**` | M-002 | One folder per feature (≥10 fixtures), each `README.md` + runnable `ackit.yml` + `examples/README.md` index |
| `CHANGELOG.md` | M-002 | `[0.2.0] - 2026-09-xx` Keep a Changelog section: Added/Changed/Fixed/Security; link to ADRs; legacy verbatim untouched |
| Dead-link/docs-review gates | M-001..002, GOV-010 | `pnpm lint` / markdown link-check / `gen:schemas` / `scan --ci` per example |

Detailed file ops:

- **README.md**: replace banner status `v0.1.1 …` → `v0.2.0 — … (pending release authorization)` (keep release-governance disclaimer per `AGENTS.md`), append feature-row table (readiness/optimize/profiles/graph v2/rule packs/Action/watch·dashboard/diagnostics/SDK/VS Code/benchmarks) each with doc link; update `Quickstart` block to include `ackit scan --json` + `ackit diagnostics --help`; update `Docs` index line to include `readiness / optimize / provider-profiles / rule-packs / watch-dashboard / diagnostics / sdk / vscode / benchmarks / migration`.
- **Guides**: create missing `docs/guides/*.md` listed above (≤3 pages each, crisp, copy-pasteable). Use `<!-- tested: examples/<name>/ -->` comment convention so a test harness can extract the fixture path. Keep front matter minimal (H1 + intro + requirements table + examples).
- **Concepts**: create `docs/concepts/readiness.md` + `docs/concepts/provider-profiles.md` via extraction from `docs/v0.2.0/REQUIREMENTS.md` epics A/C — no duplication of requirement text verbatim; paraphrase as user-facing explanation.
- **Reference**: update `docs/reference/cli.md` (append rows for `readiness` if introduced, `diagnostics`, `--profile`, `--fail-below`, `--explain`, `--watch`), `docs/reference/config.md` (add `readiness`/`profile`/`policy.rulePacks`/`diagnostics` snippet), `docs/reference/schemas.md` (list new schemas: `readiness.schema.json`, `profile.schema.json`, `rule-pack.schema.json`, `instruction-graph.v2.schema.json`, `diagnostics.schema.json` — or note they exist under `schemas/`).
- **Architecture**: `docs/architecture/overview.md` — add Mermaid/dot subgraph for `v0.2.0 subsystems` (readiness/profiles/packs/dashboard/diagnostics/benchmarks/vscode/action) with arrows to CLI/SDK/MCP; note `extensions/vscode` is separate build artifact (mirrors `package.json` version, `vsce package`).
- **Examples**: scaffold `examples/` subfolders listed in In scope; each folder contains at minimum `README.md` (what/why/how), `ackit.yml` (if custom config), source files that trigger the feature, and `.ackit-fixture.json` (optional) with `expectedFindings` or `expectedScore` for harness; generate fixtures deterministically (no random bytes, sorted listings, repo-relative paths POSIX).
- **CHANGELOG.md**: prepend (above `[0.1.1]`) an `[0.2.0] - 2026-09-xx` section:
  ```markdown
  ## [0.2.0] - 2026-09-xx
  ### Added
  - Readiness / context-quality scoring engine (0–100, 6 categories, weighted, deductions with evidence) ...
  - `ackit optimize` v2 ...
  - Provider-aware context profiles (codex/claude/copilot/gemini/generic) ...
  - Instruction graph v2 ...
  - Declarative rule packs / policy packs ...
  - Official GitHub Action (`action.yml`) ...
  - Watch + local dashboard / report server (localhost-only) ...
  - Diagnostics / observability (`ackit diagnostics`, sanitized bundle) ...
  - Performance benchmark system (`benchmarks/`) ...
  - Public SDK v1 stabilization (`src/index.ts` allowlist, AbortSignal, AckitError) ...
  - Official VS Code extension (`extensions/vscode`, VSIX <2MB) ...
  ### Changed
  - `ackit.yml` schemaVersion 2 additive keys (readiness.weights, profile, policy.rulePacks, diagnostics) — defaults preserve v0.1.1 behavior ...
  - CLI help updated for new flags (`--profile`, `--fail-below`, `--explain`, `--watch`) ...
  ### Fixed
  - (carry any pre-release fixes discovered during hardening; if none, omit or state "No user-facing fixes beyond hardening") ...
  ### Security
  - Dashboard localhost-only default + CSP/nosniff + XSS redaction, rule-pack traversal/ReDoS/collision limits, Action SHA-pinning + least-privilege, diagnostics secret/path sanitization, SDK no-exit/no-leak ...
  ```
  Keep a Changelog format: `## [X.Y.Z] - YYYY-MM-DD` + `### Added/Changed/Fixed/Security` subsections, compare link `[0.2.0]: https://github.com/Cynrath/agent-context-kit/compare/v0.1.1...v0.2.0` placeholder (no live tag).
- **Migration**: `docs/guides/migration-v0.1.1-to-v0.2.0.md` — table `Area | v0.1.1 | v0.2.0 | Action` (scan, pack, instructions, `ackit.yml`, tasks, policy, CI, VS Code, SDK), emphasize additive-only `ackit.yml` (unknown keys ignored in 0.1.1 until 0.2.0), note `packageManager` pnpm pin unchanged (`pnpm@11.22.0`), Node `>=22` unchanged.
- **Schemas**: do not mutate `schemas/*.schema.json` in this task (owned by engine tasks); if a schema excerpt in docs drifts from file, fail docs-review and fix doc to match file.
- **Dependency note**: this task reads security guarantees finalized in TASK-0021 (dashboard headers/binding, pack limits, diagnostics redaction list — 5 secret fixtures, Action pinning) and cites them; any doc referencing a security control must have a trace to `docs/security/THREAT_MODEL.md` delta line or test fixture.

Out-of-scope guardrails enforced via `AGENTS.md` / `REQ-V020-GOV-OUT-001`.

## User-facing behavior

After this task, a new user on Node >=22 sees:

```powershell
# install (after 0.2.0 is published — until then same 0.1.1 install, docs note "pending authorization")
npm install --global @cynrath/agent-context-kit    # or npx --yes @cynrath/agent-context-kit@0.2.0
ackit --version                                     # 0.1.1 until TASK-0024 bumps to 0.2.0
ackit --help                                        # no REQ-*/ADR-* strings, new commands/flags visible

# 30-sec tour still works, plus new surfaces
ackit init --dry-run
ackit skills install
ackit scan                        # existing
ackit scan --ci --fail-below 80   # new: readiness/quality gate
ackit instructions --profile copilot --for src/app.ts
ackit optimize --explain --json   # new
ackit pack --profile codex --max-tokens 50000
ackit diagnostics --json
ackit diagnostics bundle --out ./ackit-diag.zip   # sanitized, no secrets/absolute paths
ackit report serve --port 0       # 127.0.0.1 only, --host needs --allow-nonlocal
ackit watch                       # live rescan with 400ms debounce

# docs
cat docs/guides/readiness.md
cat docs/guides/optimize.md
cat docs/guides/provider-profiles.md
cat docs/guides/rule-packs.md
cat docs/guides/watch-dashboard.md
cat docs/guides/migration-v0.1.1-to-v0.2.0.md
cat docs/reference/sdk.md         # ESM import example
cat CHANGELOG.md                  # [0.2.0] on top
ls examples/                      # 10+ runnable fixtures, each README + ackit.yml
cat examples/README.md            # index with copy-paste per fixture
```

Every `examples/<name>/README.md`'s code block is runnable verbatim after `git clone`; running `ackit scan --ci` inside the fixture reproduces the documented findings/score.

`ackit --json` bare command (zero-args) still prints quick health summary per REQ-V020-GOV-009; README's Claims = Tests: e.g., "watch debounces 400ms" is backed by a doc-harness grep of `watch.ts`, not a marketing assertion.

Offline contract: all new guides/examples work air-gapped — no `fetch`/`npm install` of docs tooling required at runtime; any doc-site build is local.

## Security

- No secret or absolute-path leakage in any doc or example (reuse REQ-V020-GOV-003/004). Every example that historically contained a fake key now contains `[REDACTED]` or a clearly non-secret placeholder (`example-key-aaaa…`); grep `AKIA|ghp_|BEGIN \w+ PRIVATE KEY` over `docs/` + `examples/` outside explicitly marked security fixtures must return 0.
- Documents — not weakens — the 7 v0.2.0 security deltas hardened in TASK-0021; each guide's "Security" callout links to `docs/security/THREAT_MODEL.md` delta line and to the test that proves it:
  - Dashboard: localhost-only default, `--allow-nonlocal` guard, CSP `default-src 'self'` + `X-Content-Type-Options: nosniff`, XSS via `textContent`/escaped interpolation, secret/path redaction, paginated large-repo rendering.
  - Rule packs: repo-root containment for `policy.rulePacks` paths, size limits (maxRules 200, maxPatternLen 500), ReDoS bounded regex (`picomatch` + bounded length/timeout), no `eval`/`require(userInput)`/`fetch` inside `src/core/policy/packs`, collision diagnostics.
  - GitHub Action: SHA-pinned actions (`actions/checkout@<sha>` etc.), least-privilege `permissions: contents: read, checks: write?`, input-injection guard (inputs never interpolated into shell without quoting).
  - Diagnostics: bundle redaction — 5 secret shapes replaced with `[REDACTED]`, absolute paths → `<local-path>` / repo-relative, env vars excluded, manifest `bundle-manifest.json` with sha256 + redaction count.
  - SDK: no `process.exit`, no absolute paths, no telemetry, no network.
  - VS Code: no telemetry, no remote AI, publisher `cynrath`, VSIX whitelist (no `node_modules`).
- No `child_process.exec(` with user content; grep gate `scripts/check-security-boundaries.mjs` still exits 0 — docs task must not introduce `exec` or `eval` in any new `examples/*.mjs`.
- No telemetry — `examples/` never phones home; docs privacy section re-affirms `offline-first · no telemetry by default` per REQ-V020-GOV-001/002.

## Performance

- Docs/examples impose zero runtime cost on product code; no benchmark thresholds changed. Ensure `examples/` total size < 2MB (excluding `node_modules` which is never committed) so clone remains fast.
- Large-repo guidance in `watch-dashboard.md` notes dashboard virtualization and recommends `benchmarks/` fixture classes (small 100 / medium 1k / large 5k / monorepo 3×1.5k) — does not invent latency numbers ("< 500ms p50" lives in benchmark reports, not marketing copy).
- Benchmark harness docs (`docs/reference/benchmarks.md`) point to `benchmarks/run.mjs` + `benchmarks/thresholds.json` (owned by TASK-0018) — docs task only describes, not re-runs, the suite.
- `pnpm build` of docs harness (link-check extra) must stay < 5s on CI ubuntu.

## Compatibility

- **Windows/macOS/Linux**: repo-relative paths POSIX (`split("\\").join("/")`), doc examples use `path.posix` for globs, never hardcode `\`; showcase both `C:\` and `/home` contraindications redacted.
- **Node 22 + Node 24**: all doc code blocks (ESM `import { scanRepository } from "@cynrath/agent-context-kit"`, `AbortSignal`, `diagnostics bundle`) work on both LTS lines; `engines.node >=22` documented.
- **v0.1.1 → v0.2.0 migration**: additive `ackit.yml` keys (`readiness.weights`, `profile`, `policy.rulePacks`, `diagnostics`) are optional with defaults preserving 0.1.1 `scan`/`pack`/`instructions` output; any non-additive change (none planned) would be called out in migration guide + `CHANGELOG.md Changed` + ADR note — currently document as "no breaking change expected" with disclaimer.
- **Existing docs**: do not delete `docs/history/v1.md`; keep `docs/decisions/` + `docs/rebuild/decisions/` index intact; mirror any decision edit in both trees if needed.
- **Single-package invariant**: `package.json` `exports` stays `"."` + `"./mcp"` only; examples that import SDK use the published package name, not `src/core` deep imports.

## Acceptance criteria

- [ ] `README.md` rewritten: 218-line baseline replaced with v0.2.0 feature summary (readiness, optimize v2, profiles, graph v2, rule packs, Action, watch/dashboard, diagnostics, SDK, VS Code, benchmarks), docs-index table includes every new guide, quick-start commands match actual `--help` (smoke-ran), status notes "pending release authorization" with no premature `0.2.0` published claim.
- [ ] New/updated guides exist and are committed: `docs/guides/getting-started.md` (refreshed), `docs/guides/readiness.md`, `docs/guides/optimize.md`, `docs/guides/provider-profiles.md`, `docs/guides/rule-packs.md`, `docs/guides/ci.md` (Action surface), `docs/guides/watch-dashboard.md`, `docs/guides/vscode.md`, `docs/guides/migration-v0.1.1-to-v0.2.0.md`, `docs/guides/troubleshooting.md`, `docs/guides/monorepo.md` (updated), plus concept `docs/concepts/readiness.md` (or appendix) and reference `docs/reference/diagnostics.md` + `docs/reference/sdk.md` rewrite + `docs/reference/cli.md`/`config.md`/`schemas.md` updates. `architecture/overview.md` extended for v0.2.0 subsystems.
- [ ] `docs/security/THREAT_MODEL.md` + `SECURITY_MODEL.md` contain v0.2.0 deltas paragraph for each of the 7 surfaces (dashboard, packs, action, diagnostics, SDK, VS Code, graph) with link to task/test id; `SECURITY.md` (if touched) retains disclosure contact.
- [ ] `examples/` contains ≥10 maintained per-feature fixtures listed in In scope, each with `README.md` + source/config, plus `examples/README.md` index. Every example passes `ackit scan --ci --json` (or documented expected threshold) when run via harness `scripts/check-examples.mjs` (or manual loop recorded in Completion notes). At least one fixture per REQ-V020-M-001 guide exists.
- [ ] `CHANGELOG.md` has `## [0.2.0] - 2026-09-xx` atop existing entries (above `0.1.1`), structured per Keep a Changelog with `Added`/`Changed`/`Fixed`/`Security`, referencing ADRs 0015–0024 and epics A–K; legacy verbatim section untouched; compare link placeholder present but no live `v0.2.0` tag assumed.
- [ ] `docs/guides/migration-v0.1.1-to-v0.2.0.md` contains breaking-change table, upgrade checklist (install, `config check`, `scan`, `readiness`, `optimize --dry-run`), and `ackit.yml` v2 additive-keys note; fallback for fresh clones.
- [ ] Dead-link gate green: `pnpm lint` equivalent markdown link-check (e.g., `scripts/check-docs-links.mjs` or `markdown-link` scan) over `README.md` + `docs/**/*.md` + `examples/**/README.md` returns 0 broken links; `pnpm gen:schemas` drift-free (`git diff` null for `schemas/*.schema.json`).
- [ ] `pnpm build` + `pnpm lint` + `pnpm format:check` + `pnpm typecheck` green; `pnpm test` green (existing ~304 + new docs/examples harness tests). New tests: docs harness that extracts code blocks from guides and runs `ackit` against the cited `examples/<name>/` fixture.
- [ ] `node dist/cli/index.js --version` still `0.1.1` (no bump), `--help` contains new flags (`--profile`, `--fail-below`, `--explain`, `--watch`) and contains 0 occurrences of `REQ-`/`ADR-`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` (contract-tested, REQ-V020-GOV-010). `node dist/cli/index.js doctor` OK, `scan --ci` OK, `task doctor` OK (dependency `TASK-0021` completed, no cycles).
- [ ] No version bump file leaked: `git diff --stat` between task start and completion does not touch `package.json` version line; `git tag --list` still `v0.1.0`, `v0.1.1` only; `git diff --check` whitespace clean; `.ackit/`/`artifacts/`/`dist/`/`coverage` not committed.

## Tests

Planning-only task — implementation tests wire real harnesses:

- **docs-review**: existing `tests/contract/*` still green, plus new `tests/docs/docs-examples-migration.test.ts` (or `scripts/check-docs-links.mjs` harness) that:
  1. Parses `README.md` + `docs/**/*.md` for `examples/<name>` references and asserts each fixture folder + `README.md` exists.
  2. Extracts fenced `bash`/`powershell` blocks that invoke `ackit` and runs them against the cited `examples/<name>` temp copy (`ackit scan --ci --json` exits per documented threshold).
  3. Asserts `CHANGELOG.md` has `## [0.2.0] - 2026-09` with `### Added/Changed/Fixed/Security` headings and no duplicate version.
  4. Asserts `docs/guides/migration-*.md` contains table header `| Area | v0.1.1 | v0.2.0 | Action |`.
  5. Asserts `docs/security/THREAT_MODEL.md` contains `v0.2.0` delta section and `dashboard`+`rule-pack`+`diagnostics` keywords.
- **contract**: update `tests/contract/api-surface/api-surface.test.ts` expectation still `exports: {".":…,"./mcp":…}` (no `"./core"`), and add docs contract asserting `schemas/*.schema.json` version keys match docs text; `actionlint` equivalent not needed for docs task.
- **security**: `scripts/check-security-boundaries.mjs` still 0; grep `AKIA|ghp_|BEGIN \w+ PRIVATE KEY|/home/` over `docs/` + `examples/` (excluding intentional fixtures under `examples/rule-pack-*` marked `<!-- allow-fake-secret -->`) returns 0.
- **integration**: `scripts/check-examples.mjs` (or inline test) loops `examples/*/` → `node dist/cli/index.js scan --ci --json` in temp copy of fixture, asserts valid JSON + `findings` array + `fingerprint` stable, records per-fixture pass/fail in Completion notes.
- **cli-smoke**: `node dist/cli/index.js --help` still renders without `REQ-` leak (contract), `ackit diagnostics --help` (if implemented) shows `--json` + `bundle` subcommand.
- **ci-config**: `.github/workflows/ci.yml` still 10 jobs (ubuntu/windows/macos × node22/24 + self-scan + package-smoke), pinned SHAs unchanged (docs task does not mutate workflow; verify via `grep -c "actions/checkout@f548" .github/workflows/ci.yml` == 1).
- **perf**: no perf regression — benchmark fixtures still deterministic (`benchmarks/generate-fixtures.mjs` twice → byte-identical if engine tasks already created).

Verification commands (record outputs in Completion notes):

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm lint; pnpm format:check; pnpm typecheck
pnpm test 2>&1 | tail -20
node dist/cli/index.js --version
node dist/cli/index.js --help | Select-String "REQ-|ADR-|VNEXT"  # expect 0
node dist/cli/index.js doctor
node dist/cli/index.js scan --ci
node dist/cli/index.js task doctor
node scripts/check-security-boundaries.mjs 2>&1
# per-example fixture smoke (after TASK-0021):
Get-ChildItem examples/* -Directory | ForEach-Object { Write-Host "--- $($_.Name) ---"; node dist/cli/index.js scan --ci --json --root $_.FullName 2>&1 | head -5 }
git status --short; git diff --check; git tag --list
```

## Documentation

- **Update**: `README.md`, `docs/guides/getting-started.md`, `docs/guides/ci.md`, `docs/guides/monorepo.md`, `docs/reference/cli.md`, `docs/reference/config.md`, `docs/reference/schemas.md`, `docs/reference/mcp.md` (if watch/dashboard impacts MCP notes), `docs/architecture/overview.md`, `docs/security/THREAT_MODEL.md`, `docs/security/SECURITY_MODEL.md`, `action/README.md` (Action usage excerpt), `extensions/vscode/README.md` (VS Code install excerpt).
- **Create**: `docs/guides/readiness.md`, `docs/guides/optimize.md`, `docs/guides/provider-profiles.md`, `docs/guides/rule-packs.md`, `docs/guides/watch-dashboard.md`, `docs/guides/vscode.md`, `docs/guides/migration-v0.1.1-to-v0.2.0.md`, `docs/guides/troubleshooting.md`, `docs/concepts/readiness.md` (or `provider-profiles.md`), `docs/reference/diagnostics.md`, `examples/README.md` + ≥10 `examples/<feature>/README.md` + fixtures, plus `docs/reference/benchmarks.md` stub if absent.
- **Keep**: `docs/history/v1.md`, `docs/decisions/*`, `docs/rebuild/decisions/*`, `docs/v0.2.0/*` (requirements/traceability/execution plan stay authoritative; traceability checked for docs coverage row).
- **Changelog**: `CHANGELOG.md` — prepend `[0.2.0]` per Keep a Changelog; document ADRs 0015–0024 and epic M.

All doc code blocks must be runnable; prose cites feature behavior from actual source/CLI, not from internal `REQ-*` IDs (those live only in `docs/v0.2.0/REQUIREMENTS.md` + `TRACEABILITY.md` + this task file).

## Evidence

Record in Completion notes (copy-paste exact outputs):

- Starting SHA (`git rev-parse HEAD`), ending SHA (after docs commit), `git status --short` (clean), `git branch --show-current` (`master`), `git tag --list`, toolchain `node -v` + `pnpm -v` + `node dist/cli/index.js --version` (still `0.1.1`).
- `README.md` before/after line count (`wc -l`), doc index table diff (`git diff --stat docs/`).
- `examples/` inventory: `ls -R examples` or `Get-ChildItem -Recurse examples | % FullName`, total folder count, per-fixture `scan --ci --json` exit + findings count (table).
- `CHANGELOG.md` `grep -n "## \[0.2.0\]" CHANGELOG.md` snippet + `### Added/Changed/Fixed/Security` headings present.
- `docs/guides/migration-*.md` presence + first 15 lines.
- Dead-link gate output (0 broken), `gen:schemas` drift diff (0), `grep -R "REQ-" -- docs guides` prose check (0 outside `v0.2.0/`).
- Help-leak contract: `ackit --help | grep -c "REQ-\|ADR-"` == 0.
- Security note: which 7 delta surfaces are documented + link to `THREAT_MODEL.md` diff lines + redaction fixture proof (5 secrets redacted in `diagnostics` example not leaked to docs).
- `pnpm test` pass (files+tests, e.g., "X test files, Y tests passed"), `pnpm build`/`lint`/`typecheck` exits, `task doctor` output, `doctor` output, `scan --ci` exit.
- Dependency proof: `TASK-0021` status `completed` at start time (capture `task doctor` deps acyclic + this task's `dependencies` list).

## Completion gate

No `--force`. Dependencies `TASK-0021` must be `completed` before start and remain `completed` throughout (audit via `node dist/cli/index.js task doctor` — dependency edge validated). This task is not `completed` until **all** acceptance criteria are checked, every `examples/<feature>/README.md` code block is runnable, `CHANGELOG.md [0.2.0]` is committed per Keep a Changelog, `docs/guides/migration-v0.1.1-to-v0.2.0.md` exists, dead-link + security grep gates are green, and Evidence section is fully filled with command outputs. The next in-graph task (`TASK-0023` full integration & consumer matrix) becomes runnable only after this task is `completed`; `TASK-0024` release readiness stays `blocked` until `TASK-0023` finishes — so docs completeness gates the final release. Any intentional deviation (e.g., postponing a guide) requires an ADR note and re-run of `task doctor` + traceability `unmapped=0` check.

## Requirement IDs

REQ-V020-M-001, REQ-V020-M-002, REQ-V020-GOV-010
