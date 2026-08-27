# AgentContextKit v0.2.0 — Canonical Requirements Contract

Status: **Planning-only** — authoritative requirements for the consolidated v0.2.0 release. This document is the single source of truth for every implementation task created in this release; all task acceptance criteria must trace to rows here.

Release: **v0.2.0** — one consolidated release, default branch `master`, package `@cynrath/agent-context-kit`, CLI `ackit`. No split into v0.3.0/v0.4.0.

Product objective: Make ACKit a best-in-class, offline-first repository readiness and context-engineering toolkit with measurable context quality, actionable optimization, provider-aware instruction resolution, declarative policy/rule packs, first-class CI integration, live local reporting, stable SDK, performance guarantees, diagnostics, and an official VS Code integration.

Core principles (GLOBAL_INVARIANT for v0.2.0, all MUST):

```
offline-first · deterministic · task-first · docs-first · safe by default
no hidden network calls · no telemetry by default · no arbitrary plugin-code execution
portable · machine-readable · human-readable · CI-friendly · agent-friendly
```

ACKit is not an LLM client. No remote AI/API dependency may be required for core operation.

Legend:
- Type: `MUST` (normative, blocking), `SHOULD` (expected, deviation requires ADR), `OUT` (explicitly out of scope — implementing is a violation).
- Priority: P0 release-blocking, P1 required for final gate, P2 nice-to-have but tracked.
- Verification classes: `unit`, `integration`, `contract`, `security`, `e2e`, `cli-smoke`, `ci-config`, `docs-review`, `perf`.

Internal IDs (`REQ-V020-*`) are stable and may appear in requirements/ADRs/tasks/tests/comments but MUST NOT appear in public CLI `--help` output (contract-tested). Public docs cite concepts, not IDs.

Related decisions: `docs/rebuild/decisions/ADR-0001..0014` (vNext baseline, reused where possible) + `docs/decisions/ADR-0015..0024` (v0.2.0 decisions created in this planning run). Every `MUST` below has an owner task; see `docs/v0.2.0/TRACEABILITY.md` for inverse index. Unmapped requirements = 0 enforced by task doctor + traceability gate.

---

## 1. Global invariants (inherited + v0.2.0 restated)

| ID | Title | Description | Rationale | Type | Priority |
|---|---|---|---|---|---|
| REQ-V020-GOV-001 | Offline-first core | No default network calls in product code; any feature requiring network is opt-in, explicit, and guarded; core scan/pack/graph/policy/tasks run without network. | Trust, privacy, air-gapped CI. | MUST | P0 |
| REQ-V020-GOV-002 | No telemetry by default | No analytics, no repository content exfiltration; telemetry, if ever added, requires explicit opt-in, distinct ADR, and privacy review. | Trust boundary. | MUST | P0 |
| REQ-V020-GOV-003 | Repository root containment | Every filesystem access validated canonical-path vs canonical repo root (normalize → realpath → containment); outside-root targets denied by default. | Path-traversal defense. | MUST | P0 |
| REQ-V020-GOV-004 | No absolute-path / secret leakage | Generated artifacts (reports, packs, JSON, SARIF, logs) contain only repo-relative paths; secrets redacted at construction, never stored in baselines/cache. | Privacy, security. | MUST | P0 |
| REQ-V020-GOV-005 | Determinism contract | Same repo + same config + same engine version ⇒ byte-identical JSON, SARIF locations, fingerprints, pack manifests, readiness scores; machine-dependent fields (timestamps, absolute paths) excluded from contracts and snapshot-gated. | CI reproducibility. | MUST | P0 |
| REQ-V020-GOV-006 | Safe by default writes | No user file overwritten without explicit intent flag (`--fix`, `--write-baseline`, `--write`, managed-block scope). Unrelated surfaces require diff/dry-run/preview. | Data safety. | MUST | P0 |
| REQ-V020-GOV-007 | No arbitrary plugin execution | No execution of arbitrary JS/TS plugin code from repo or pack contents; extensibility only via declarative YAML/JSON rule packs and pre-installed npm packages (offline). | Supply-chain security. | MUST | P0 |
| REQ-V020-GOV-008 | No `process.exit` from SDK | Programmatic SDK never calls `process.exit`; callers receive typed errors and exit codes; CLI layer owns process termination. | Library embedding safety. | MUST | P0 |
| REQ-V020-GOV-009 | Stable public contracts | CLI exit codes (0–5 per ADR-0007), JSON schema versions, SARIF 2.1.0 profile, task schemaVersion, policy schemaVersion, pack schemaVersion remain stable or version-bumped with migration docs; breaking changes carry ADR + CHANGELOG. | Backward compat. | MUST | P0 |
| REQ-V020-GOV-010 | No internal-ID leak | `REQ-*`, `ADR-*`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext` strings never appear in public `ackit --help` or MCP human-facing prompts; contract tests enforce. | User-facing polish. | MUST | P0 |

Out-of-scope (REQ-V020-GOV-OUT-001, type OUT): required database server, cloud control plane, login/account requirement, remote LLM, telemetry backend, arbitrary executable plugins, microservices, vector DB, mandatory daemon. Any new runtime dependency must be justified (why stdlib insufficient, security/size/maintenance impact, alternatives).

---

## 2. EPIC A — Agent Readiness / Context Quality Engine

Goal: deterministic `ackit scan` / `ackit doctor` surfaces a transparent readiness score 0–100 with per-category breakdown that explains every deduction with evidence, is CI-gateable, comparison/baseline-friendly, and regression-gated against drift.

| ID | Title | Description | Rationale | AC (testable) | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-A-001 | Scoring architecture & SPI | Introduce `src/core/readiness/` deterministic engine: pure function `scoreRepository(input) → ScoreReport` over instruction graph, context pack, task health, security findings, skills, policy. Engine has no network/LLM; weights/thresholds are declarative and versioned. | Reuse by CLI/MCP/Action/dashboard/SDK/VS Code. | Engine exists, has `scoreRepository` pure export, no I/O inside scorer, 100% deterministic (snapshot golden of fixture repo ⇒ identical JSON). | TASK-0008 | unit (golden fixture), contract (score schema), security (no I/O spy) | `docs/concepts/readiness.md`, `docs/reference/readiness.md` | none (no new surface) |
| REQ-V020-A-002 | Categories & weighting | Six normative categories: Instructions, Context Efficiency, Task Hygiene, Security, Skills, Policy. Each 0–100, weighted (default: Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10) normalized to overall 0–100 integer. Weights configurable via `ackit.yml` `readiness.weights` (optional, validated). | Transparent, actionable drill-down. | Default weights produce documented fixture scores; custom weights in config change overall score by expected arithmetic (±1 rounding); missing category → N/A. | TASK-0008 | unit (weight math), integration (config weights) | same | — |
| REQ-V020-A-003 | Deductions, severity → points, evidence | Each deduction is a typed `Deduction { category, points, severity (info/low/medium/high/critical), reason, evidence { relativePath, line? }, remediation?, stableId }`. Severity maps to points (critical 15, high 8–12, medium 4–5, low 1–2, info 0). No opaque scoring. | Auditability, fixability. | Every non-zero category score has ≥1 deduction with `evidence.relativePath` and human `reason`; golden fixture deduction list snapshot stable. | TASK-0008 | unit + contract (deduction schema), integration (scan→score parity) | same | secrets/paths redacted in evidence (reuse REQ-V020-GOV-004) |
| REQ-V020-A-004 | N/A, strict/CI thresholds, baseline/compare | Categories unavailable (e.g., no `docs/tasks` in repo) score N/A, excluded from averaging (re-normalize). `--strict` and `--ci` / `--fail-below <n>` gate on overall or per-category. JSON includes `baselineScore` / `threshold` fields when run with `--baseline`/`--compare`. | CI ergonomics. | No-tasks fixture shows `taskHygiene: { status:"n/a", reason:"no docs/tasks" }` and overall AVG recomputed; `scan --ci --fail-below 90` exits 1 when score 82 (E2E). | TASK-0008 | integration (n/a fixture, ci gate), e2e (baseline compare) | docs/guides/ci.md, cli reference `--fail-below` | — |
| REQ-V020-A-005 | Output contracts | CLI: terminal tree (category bars) + `--json` machine schema `ackit.readiness.v1` and SARIF-friendly summary. Machine stdout pure JSON; diagnostics stderr. Schema: `{ overall, categories[], deductions[], version, inputsHash }`. | Machine- + human-readable. | `ackit scan --json` (or `ackit readiness` if introduced) emits valid schema; terminal output snapshot-gated; `ackit --json` bare command includes readiness summary. | TASK-0008 | contract (schema), cli-smoke | cli.md, schemas.md | — |
| REQ-V020-A-006 | Stability & regression gate | Scoring stability contract: same fixture repo + same config+engine versions ⇒ identical overall + per-category scores and deduction IDs/order. Intentional scoring changes require ADR + version bump + recorded fixture re-baseline. | Prevent accidental score drift. | Dedicated regression test `readiness-stability.test.ts` asserts golden fixture score unchanged; intentional change test template documents bump process. | TASK-0008 | unit regression (golden), perf (no flake) | architecture/overview | — |

---

## 3. EPIC B — `ackit optimize` v2: Explain + Fix Plan

Goal: actionable, evidence-rich optimization advisor with filtering, JSON, fix-plan diff, and no silent mutation.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-B-001 | Findings taxonomy | Optimize emits findings across at least: duplicated instructions, conflicting instructions, overly broad scopes, shadowed guidance, stale task/context references, low-value context content, oversized context files, redundant provider guidance. Each finding: `{ id, category, severity(high/medium/low), confidence(high/medium/low), evidence: [{relativePath, line?, excerpt?}], remediation, tokenWasteEstimate?, beforeAfterImpact? }`. | Actionable, prioritized. | Fixture repo containing each class produces ≥1 finding per class; all findings carry severity+confidence+evidence+remediation. | TASK-0009 | unit (fixture per class), integration (real repo) | `docs/guides/optimize.md` | excerpts redacted, no secrets |
| REQ-V020-B-002 | CLI surface | `ackit optimize` (no mutation), `ackit optimize --explain --json`, `--category <cat>`, `--min-severity <level>`, `--format terminal|json|markdown|sarif` (SARIF optional P1). Filtering is deterministic; empty result exits 0 with empty list. | Parity with existing style. | Each flag combo snapshot-tested; `--category instructions --min-severity high` filters correctly; `--json` stdout pure JSON. | TASK-0009 | cli-smoke, contract | cli.md | — |
| REQ-V020-B-003 | Token/context waste estimates | Where deterministically computable, emit `tokenWasteEstimate` (e.g., duplicate instruction token count, oversized file over-budget tokens). Estimate uses existing `estimateTokens` helper, labeled "estimate". | Quantified impact. | Duplicate-AGENTS fixture shows waste == sum tokenEstimates of duplicates; no LLM, deterministic. | TASK-0009 | unit | optimize guide | — |
| REQ-V020-B-004 | Fix-plan boundary | No silent mutation: default run is read-only. Safe auto-fix, if offered, is a distinct mode `optimize --fix --dry-run` (preview diff) and `optimize --fix` (writes). Writes limited to ACKit-managed surfaces (managed blocks, `docs/tasks` hygiene) or explicitly listed paths with confirmation; provide `--diff` preview + rollback guidance (revert commit). All fix candidates carry `plan: { target, action, diff }`. | GOV-006 compliance. | `--fix` without `--dry-run` in integration temp repo only modifies managed surfaces; `--dry-run` emits unified diff without touching FS (assert file mtime unchanged). | optimize.md, security model | path containment, no root escape |
| REQ-V020-B-005 | Explain output | `--explain` prints provenance for each finding: which graph nodes/policy rules/instructions triggered it, ordered evidence. | Debuggability. | `--explain --json` finding includes `provenance: { graphNodeIds, policyRule? }`; deterministically sorted. | TASK-0009 | integration | — | — |

---

## 4. EPIC C — Provider-Aware Context Profiles

Goal: built-in, offline, versioned profiles for OpenAI Codex, Claude Code, GitHub Copilot, Gemini CLI, generic/default, with deterministic `pack`/`instructions`/`optimize` integration.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-C-001 | Profile schema + built-ins | `schemas/profile.schema.json` v1 with `{ name, provider, instructionApplicability, fileConventions, contextBudget: { maxTokens, includePriority }, precedenceOverrides }`. Built-ins under `templates/profiles/` (or `src/core/profiles/built-ins/`) for codex/claude/copilot/gemini/generic. No network. | Single source of mapping. | Schema valid; each built-in validates; snapshot of each profile reviewed. | TASK-0010 | contract, unit | `docs/concepts/provider-profiles.md` | no executable code in profiles; schema strict |
| REQ-V020-C-002 | Selection, precedence, fallback | Selection order: CLI `--profile` > `ackit.yml` `profile` > auto-detect (by instruction files present, deterministic tie-break generic). Provider `applyTo` / file convention wins are profile-aware; unknown provider → generic fallback with diagnostic. | Predictable behavior. | Matrix test: `--profile copilot --for src/foo.ts` applies copilot globs; unknown profile value errors with remediation; missing config falls back to auto-detect snapshot. | TASK-0010 | unit, integration | same | — |
| REQ-V020-C-003 | Pack/instructions/optimize integration | `pack` uses profile `contextBudget` and `includePriority` when `--profile` set; `instructions --provider` respects profile file conventions (e.g., extra surface files); `optimize` flags redundant provider guidance per profile. `ackit config check` validates profile fields. | End-to-end value. | `pack --profile codex --json` manifest includes profile id and adjusted ranking score vs generic (assert weight delta). | TASK-0010 | integration | same + cli.md | — |
| REQ-V020-C-004 | Custom profiles & maintenance | Users may add `profiles/*.yml` under repo or via `ackit.yml` `profiles: { extend: [path] }` (local only, no URL fetch). Built-in profiles versioned; change requires ADR note + changelog; vendor fact accuracy guarded by per-provider fixture (one minimal repo per provider). | Extensibility without fetch. | Custom profile file discovered in integration temp repo; invalid custom profile yields structured diagnostic `PROFILE-*` with file:line. | same | policy/containment |
| REQ-V020-C-005 | Diagnostics & observability | `ackit instructions --json` includes `profile` applied; `ackit diagnostics --json` includes `profile` resolution trace. | Debug/CI. | `--json` output contains `profile: { requested, resolved, source }`. | TASK-0010 + TASK-0017 | integration | — | — |

---

## 5. EPIC D — Instruction Graph v2

Build on `src/core/instructions/graph.ts` (ADR-0006) — do not replace working architecture without justification/ADR.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-D-001 | Graph schema v2 + explain | Extend `InstructionNode` / `InstructionGraph` schema to include `includeScopes`, `excludeScopes`, `providerApplicability`, `provenance[]`, `shadowedBy?`, `duplicateOf?`, `orderIndex`. `ackit instructions --json` emits v2 schema; `--explain` prints per-node why-included + ordered chain. | Answers "which, why, in what order, what conflicts/shadowed". | Graph JSON validates against `schemas/instruction-graph.schema.json` v2; `--explain` output snapshot-tested for fixture. | TASK-0011 | contract, unit | instruction-graph.md, cli.md, schemas.md | — |
| REQ-V020-D-002 | Scope resolution hardening | Nested scope resolution conforms to ADR-0006 + new hardening: explicit `includeScopes`/`excludeScopes` (glob), provider applicability filtering, deterministic ordering (scope depth → precedence → id tie-break), monorepo path-scoping independent of workspace boundaries, Windows/macOS/Linux normalization (POSIX repo-relative), symlink → realpath before scope match, circular reference protection if references exist, graph-size limits (maxNodes/maxDepth with diagnostic `INSTR-LIMIT-*`). | Correctness, portability. | Fixture repo with 4-level nesting + overlapping globs + include/exclude → effective stack for `src/foo/bar.ts` exactly matches spec sequence; symlink to nested AGENTS treated identically on win32/posix; maxNodes limit emits diagnostic not crash. | TASK-0011 | unit (scope logic), integration (symlink/monorepo/size-limits) | same | symlink escape denied via fs engine |
| REQ-V020-D-003 | Conflict/duplicate/shadow/dead detection | Deterministic detection (no LLM): conflicting directives (opposite values), exact/near duplicates (hash/line-diff threshold), shadowed guidance (more-specific node fully covers less-specific with higher precedence), dead/unreachable instructions (no path in repo matches its scope). Provenance preserved. | Optimize/score input. | Each category covered by a fixture that triggers exactly one finding `INSTR-CONFLICT|INSTR-DUPLICATE|INSTR-SHADOWED|INSTR-UNREACHABLE`; reused by optimize + score. | TASK-0011 | unit, integration | same | — |

---

## 6. EPIC E — Declarative Rule Packs / Policy Packs

Safe extensibility — YAML/JSON rule packs, offline, local/repo loaded, optional package-distributed declarative packs if safely supportable, no downloaded executable code.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-E-001 | Pack format & schema | `schemas/rule-pack.schema.json` v1: `{ schemaVersion:1, packId, namespace, version, severity, rules: [{ id, type: presence|pattern|config|dependency|instruction, glob?, match, severity?, remediation }], overrides?, composition? }`. Strict zod validation, size/complexity limits (maxRules 200, maxPatternLen 500). | Stable, safe DSL. | Schema + fixtures: valid pack loads; oversize pack → diagnostic `POL-PACK-LIMIT` not crash. | TASK-0012 | contract, unit, security (limits) | `docs/guides/rule-packs.md` | no JS eval; patterns compiled via RE2-safe via `picomatch`+ bounded regex |
| REQ-V020-E-002 | Loading, composition, precedence | Local/repo loading: `ackit.yml` `policy.rulePacks: [path]` (repo-relative, fs-contained) + `extends` for policy. Optional package-distributed packs: only from pre-installed npm packages (`node_modules/<pkg>/ackit-packs/*`) — no auto-fetch. Composition: packs merge deterministically; later extends wins unless `locked: true`; collisions emit `POL-PACK-COLLISION`. Unknown pack id → diagnostic. | Offline, deterministic. | Integration temp repo with two packs (conflicting rule same id) produces single effective rule + collision diagnostic; `extends` URL → error `POL-NETWORK-REFUSED`. | TASK-0012 | integration, security | same | path containment, no traversal |
| REQ-V020-E-003 | Evaluation & CI | Evaluator is pure function `evaluatePack(pack, repoFiles) → findings` with glob/scope matching, presence/absence/content/pattern/config assertions; integrated into `executeConfiguredScan` as additional rules. Findings reuse scanner `Finding` schema (stable fingerprints). CI: `--ci` / `--fail-below` counts pack findings. | Unified findings surface. | Pack fixture providing `forbiddenPattern` + `presence: README.md must exist` → exactly 2 findings matching fingerprints deterministically; `scan --ci` fails on high pack finding. | TASK-0012 | integration, e2e | same | ReDoS guard: regex timeout / bounded length, test with catastrophic backtracking input |

---

## 7. EPIC F — Official GitHub Action

Minimal, secure, trusted-network-aware.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-F-001 | Action architecture | Package as `action.yml` (choose composite vs Node vs Docker via ADR-0020 and record). Decision factors: bundle vs npm, pinning, provenance. Default: Node 24 pinned action that invokes the published `@cynrath/agent-context-kit@0.2.0` (or bundled dist) with `command: scan|doctor|pack|...`. Metadata: name `AgentContextKit`, branding, inputs `command`, `args`, `fail-threshold`, outputs `findings-json`. | Minimal, maintainable. | ADR-0020 records choice with rationale (bundle vs npm trade-off: supply-chain, offline air-gap, version pin); `action.yml` validates via `actionlint`. | TASK-0014 | ci-config (actionlint), integration (dockerless smoke) | `docs/guides/ci.md`, `action/README.md` | SHA-pinned deps, no arbitrary code |
| REQ-V020-F-002 | CI integration surface | Annotations (GitHub Checks), optional SARIF upload (where appropriate), job summary (Markdown table of findings + readiness score), JSON artifact upload, `fail-threshold` gating, least-privilege `permissions: contents: read, checks: write?` documented. | GitHub-native UX. | Fixture workflow running `uses: ./. --command scan --fail-threshold medium` produces annotations + summary; `sarif` output artifact valid SARIF 2.1.0. | TASK-0014 | integration (act-ish / hosted workflow) | same | permissions least-privilege documented |
| REQ-V020-F-003 | Marketplace, dogfood, version coupling | `marketplace` metadata (if published), BRANCH protection: `master` push never publishes npm; tag `v0.2.0` triggers `.github/workflows/release.yml` only. Dogfood workflow `.github/workflows/ackit.yml` (or reuse `ci.yml`) runs `Cynrath/agent-context-kit@v0.2.0` against itself. Action tests: unit for input parsing, integration for `uses: ./` smoke. | Adoption, trust. | Dogfood workflow file exists and passes `actionlint`; tag `v0.2.0` does not trigger duplicate publish of action (separate workflow dispatch if marketplace). | TASK-0014 | contract (action.yml schema) | same | supply-chain: action pins `@cynrath/agent-context-kit` exactly `0.2.0` |

---

## 8. EPIC G — Watch + Local Dashboard / Report Server

Local live workflow — no cloud.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-G-001 | Watch engine | `ackit scan --watch` and `ackit watch` (alias) reuse polling-based watcher (existing `src/core/watch/watch.ts`) with debounce/coalescing (default 400ms), incremental scan+cache (G-Cache), ignored paths (`.git, node_modules, dist, .ackit, coverage, artifacts` + user excludes), graceful shutdown (SIGINT → `WatchHandle.done` + exit 0), cross-platform identical behavior. | Live feedback without watcher crash. | Debounce coalescing tested: 3 rapid file writes → exactly 1 rescan callback; Ctrl+C abort → `watch stopped cleanly`; ignored dir changes do not trigger. | TASK-0015 | unit + integration (watch semantics) | docs/guides/watch-dashboard.md | no outside-root traversal |
| REQ-V020-G-002 | Report server / dashboard | `ackit report serve` (existing seam) extended + `ackit dashboard` (alias or new command) serving a local UI that is localhost-only (127.0.0.1 default), configurable `--port 0` (random), `--host` requires `--allow-nonlocal`. UI shows live readiness score, findings table, instruction graph view (per-file effective stack), task health, policy/rule-pack results, context insights; live updates via SSE/long-poll/websocket-poll (chosen in ADR-0019, minimal dependency). Terminal and server share engine/SDK (no duplicated logic). | Local-first live reporting. | `ackit report serve ./out.sarif --port 0` binds loopback and serves HTML that shows findings count = scan count; non-loopback bind without flag → exit 2 with diagnostic; `--port 0` returns random free port; serve handles 2 sequential changes (scan re-run) without restart. | TASK-0016 | integration (serve), e2e (watch+serve) | same | localhost-only default, security headers (CSP `default-src 'self'`, `X-Content-Type-Options: nosniff`), XSS-escaped content, path/content redaction, large repo paging |
| REQ-V020-G-003 | Engine/UI API boundary | UI consumes a stable local API (`/api/scan.json`, `/api/graph.json`, `/api/readiness.json`, `/api/tasks.json`) backed by SDK calls; no direct FS access from client. Frontend is minimal: <50KB vanilla JS/TS + lightweight CSS, no heavy framework justified; if a framework is needed, ADR records justification (size/security/maintenance). Accessible (WCAG AA basics: keyboard nav, contrast, aria labels), `open` flag optionally auto-opens browser via `open` npm-less (use `node:child_process` `start`/`open`/`xdg-open` with sanitized args). | Small, maintainable, portable. | UI built without React/Vue/etc. (or ADR justifies); bundle size < 100KB gz-checked; axe-like manual checklist passes (keyboard nav to findings table, screen-reader labels). | TASK-0016 | architecture, contract (api json schemas) | same | XSS: every relativePath/content rendered via `textContent`/escaped interpolation; secret shapes never in HTML |
| REQ-V020-G-004 | Large repo behavior | Dashboard virtualizes/paginates findings; scan summary streamed; watch incremental recomputation used for large repos (>5k files) to keep UI < 100ms render. | Usability at scale. | Benchmark large fixture: dashboard serves initial HTML in < 500ms p50 on CI; findings table paginates >10k findings. | TASK-0016 | perf, integration | same | — |

---

## 9. EPIC H — Diagnostics / Observability

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-H-001 | Diagnostics command | `ackit diagnostics` (or `ackit doctor --verbose` extension, but canonical is `ackit diagnostics`) prints environment: ACKit version, Node/platform/arch, config resolution trace (which `ackit.yml` + merged values), instruction resolution summary (count per provider), cache stats (hit ratio, size), timings per phase, rule-pack status, task health (active count, schema issues). Flags: `--json` (pure stdout JSON), `bundle` subcommand `ackit diagnostics bundle --out ./ackit-diag.zip` produces sanitized support bundle (zip or tar.gz, deterministic manifest). | Supportability. | Terminal output contains each section; `--json` output matches `schemas/diagnostics.schema.json` v1 deterministically (sorted keys, stable order). | TASK-0017 | unit, integration (diagnostics) | `docs/reference/diagnostics.md` | — |
| REQ-V020-H-002 | Sanitized bundle | Bundle contains: sanitized `ackit.yml` (secrets redacted), graph JSON, sanitized finding excerpts, cache stats, but NEVER secret values (ACKIT001..005 shapes replaced with `[REDACTED]`), NEVER absolute machine paths (replaced with `<local-path>` or repo-relative), NEVER env vars. Manifest `bundle-manifest.json` lists files + sha256 + redaction count, deterministic ordering. `ackit diagnostics bundle --redact-check` can re-verify. | Privacy. | Fixture repo containing a fake AWS key + `/home/user/secrets.txt` absolute path → bundle contains `[REDACTED]` and no home path; regression test with known secret fixtures proves sanitization (5 fixture secrets, all redacted). | TASK-0017 | security (redaction proof), e2e | same | secret/path redaction is MUST |

---

## 10. EPIC I — Performance Regression / Benchmark System

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-I-001 | Fixtures | Deterministic synthetic fixtures under `benchmarks/fixtures/` (or `benchmarks/` existing) for: small (100 files), medium (1k), large (5k), large monorepo (3 workspaces × 1.5k), deep instruction graph (50 nested AGENTS + 100 copilot instructions), large task set (200 tasks), large rule-pack set (100 rules). Generator `benchmarks/generate-fixtures.mjs` deterministic across runs (seeded RNG, sorted output). | Reproducible baselines. | `generate-fixtures.mjs` twice → files byte-identical (hash set diff 0); each class file count matches spec within ±1%. | TASK-0018 | integration (fixture determinism) | `docs/reference/benchmarks.md` | — |
| REQ-V020-I-002 | Bench harness & metrics | Scripts `benchmarks/run.mjs` and `benchmarks/thresholds.json` measuring where useful: cold scan, warm scan, incremental scan (1-file change), instruction graph build, context pack (50k token budget), policy/rules evaluation, `doctor`, memory RSS (peak), cache hit ratio, throughput (files/sec). Output `benchmarks/results/<date>-<sha>.json` + `thresholds.json` (multipliers per metric per class). Runner variance handling: median of 3 runs, warmed file cache, isolated temp dir. | Actionable perf gates. | Run `run.mjs --classes small,medium --out /tmp/out` produces results JSON with all metrics; `check-thresholds.mjs` compares vs `thresholds.json` and fails CI when drift > multiplier. | TASK-0018 | contract (results schema), perf | same | no flaky timing gates: relative multipliers, not absolute ms |
| REQ-V020-I-003 | CI vs scheduled & evidence | PR CI runs quick subset (small/medium) as non-blocking advisory; scheduled nightly (or manual `workflow_dispatch` if scheduled blocked) runs full suite vs `master` SHA and archives artifact. Evidence format documented; complexity limits enforced (no infinite fixtures). Baseline storage: committed `benchmarks/baselines/<class>.json` or artifacts — chosen in ADR-0022 and recorded. No flaky timing gates: thresholds are multipliers (e.g., cold scan < baseline ×1.5), not absolute. | Signal without noise. | CI workflow `benchmarks.yml` (or addition to `ci.yml`) runs small/medium on PR; artifact uploaded; scheduled job defined with `workflow_dispatch` fallback. | TASK-0018 | ci-config | same | — |

---

## 11. EPIC J — Public SDK v1

Audit actual exports in `src/index.ts` first — stabilize, do not expand blindly.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-J-001 | Supported exports & types | Public surface is exactly `src/index.ts` re-exports: `scanRepository`, `loadAckitConfig`, `buildContextPack`, `buildInstructionGraph`, `resolveEffectiveStack`, `validateSkills`, plus types (`AckitConfig`, `InstructionGraph`, `Finding`, `ScanResult`, etc.). All other `src/core/**` modules are internal-only and NOT exported via `package.json` `exports`. Added v0.2.0 exports: `scoreRepository` (readiness), `evaluateRulePack` (rule-pack), `BuildGraphOptions` extension for profiles. Types fully strict (no `any`). | Small, stable surface. | Contract test `tests/contract/api-surface/api-surface.test.ts` asserts allowed export list exactly (addition requires approval); `package.json` `exports` allows `"."` and `"./mcp"` only. | TASK-0013 | contract (api-surface), unit (types) | `docs/reference/sdk.md`, `docs/architecture/overview.md` | — |
| REQ-V020-J-002 | Error model, cancellation, package policy | Errors typed (no raw throw of strings): `AckitError` with `code` + `remediation`. No `process.exit`; callers receive exit-code-equivalent via `ScanResult`/`ScoreReport` metadata. Async APIs accept `AbortSignal`. Package exports: `type: module`, Node `>=22`, `sideEffects: false`. ESM-only (CJS via dynamic import shim documented if needed) — policy matches current `package.json` and ADR-0001. | Embeddable, cancellable. | Calling `scanRepository(root, { signal: abortedSignal })` rejects with `AbortError` within 200ms; importing `@cynrath/agent-context-kit` does not execute side effects (import count smoke). | TASK-0013 | integration (AbortSignal), e2e (esm import) | same + examples | — |
| REQ-V020-J-003 | SDK consumer test & dogfooding | Isolated consumer test: fresh temp project `npm pack` → `npm install $tarball` → ESM `import { scanRepository } from "@cynrath/agent-context-kit"` → scan fixture ⇒ findings array not empty, no `process.exit` fired. CLI, MCP, Action, dashboard, VS Code all import from `src/index.ts` SDK (no duplicated scanner logic). | Prove embedding works. | `tests/integration/sdk-consumer.test.ts` green; grep `src/cli`/`src/mcp`/`extensions` shows zero direct imports of `src/core/scanner/pipeline.ts` etc. (only via `src/index.ts`). | TASK-0013 | e2e consumer, integration | sdk.md, examples/sdk-*.mjs | — |

---

## 12. EPIC K — Official VS Code Extension

Planning decides location based on actual repo layout (`packages/vscode` vs `extensions/vscode` vs `apps/vscode` — no directory exists yet, so choose `extensions/vscode`; justify in ADR-0021; root stays single-package per ADR-0002, extension is a separate build artifact with its own manifest but shares SDK).

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-K-001 | Extension foundation & packaging | Location `extensions/vscode/` (chosen per ADR-0021 after verifying no conflict with current single-package files). Tech: TypeScript, `vscode` extension API `>=1.90`, bundler `esbuild` (no heavy deps). Activation: `onStartupFinished` lightweight; commands lazy-loaded. Packaging: `vsce package` → `.vsix` (auditable contents). Version alignment: extension `package.json` version mirrors `@cynrath/agent-context-kit` core version (`0.2.0`); mismatch emits activation warning. No telemetry by default; no remote AI. | First-class IDE integration. | `pnpm --filter vscode build` (or `make vsix`) produces `ackit-0.2.0.vsix` with only `dist/extension.js`+`package.json`+`README`+`LICENSE`; size <2MB. | TASK-0019 | unit (extension tests via `@vscode/test-electron` --headless), integration | `extensions/vscode/README.md`, `docs/guides/vscode.md` | no arbitrary code exec; localhost binding none |
| REQ-V020-K-002 | Feature integration | Readiness score status bar + tree view; Problems integration (scan findings → `DiagnosticCollection` with code `ACKITxxx`); findings tree; instruction graph: "instructions applying to current file" via `resolveEffectiveStack`; task status view; policy/rule findings inline; optimize recommendations as CodeActions/lightBulb; Command Palette: `ACKit: Refresh`, `ACKit: Show Graph`, `ACKit: Optimize`, `ACKit: Diagnostics`; refresh/watch (fileSystemWatcher debounced shared with core). Reuse SDK/engine: extension calls SDK (`scanRepository`, `buildInstructionGraph`, `scoreRepository`) via Node child? Decision recorded in ADR-0021 (direct SDK import vs subprocess). Preferred: direct SDK import (in same Node host) unless sandboxing requires subprocess — document why. Cross-platform (Win/Mac/Linux). | IDE ergonomics. | Open fixture workspace, palette `ACKit: Refresh` → Problems shows ≥1 ACKIT finding; opening `src/foo/bar.ts` shows effective stack length 2 in sidebar view; `ACKit: Instructions for current file` QuickPick lists nodes ordered by precedence. | TASK-0020 (or sub-task if split per prompt §6: K requires at least two tasks — foundation + feature integration) | integration (vscode test), manual smoke checklist | same | no secret leakage in Problems (redacted evidence) |
| REQ-V020-K-003 | Marketplace metadata & publication guard | `publisher: cynrath`, `displayName: AgentContextKit`, categories `Linters`, keywords `ackit,agent-readiness,context`. ICON, README, LICENSE, CHANGELOG. Marketplace publication is a SEPARATE authorization checkpoint (user must explicitly authorize `vsce publish`); CI never publishes without it; version 0.2.0 release readiness task records VSIX smoke but not publish. | Controlled marketplace. | `package.json` `publisher`/`categories`/`engines.vscode` asserted in contract test; `vscode:prepublish` script validates VSIX contents (no stray `node_modules`). | TASK-0019 | contract, e2e (vsix audit) | publishing.md | least-privilege, no secret in vsix |

---

## 13. EPIC L — Cross-Cutting Security Hardening

Every affected feature task MUST contain its own security acceptance criteria (this epic is the hard gate reviewing them).

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-L-001 | Surface coverage | Harden: dashboard/report server (XSS, localhost binding, headers, redaction), rule packs (traversal, ReDoS, size limits, no exec), GitHub Action (pinning, permissions, input injection), SDK (no `process.exit`, no path leak), VS Code extension (no telemetry, no remote AI, safe activation), diagnostics (sanitization), plus generic: path traversal, symlinks, malicious globs, malicious repo content (poisoned instructions), ReDoS, YAML/JSON parser limits (maxDepth 20, maxFileBytes), memory/size limits, shell/command injection (no `exec` with user content), action input injection, archive/tarball/VSIX contents audit, dependency/supply-chain review, localhost binding/security headers. | New attack surface. | Security checklist doc `docs/security/THREAT_MODEL.md` updated with v0.2.0 deltas; each feature task references its checklist id and links to tests. | TASK-0021 | security suite (one fixture per surface) | docs/security/THREAT_MODEL.md, SECURITY_MODEL.md | MUST |
| REQ-V020-L-002 | Automated gates | Security regression tests run in CI matrix (ubuntu+windows+macos × node22/24). `pnpm test` includes `tests/security/*` + new `tests/security/v020-*.test.ts`. Grep gate in final task asserts no `child_process.exec(`, no `eval(`, no `require(userInput)`, no `fetch(` in `src/`. | Prevent regression. | CI run passes security matrix; grep gate script `scripts/check-security-boundaries.mjs` exits 0 and is contract-tested. | TASK-0021 | ci-config, security | — | — |

---

## 14. EPIC M — Documentation / Examples / Adoption

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-M-001 | User guides & references | Update/create: README (new features summary, badges), quick start, readiness guide, optimize guide, provider profiles, instruction graph v2, rule packs, GitHub Action, watch/dashboard, diagnostics, SDK, VS Code extension, monorepo guide, CI recipes, migration from v0.1.1 (breaking changes if any), troubleshooting, privacy/offline/security model, architecture overview. Each guide has at least one tested example fixture that `ackit` runs against. | Adoption. | `docs/guides/*.md` each links to a fixture under `examples/` or `benchmarks/fixtures/` that passes `ackit scan --ci` without threshold; dead-link gate (`pnpm link-check` or `markdown-link`) green. | TASK-0022 | docs-review, integration (guide fixture scan) | all listed files | no unsupported claims (claim = test) |
| REQ-V020-M-002 | Examples & changelog | At least one maintained example repo fixture per major feature (readiness-high, provider-copilot, rule-pack demo). `CHANGELOG.md` structure: `[0.2.0] - 2026-09-xx` with Added/Changed/Fixed/Security, per Keep a Changelog. | Discoverability. | `examples/` contains `readme.md` index; each example folder has `README.md` + `.ackit-fixture.yml` proving `ackit scan --json` valid; `CHANGELOG.md` entry present before release task. | TASK-0022 | docs-review | CHANGELOG.md | — |

---

## 15. EPIC N — v0.2.0 Integration & Release Readiness

This is the FINAL release task — do not execute (no publish/tag) in this planning run. It defines the gate that the next prompt must satisfy before any tag creation.

| ID | Title | Description | Rationale | AC | Task | Tests | Docs | Security |
|---|---|---|---|---|---|---|---|---|
| REQ-V020-N-001 | Pre-tag gate | All implementation tasks completed + `task doctor` clean, `traceability` complete (unmapped 0), full docs present, full tests green (unit/integration/contract/security/cli-smoke/e2e/perf), package smoke passes, SDK consumer passes, MCP consumer passes, GitHub Action consumer passes (local `act` or hosted smoke), dashboard/watch smoke (loopback bind + 1 rescan cycle), diagnostics/redaction smoke (5 known secrets redacted), rule-pack smoke (2-findings fixture), provider-profile smoke (4 providers + generic), benchmark report generated vs baseline (multipliers within thresholds or justified), VS Code test/build/VSIX smoke (size <2MB, manifest audit), npm tarball audit (whitelist, no secrets), VSIX audit (whitelist, size), exact-SHA `master` CI 10/10 green, `.github/workflows/release.yml` OIDC path verified (no long-lived token), **npm version `0.2.0` absent from registry (E404)**, **tag `v0.2.0` absent local+remote**, explicit user release authorization recorded in task completion notes with exact SHA. | Controlled release. | Checklist in TASK-0024 (release task) requires each bullet signed off with command output + SHA; task is blocked (`[!]`) until all predecessors complete. | TASK-0024 | integration, e2e, ci-config | release notes | least-priv auth |
| REQ-V020-N-002 | Publish & verify | After authorization: create annotated tag `v0.2.0` on exact SHA → `release.yml` publishes via OIDC Provenance → registry verify (version, shasum, dist-tag, provenance), npx smoke, GitHub Release (title `AgentContextKit v0.2.0`, notes `CHANGELOG.md` 0.2.0 section), local `npm install --global @cynrath/agent-context-kit@0.2.0` verify. VS Code Marketplace publication is a SEPARATE checkpoint requiring separate authorization (do not imply marketplace publish authority). Tag-triggered npm publication is the ONLY publish path; master push never publishes. | Safe, verifiable publish. | Registry state: versions includes 0.2.0, `latest→0.2.0`, integrity matches local pack (content-identical ignoring npm-normalized packaging deltas per v0.1.1 precedent), provenance present; GitHub Release `v0.2.0` exists with 0.2.0 notes; npx `0.2.0 --version` returns 0.2.0. | TASK-0024 | e2e (publish verify) | CHANGELOG + GitHub Release body | supply-chain attested |

---

## 16. Traceability & verification

- Forward map: this file → `docs/v0.2.0/TRACEABILITY.md` inverse + `docs/v0.2.0/EXECUTION_PLAN.md` dependency graph.
- Coverage invariants (MUST hold): `unmapped requirements = 0`, `tasks without acceptance criteria = 0`, `implementation tasks without test plan = 0`, `unknown task dependencies = 0`, `dependency cycles = 0`, `tasks referencing nonexistent REQ IDs = 0`, `REQ IDs referencing nonexistent tasks = 0`, `no v0.3/v0.4 split` (all tasks `release: v0.2.0`).
- Validation: `pnpm build && pnpm test` + `node dist/cli/index.js task doctor` + `node dist/cli/index.js doctor` + `node dist/cli/index.js scan --ci` + `git diff --check` + dependency-cycle script + traceability completeness script (see `docs/v0.2.0/EXECUTION_PLAN.md`).

## 17. Out-of-scope explicitly rejected (implementing is a violation)

See REQ-V020-GOV-OUT-001. Specifically: mandatory Postgres/Redis, hosted control plane, account/login, vector DB, telemetry endpoint, downloaded executable plugin code, remote LLM calls in scan/pack/graph.

Any new third-party runtime dependency must include in its task: why stdlib/insufficient, security impact, package-size impact, maintenance impact, alternatives considered.

---

*Generated planning-only for v0.2.0 — no product implementation, no version bump, no publish. Next prompt executes the full task chain in `docs/v0.2.0/EXECUTION_PLAN.md` dependency order.*