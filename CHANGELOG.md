# Changelog

All notable changes to ACKit (`@cynrath/agent-context-kit`) are documented in this file.

This project follows Semantic Versioning.

## [0.4.1] - 2026-09-04

Patch release from the v0.4.0 maintenance line (no minor features; current
master-only additions such as `task archive --completed` and
`TASK-COMPLETED-IN-ACTIVE` are intentionally excluded and remain targeted at
a future minor). The Browser Companion experiment remains paused on its
separate branch and is **not** part of this release.

### Fixed

- **Builtin skill template correctness** (backport of the TASK-0077 audit,
  adapted to the v0.4.x capability surface): `ackit-workflow` no longer
  instructs the invalid `ackit task "<title>"` shorthand (correct syntax is
  `ackit task create "<title>"`) and now covers the shipped workflow surface
  (task-first plan, intent when required, workflow profiles/stages,
  plan/spec/decision refs, checkpoints/resume/handoff, evidence,
  verification/verdict, composed completion gate, no false completion, final
  `task archive <id>` lifecycle, doctor/task doctor/scan gates);
  `ackit-scan-and-fix` documents the exact inline suppression form
  (`# ackit-ignore:ACKITnnn <reason>`), severity triage, and the
  non-suppressible `ACKIT099` advisory with no gate weakening;
  `ackit-context-optimization` documents deterministic task-aware packs
  (`--task`/`--resume`), budget behavior, and `optimize --fix` fenced to
  ACKit-managed surfaces; `ackit-policy-authoring` documents Policy
  v2 tiers/autonomy where public, deterministic layered merge, locks, and
  offline-only resolution verified via `ackit policy check`.
- **Skills `install`/`sync` `--force` CLI wiring**: the flag was read from
  the parent command options instead of the subcommand options, so it was
  silently ignored and owned-modified skills stayed conflicted. Both
  subcommands now honor `--force` (third-party skills are still refused even
  with `--force`).

### Added

- **Builtin-skill ↔ CLI/package regression tests**: `tests/contract/
  skills-parity.test.ts` (builtin discovery, frontmatter/name/path, explicit
  command-case ↔ CLI `--help` smoke, stale-syntax and master-only-helper
  negative probes, npm packaging whitelist) and `tests/integration/skills/
  force-cli.test.ts` (CLI-level `--force` behavior incl. third-party
  refusal).

### Compatibility

- Backward compatible patch: no new commands, options, skills, or findings;
  legacy repositories keep their supported defaults.
- No new network/LLM dependency: the offline-first invariant is preserved
  and gated.
- MCP remains read-only: all state mutation stays CLI-only.

## [0.4.0] - 2026-09-03

Managed-asset sync, post-0.3.0 limitation closure, and version hygiene (minor
release). All capabilities are backward compatible — legacy repositories keep
their supported defaults. The Browser Companion experiment remains paused on its
separate branch and is **not** part of this release.

### Added

- **`ackit sync` managed-asset lifecycle** (TASK-0072): unified, version-aware,
  preview-first reconciliation of ALL ACKit-owned managed assets in one pass —
  the managed instruction block in `AGENTS.md`, the provider shims (`CLAUDE.md`,
  `GEMINI.md`, `.github/copilot-instructions.md`), and the builtin skills — with
  `ackit sync [--dry-run] [--check] [--json] [--force]`, stable per-asset
  statuses (`up-to-date`, `would-create`, `would-update-managed`,
  `updated-managed`, `installed`, `updated`, `conflict-user-modified`,
  `refused-non-managed`, `refused-third-party`), a read-only `doctor`
  managed-assets staleness row, and content-driven (never version-driven) write
  decisions: upgrading the npm package alone never rewrites repository files.
- **Workflow config wiring** (TASK-0067): the parsed `ackit.yml` `workflow:` keys
  (`defaultProfile`, `requireVerifier`, per-profile `requireEvidence`/
  `requireVerifier`) now alter real gate behavior (completion gate, `workflow
  advance`/`verify`, drift evaluation, MCP `ackit_workflow_status`) instead of
  parsing without effect. Repositories without `workflow:` config keep exact
  prior behavior.
- **Disk-proven advance gate** (TASK-0068): `ackit workflow advance` now verifies
  real disk existence of referenced planning artifacts (`planRef`/stage-required
  plan documents) instead of trusting the declaration — a declared-but-absent
  plan blocks advancing past PLAN-style stages.
- **Atomic checkpoint writes** (TASK-0069): `CheckpointStore` writes via
  temp-file + fsync + atomic rename, so a crash mid-write can never leave a
  truncated checkpoint.
- **MCP drift parity** (TASK-0070): the MCP `ackit_drift_check` tool reaches full
  input/warning parity with CLI `ackit drift check` within the read-only
  boundary (no state mutation via MCP, per ADR-0028).
- **Current-facing version-parity guard** (`scripts/check-version-parity.mjs` +
  `tests/contract/version-parity.test.ts`): deterministic classifier that
  distinguishes CURRENT-facing from HISTORICAL version references and verifies
  `package.json` == extension manifest == README/docs current truth; it never
  fails on legitimate history (`docs/v0.2.0/**`, CHANGELOG history, task
  records, behavioral baseline pins, API since-notes, protocol generations).

### Changed

- **Agent instruction truth is version-agnostic**: `AGENTS.md` no longer
  hard-codes a release number (`package.json` is authoritative for the
  checkout, the latest immutable release for published stable); `CLAUDE.md` and
  `.github/copilot-instructions.md` are thin shims to it. `docs/v0.2.0/**` is
  marked historical; current behavior contracts are `docs/reference/`,
  `docs/concepts/`, `docs/guides/`, `docs/architecture/`. Canonical branch
  policy now states the enforced truth: changes land via pull request with
  exact-head CI green (direct pushes are rejected by branch protection).
- **Optimize SARIF driver version is dynamic**: `ackit optimize --format sarif`
  stamps `tool.driver.version` from `package.json` (was hard-coded `0.2.0`).
- **Docs describe `ackit sync` as RELEASED** (`docs/guides/agent-integration.md`,
  `docs/guides/getting-started.md`, `docs/reference/cli.md`); the
  current-master/next-release caveats are retired.
- **Release-proof contract tests**: `tests/contract/readme-current.test.ts` and
  `readme-parity.test.ts` assert the dynamic package version instead of a
  hard-coded line.

### Compatibility

- Backward compatible: legacy repositories (no `workflow:` config, no artifact
  refs) retain supported defaults — prior behavior is preserved and covered by
  the legacy-repository fixture.
- No new network/LLM dependency: the offline-first invariant (no network calls,
  no telemetry, no uploads in product code) is preserved and gated.
- MCP remains read-only: all state mutation stays CLI-only.
- Browser Companion excluded: the paused experiment on
  `feat/browser-companion-v0.3` is untouched by this release.

## [0.3.0] - 2026-09-02

Workflow, verification, evidence and resumability expansion (minor release; merged from `feat/workflow-expansion` via PR #7). All capabilities are backward compatible — legacy repositories without `workflow:` config or artifact refs keep exact pre-`0.2.2` behavior. The Browser Companion experiment remains paused on its separate branch and is **not** part of this release.

### Added

- **Workflow profiles** (`src/core/workflow/`): three built-in profiles (`quick`/`standard`/`high-risk`) with canonical stage orders and per-stage required artifacts; per-task state under `.ackit/workflow/` (`ackit.workflow.v1`); `ackit workflow set|show|advance|verify` CLI; verify/fix-loop attempt recording with deterministic fail-rewind; declarative lifecycle gates (frozen eight-point list; no executable hooks by schema construction).
- **Intent artifacts** (`src/core/intent/`): committed `docs/intent/` documents (`ackit.intent.v1`), normalization, machine-path-independent fingerprints, secret-gated validation; `ackit intent new|list|show|validate|fingerprint` CLI.
- **Task artifact references** (additive frontmatter): `intentRef`, `specRefs`, `decisionRefs`, `planRef` (schemaVersion stays 2 — legacy documents parse identically); `task create --intent/--spec/--decision/--plan`; doctor validates references; plan-first git ordering check (advisory).
- **Checkpoints + resumability + handoff** (`src/core/checkpoint/`): `ackit.checkpoint.v1` per-task checkpoints with deterministic work extraction, staleness detection, resume context + handoff pack renderers; `ackit checkpoint create|show|validate|export` + `ackit task resume`; provider-switch scenario proven by tests.
- **Task-aware context packs**: `ackit pack --task <id>` / `--resume` with documented ranking weights (`taskDeclaredScope`, `taskReference`); checkpoint resume section rides the REQ-CTX-001 mechanism.
- **Evidence Contract v2** (`src/core/evidence/`): `ackit.evidence.v2` registry linking acceptance criteria to typed evidence; criteria sync from the task doc (checkbox state is never copied — implementation ≠ verified); `ackit evidence sync|show|verify|validate` CLI; completeness validation with manual-only insufficiency by default.
- **Independent verification bundle/verdict protocol** (`src/core/verification/`): bounded deterministic verification bundle (`ackit.verification-bundle.v1`) embedding intent, workflow, task, evidence, verdicts, checkpoint, implementation surface, verifier role contract; append-only `ackit.verdict.v1` store (PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED | BLOCKED) with forged-criteria/cross-repo/blocking-on-PASS rejection; `ackit verification bundle|record|show` CLI.
- **Completion-gate enforcement**: workflow-enabled tasks gate completion on evidence completeness, verdict requirements, stage, verification attempts, and blocking drift — `VERIFY failed → completed` is structurally impossible; legacy tasks keep exact pre-expansion behavior; `--force` remains the explicit escape hatch.
- **Deterministic drift detection** (`src/core/drift/`): eight frozen finding codes; `ackit drift check [--ci]` + managed pre-commit gate (`ackit drift check-active`, no-op without workflow tasks).
- **Policy v2 risk tiers + review policy** (`src/core/policy/tiers.ts`): risk-tiered autonomy (`tier0..tier4 × allow|ask|deny`, deny wins across layers) + review policy on policy documents AND `ackit.yml`; `--force` is a tier2 boundary (deny → `POLICY-TIER-DENIED` exit 4; non-tty ask → deny); `ackit policy check` prints autonomy + review.
- **Declarative lifecycle gates**: per-stage required-artifact gates declared in workflow profiles (data-only list; no executable hooks by schema construction).
- **Role contracts** (`src/core/roles/`, `templates/roles/`): `ackit.role.v1` portable data-only contracts — researcher, architect, implementer, verifier, security-reviewer, documentation-reviewer, release-reviewer; `ackit role list|show|validate` CLI; verifier contract embedded in bundles; repository roles cannot shadow built-ins.
- **Skills interoperability** (`src/core/skills/project.ts`): deterministic projections to Claude Code (identity), Copilot instructions (derived `applyTo`), and generic layouts; `ackit skills export --provider --out [--force]` with containment and overwrite refusal.
- **Local execution journal** (`src/core/journal/`): sanitized append-only JSONL (`ackit.execution-journal.v1`) with a CLOSED event-kind list (no conversation/thought/tool-call capture structurally), redaction at construction, deterministic rotation; `ackit journal show|validate`; non-blocking wiring in task/workflow/evidence/verdict/checkpoint/policy paths.
- **CLI/SDK/MCP additions**: focused typed additions to the frozen SDK allowlist (workflow/intent/checkpoint/evidence/verdict/bundle/drift/policy/role functions and stores; contract test updated); six new READ-ONLY MCP tools (`ackit_workflow_status`, `ackit_get_intent`, `ackit_get_checkpoint`, `ackit_verification_bundle`, `ackit_drift_check`, `ackit_list_roles`).
- **Schemas**: `workflow.schema.json`, `intent.schema.json`, `checkpoint.schema.json`, `evidence.schema.json`, `verdict.schema.json`, `verification-bundle.schema.json`, `role.schema.json`, `execution-journal.schema.json`; `ackit.schema.json`/`task.schema.json`/`policy.schema.json` extended additively.

### Compatibility

- Legacy repositories (no `workflow:` config, no artifact refs, no `.ackit/workflow/` state) retain exactly the supported pre-expansion behavior — proven by the legacy-repository integration fixture.
- No LLM API, cloud service, or network dependency is introduced; the offline-first invariant (no network calls, no telemetry, no uploads in product code) is preserved and enforced by the offline-egress gate.
- MCP remains within its documented read-only boundary — all state mutation stays CLI-only by explicit decision (ADR-0028).

### Known limitations (non-blocking follow-ups)

- `workflow:` config keys parse and validate but do not yet alter gate behavior.
- Advance-gate planning-artifact validation remains declaration-based rather than disk-existence based.
- Checkpoint writes are not yet temp+rename atomic.
- MCP drift warning/input parity has the documented residual divergence.
- Browser Companion remains **paused / experimental** on its separate branch and is excluded from this release.

### Security

- Offline-egress invariant extended over the new subsystems (static gate + runtime contract tests); journal redaction at construction; secret-gated intent validation; no new network calls, telemetry, or arbitrary plugin execution.

## [0.2.2] - 2026-08-27

VS Code Marketplace correctness hotfix — extension is now feature-complete and contract-tested.

### Fixed

- **VS Code tree views** (`extensions/vscode/src/extension.ts`, `services/ackitWorkspace.ts`): register real `TreeDataProvider` for `ackit.readiness`, `ackit.findings`, `ackit.graph`, `ackit.tasks`, `ackit.policy`, `ackit.optimize` (previously no providers, manifest claimed 3 views).
- **Readiness tree** (`ackit.readiness`): real `scoreRepository` inputs, overall + 6 categories, deductions/evidence, N/A handling, tooltip, refresh on change, loading/error/empty states.
- **Findings tree + Problems** (`ackit.findings`): real `scanRepository` findings, severity grouping, correct `vscode.DiagnosticSeverity` mapping (critical/high→Error, medium→Warning, low→Information), safe `vscode.Uri.joinPath` + `isInsideRoot`, invalid line/col clamped, repository-level findings skipped, atomic `DiagnosticCollection` refresh, click to open file.
- **Instruction Graph** (`ackit.graph` + `ACKit: Instructions for Current File`): uses `buildInstructionGraph` + `resolveEffectiveStack` with active editor, workspace folder check, ordered effective stack, provenance, provider/scope, conflicts/shadowing.
- **Optimize** (`ACKit: Optimize`): real `analyzeOptimize` via SDK (exposed as `analyzeOptimize` with `AbortSignal`, typed errors, no `process.exit`), QuickPick with severity/priority, token-waste, evidence, remediation, preview diff, dry-run fencing.
- **Diagnostics** (`ACKit: Diagnostics`): real `loadAckitConfig` + `TaskStore` + policy summary as JSON (config health, tasks, policy), no node-count placeholder, no auto-upload.
- **Watch** (`onDidCreate` + `onDidChange` + `onDidDelete`): one debounced 400ms coalesced refresh, ignores `.git`/`node_modules`/`dist`/`.ackit`, `AbortController` cancels in-flight, lazy `setTimeout(refreshAll, 800)` avoids blocking `onStartupFinished`.
- **Multi-root** (`getRoots`, `getRootForActiveEditor`): uses `workspace.getWorkspaceFolder(activeEditor)` else first root, per-root snapshots, `onDidChangeWorkspaceFolders` refresh, tests cover `workspaceFolders?.[0]` anti-pattern.
- **Test harness** (`extensions/vscode/src/test/runTest.ts`, `src/test/suite/*`, `tsconfig.test.json`): replaces broken `out/test/runTest.js`, unit tests for tree/severity/path/multi-root/debounce/error, Electron integration via `@vscode/test-electron` (11 checks: activate, activity container, readiness, findings, Problems, current-file, graph, optimize, diagnostics, refresh create/change/delete, no crash).
- **Offline-egress** (`scripts/check-offline-egress.mjs` now includes `extensions/vscode/src/**`, rejects `fetch` remote, `http` client, telemetry, remote fonts).
- **Icon** (`extensions/vscode/images/icon.png`): replaced 68-byte 1×1 placeholder with 256×256 PNG (26KB, square, transparent background, crisp), contract test `tests/contract/vscode-icon.test.ts` (width==height==256, >1KB).
- **Marketplace README** (`extensions/vscode/README.md`): rewritten to match implemented UI (Readiness, Findings/Problems, Graph, current-file, Optimize, Diagnostics, Tasks/Policy, offline guarantee, version 0.2.2, links, no false claims).
- **CI** (`.github/workflows/ci.yml`): new dedicated `extension` job (Ubuntu, xvfb) — manifest contract, typecheck, lint, build, unit, Electron, `vsce ls`, `vsce package --no-dependencies`, VSIX audit (<2MB), icon dimensions, offline-egress.

### Changed

- **SDK** (`src/index.ts`): expose minimal stable `analyzeOptimize` (`AnalyzeOptions` with `signal?: AbortSignal`, `AbortError` <200ms, typed errors, no `process.exit`) for VS Code; `tests/contract/api-surface` allowlist updated.
- **Extension manifest** (`extensions/vscode/package.json`): `version 0.2.1 → 0.2.2`, `displayName` remains `ACKit Toolkit`, add `ackit.tasks`/`ackit.policy`/`ackit.optimize` views, add `ackit.showReadiness`/`ackit.openFinding`/`ackit.instructionsForCurrentFile` commands, `activationEvents: onStartupFinished` retained with debounced lazy refresh.

### Security

- No new network calls in extension or SDK; offline-first preserved, VS Code host networking is host behavior.

## [0.2.1] - 2026-08-27

Maintenance and launch-sync release — offline guarantee, distribution hardening, and documentation.

### Added

- **Offline-egress invariant** (`scripts/check-offline-egress.mjs`, `tests/security/offline-egress-contract.test.ts`, `tests/security/offline-runtime.test.ts`): static + runtime deny-egress harness, 21 tests, permanent CI gate in `ci.yml` (allowlisted `node:http` for localhost, relative `fetch('/api/...')` only, `POL-NETWORK-REFUSED` for rule packs/profiles, MCP stdio-only, VS Code no telemetry), documented in `docs/security/THREAT_MODEL.md` and `SECURITY_MODEL.md`.
- **Public benchmark evidence** (`benchmarks/public-repos.json`, `benchmarks/run-public.mjs`, `docs/benchmarks/public-evidence.md`, `benchmarks/public-evidence.json`): 20 pinned OSS repos across 6 ecosystems (TypeScript 11, JavaScript 1, Python 3, Go 3, Rust 1, Java 1) with exact SHAs, offline-only `scanRepository` analysis, aggregate methodology (31100 files, 668 findings, median readiness ~68), deterministic, no raw secrets, no `npm install` in third-party repos.
- **Demos** (`examples/demo-*`): 7 reproducible demos (readiness before/after, optimize explain, instruction graph, provider pack, dashboard, GitHub Action, diagnostics) validated against `ackit@0.2.1` built CLI.
- **Static docs deployment** (`Cynrath.github.io/agent-context-kit/`): framework-free HTML/CSS/JS, no CDN/analytics, deterministic `scripts/sync-ackit-docs.mjs` (`--source`, offline, idempotent, only `agent-context-kit/**` + `sitemap.xml`/homepage), 17 subpages + assets, responsive, canonical/OG, sitemap 18 URLs.
- **Repository discovery** (`.github/FUNDING.yml`): `github: Cynrath` (Sponsors active), 20 topics exactly (`agents-md`, `agent-skills`, `ai-agents`, `claude-code`, `cli`, `codex`, `coding-agents`, `context-engineering`, `cursor`, `developer-tools`, `gemini`, `github-actions`, `mcp`, `model-context-protocol`, `offline-first`, `policy-as-code`, `repository-scanner`, `security`, `typescript`, `vscode-extension`), description `Offline-first toolkit for agent-ready repositories: readiness scoring, instruction graphs, context packs, policy/rule packs, MCP, GitHub Actions, diagnostics, and VS Code.`, website `https://cynrath.github.io/agent-context-kit/`, Sponsors/Discussions badges in `README.md`, `SUPPORT.md` with Discussions categories.
- **VS Code Marketplace** (`extensions/vscode` `0.2.1`, publisher `Cynrath`): `Cynrath.ackit-vscode` v0.2.1 published (451KB, SHA 58c7a3c), displayName `ACKit Toolkit`, categories Linters, onStartupFinished, no telemetry.

### Changed

- `README.md` polished badges/links 0.2.0→0.2.1 (npm, release, npx, Action, VS Code, versioning) while preserving table/responsive design; `docs/v0.2.0` historical path unchanged.
- `.github/workflows/release.yml` fresh isolated consumer: mktemp + unique `npm_config_cache`, `npm install --prefix` + `ackit --version`/`--help` checks, 6× bounded retry, no global mutation, secondary `npx` best-effort, version-neutral release notes.
- `extensions/vscode/package.json` 0.2.1 (repository/homepage/bugs/license/icon/keywords, README/CHANGELOG/.vscodeignore).

### Fixed

- `scripts/extract-changelog-section.mjs` and `src/cli/commands/dashboard.ts` template literals (biome).
- `src/core/dashboard/server.ts` unused import, `src/cli/commands/diagnostics.ts` unused variable, `tests/unit/changelog-extract.test.ts` ts-expect-error.

### Security

- No new network calls, no telemetry, no arbitrary plugin exec; offline-first invariant permanently enforced.

## [0.2.0] - 2026-08-27

One consolidated feature release — offline-first, deterministic, task-first.

### Added

- **Agent Readiness** (`ackit scan --json` → `readiness`, `ackit readiness --json/--strict/--fail-below/--baseline/--compare`): deterministic 0–100 scoring across 6 categories (Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10) with weighted renormalization, typed `Deduction` (severity→points, evidence, remediation), `ackit.readiness.v1` schema, terminal tree, CI threshold gating, N/A handling, baseline/compare, golden-fixture stability contract.
- **Instruction Graph v2** (`schemas/instruction-graph.schema.json` v2): `includeScopes`/`excludeScopes`/`providerApplicability`/`provenance`/`shadowedBy`/`duplicateOf`/`orderIndex`, deterministic `depth→precedence→id` ordering, POSIX normalization, realpath symlink handling, circular protection, `maxNodes`/`maxDepth` limits (`INSTR-LIMIT-*`), conflict/duplicate/shadow/dead detection (`INSTR-CONFLICT|DUPLICATE|SHADOWED|UNREACHABLE`).
- **Provider-Aware Profiles** (`templates/profiles/{codex,claude,copilot,gemini,generic}.yml`, `schemas/profile.schema.json`): built-ins, selection `CLI --profile > ackit.yml profile > auto-detect > generic` with `PROFILE-UNKNOWN` diagnostics, `pack --profile` budget/`includePriority` integration, `instructions --provider` profile file-conventions, `diagnostics --json` profile trace.
- **Declarative Rule Packs** (`schemas/rule-pack.schema.json` v1): `packId/namespace/version/severity/rules[]` (presence/pattern/config/dependency/instruction), `glob`/`scope`/`match`, `overrides`/`composition`, local `policy.rulePacks` + `node_modules` package-dist only (no fetch), `POL-PACK-COLLISION`/`POL-NETWORK-REFUSED`, ReDoS/size limits, pure `evaluatePack` integrated into `executeConfiguredScan`.
- **Optimize v2** (`ackit optimize --explain/--category/--min-severity/--format/--diff`): 8-class taxonomy, `evidence[]`/`confidence`/`tokenWasteEstimate` (via `estimateTokens`) /`provenance`/`plan {target,action,diff}`, `--fix --dry-run` preview (managed surfaces only), `terminal|json|markdown|sarif` outputs.
- **Official GitHub Action** (`action.yml`, `dist/action/index.js`, `.github/workflows/ackit-action-dogfood.yml`): Node24, inputs `command/args/fail-threshold/upload-sarif`, outputs `findings-json/sarif-path`, safe `execFile` arg split, SARIF 2.1.0, job summary, `contents: read` least-privilege, SHA-pinned actions.
- **Watch Engine** (`src/core/watch/watch.ts`): debounced/coalesced 400ms, ignored `.git/node_modules/dist/.ackit/coverage/artifacts`, incremental cache, graceful `SIGINT` → `WatchHandle.done` exit 0, cross-platform.
- **Diagnostics** (`ackit diagnostics --json`, `ackit diagnostics bundle --out/--redact-check`): environment/config/instructions/cache/policy/tasks, `ackit.diagnostics.v1` schema, deterministic manifest `bundle-manifest.json` with `sha256` + redaction count, 5-secret `[REDACTED]` proof, no absolute paths.
- **Benchmark System** (`benchmarks/{generate-fixtures.mjs,run.mjs,thresholds.json,baselines}`): 7 deterministic fixture classes (small/medium/large/monorepo/instruction-heavy/skill-heavy/binary-heavy), 8 metrics (`coldScanMs`/`warmScanMs`/`incrementalMs`/`peakRssMb`/`filesPerSec`/`packMs`/`graphMs`/`cacheHitRatio`), median-of-3, `1.5x` thresholds, PR advisory vs scheduled.
- **Local Dashboard** (`ackit dashboard` / `ackit report serve --port 0`): localhost-only `127.0.0.1` default, `--allow-nonlocal` required for non-loopback, CSP `default-src 'self'` + `X-Content-Type-Options: nosniff`, XSS-escaped, `/api/scan|graph|readiness|tasks.json` paginated, polling live updates, `<50KB` vanilla JS.
- **Public SDK v1** (`src/index.ts` allowlist): `AckitError` (`code`+`remediation`), `AbortSignal` on `scanRepository`/`buildContextPack`/`buildInstructionGraph` (<200ms `AbortError`), `sideEffects:false`, `type:module`, `exports {".","./mcp"}` only, `docs/reference/sdk.md` + `examples/sdk-consumer.mjs`.
- **VS Code Extension** (`extensions/vscode` `0.2.0`, publisher `cynrath`, `lints` Linters, `onStartupFinished`): readiness tree, Problems (`DiagnosticCollection` `ACKITxxx`), graph “instructions for current file” via `resolveEffectiveStack`, tasks/policy/optimize views, palette `Refresh/Show Graph/Optimize/Diagnostics`, file watcher debounced, no telemetry, `<2MB` VSIX.
- **Security Hardening** (ADR-0024): path traversal/realpath containment, ReDoS guard, YAML depth 20/size 512KB, dashboard CSP/binding, diagnostics redaction, action input injection via `execFile`, SDK no `process.exit`, tarball/VSIX audits, SHA pinning.
- **Docs/Examples**: `docs/reference/{readiness,profile,rule-pack,instruction-graph,diagnostics,sdk}` + `docs/guides/{ci,watch-dashboard,vscode}` + `examples/sdk-consumer.mjs` + `fixtures/profile-*`.

### Changed

- `ackit.schema.json` additive `readiness.weights`/`profile`/`policy.rulePacks`/`diagnostics` (v1 still valid, defaults applied).
- `instruction-graph` schema bumped to v2 (additive, v1 JSON validates via defaults).
- CLI help now documents `readiness`, `optimize` v2 flags, `profile` diagnostics, `diagnostics bundle` without leaking `REQ-*`/`ADR-*`.

### Fixed

- `src/core/profiles/built-ins.ts` repo-root resolution for packaged `dist` (3 vs 4 level probe).
- `src/core/instructions/graph.ts` copilot repo-wide scope handling (ancestor filter removed).
- `ackit-policy.yml` suppressions for synthetic secrets in `diagnostics`/`dashboard` redaction logic (self-scan gate).

### Security

- No new network calls, no telemetry, no arbitrary plugin exec; all new surfaces audited per `docs/security/THREAT_MODEL.md` delta.

## [0.1.1] - 2026-08-25

Public CLI/MCP surface cleanup and controlled-release automation hardening. No behavior, command, flag, or exit-code changes.

### Changed

- Public CLI help is product-facing text only: internal requirement identifiers (`REQ-*`) were removed from `ackit --help` and every registered command/subcommand description (`init`, `pack`, `policy`, `workspaces`, `optimize`, `hooks`, `task`). Internal traceability IDs remain intact in requirements, ADRs, tests, and task/evidence documents.
- The MCP `onboarding` prompt no longer points coding agents at internal rebuild documentation; it references repository-root agent instructions and README instead.
- User-facing docs (`docs/guides/monorepo.md`, `docs/concepts/context-budget.md`, `docs/reference/schemas.md`) no longer cite internal requirement IDs in prose.

### Added

- Public-surface regression contract tests: a generated help matrix over every registered top-level and nested command plus MCP tool/resource/prompt metadata assertions that fail if `REQ-`, `ADR-`, `VNEXT`, `GOAL2`, or `rebuild/ackit-vnext` reappear in user-visible output. Legitimate user-facing task-id syntax (e.g., `--depends-on <ids...>` documented as `TASK-####`) stays explicitly allowed.
- Controlled automatic release pipeline `.github/workflows/release.yml`: triggers ONLY on `v*.*.*` tags; validates exact tag shape, tagged-commit identity, package name, and package.json parity; confirms the exact version is absent from npm; runs install/lint/format/typecheck/build/schema-drift/tests/real-tarball consumer smoke before publishing; publishes via GitHub Actions OIDC Trusted Publishing with provenance (no long-lived npm token); verifies registry shasum/dist-tag plus an npx consumer smoke; creates the GitHub Release strictly after a successful publish under a per-tag concurrency group. Master pushes never publish.

## [0.1.0] - 2026-08-25

First release of the AgentContextKit vNext line: AgentContextKit rebuilt as a TypeScript + Node.js + npm/npx product (CLI command `ackit`, package `@cynrath/agent-context-kit`), distributed through npm and requiring Node >= 22.

- Instruction graph across codex/claude/gemini/copilot instruction surfaces: nesting, overrides, `applyTo` globs, precedence resolution, conflict/duplicate/staleness/advisory analysis.
- Agent Skills (open standard): parse/validate/install/sync with an ownership lock; four built-in skills shipped; scripts detected, never executed.
- Security/hygiene scanning with redacted evidence: secret shapes, credential assignments, private keys, connection strings, entropy advisories, absolute-path leaks, CI pinning hygiene, dependency drift; terminal/JSON/SARIF 2.1.0/Markdown/self-contained HTML reports; baselines plus changed/staged/since/range incremental modes with content-addressed caching.
- Token-budgeted context packs: deterministic weighted ranking, manifest with hash/reason/tokens for every include and exclusion.
- Docs-first task workflow under `docs/tasks` with tool-allocated IDs, single-active rule, completion gate, and doctor validation.
- Policy-as-code: `extends` chains (local files or pre-installed npm packages only), locked rules, scoped suppressions with expiry, digests — strictly offline.
- Monorepo awareness for pnpm/npm/yarn/generic workspaces with path-scoped semantics.
- MCP server over stdio on the official Model Context Protocol SDK: read-only tools, resources, and prompts.
- Programmatic API from the same package (`scanRepository`, `buildInstructionGraph`, `buildContextPack`, config loading) behind a small deliberate surface.
- TypeScript strict ESM skeleton with pnpm, Vitest, Biome, tsc build to `dist/` (TASK-0267).
- `ackit` CLI core: global options (--root/--config/--json/--quiet/--no-color/--verbose/--debug/--strict), stable exit codes 0-5 per ADR-0007, deterministic bare-command summary scaffold, JSON mode with pure stdout.
- Version/identity single source of truth in package.json (REQ-ARCH-009).
- Terminal sanitation for diagnostics (ANSI/control-character stripping, REQ-SEC-003).
- C# v1 runtime removed from the product path (REQ-ARCH-001); published v1 NuGet packages/tags/releases remain immutable historical artifacts.
- Distribution: scoped npm package `@cynrath/agent-context-kit` (global install or one-shot `npx`); publish/tag/GitHub-Release steps follow the repository's controlled-release governance with explicit per-step user authorization.

## Legacy — v1 (.NET) line

The sections below are the frozen changelog of the superseded .NET implementation (NuGet `AgentContextKit`, final release `1.0.0-rc.1`). They are preserved verbatim as historical evidence; vNext does not continue this version line (ADR-0013).
# Changelog

All notable changes to AgentContextKit will be documented in this file.

This project follows Semantic Versioning where practical before `1.0.0`.

## [Unreleased]

- Post-RC1 current-source work adds ACKit Optimize: deterministic offline instruction discovery, nested scope/precedence, stable `ACKITOPT001`-`ACKITOPT015` findings, context estimates, console/JSON/Markdown/SARIF/offline HTML reports, and an explicit-path non-overwriting review proposal with source mapping and unresolved human decisions. The synthetic `samples/ackit-optimize-demo` fixture and regression tests make the behavior reproducible. The exact public feature-and-documentation range is `6998e269af4962bbe70a9cb4044727d25dc1a06d..00c9fea3893776f0bc9026f688a15d7a92d2ffb3`; this postdates and does not alter the immutable `1.0.0-rc.1` package/tag/release/assets/attestations.
- TASK-0255 completed the exact `v1.0.0-rc.1` GitHub prerelease and validated nupkg/snupkg assets from retained source artifact `8242162439`. TASK-0256 run `29350091782` verified the immutable release tuple, created and verified attestations `35295200` and `35295205`, and passed installed-package smoke on Windows, Ubuntu, and macOS. TASK-0257 pins published smoke and public guidance to RC1, closes V100-09, and preserves every earlier failed recovery record as historical evidence.
- TASK-0243 added a NuGet-publish-free exact-existing-package recovery operation with exact artifact/package verification, two release-asset attestations, negative workflow gates, and a three-platform install matrix. TASK-0244 run `29151228607` stopped in a pre-mutation Ubuntu safety gate because a fixture helper invoked Windows-only `powershell`; no tag, GitHub prerelease, asset, or attestation was created, no second dispatch occurred, and the published smoke pin remains `0.2.0-alpha.4`.
- TASK-0249 fixed accepted-404 native exit handling and passed three-platform CI. TASK-0250 run `29341087462` passed all pre-mutation recovery gates, then GitHub rejected the App token's tag push for missing `workflows` permission. One audit confirmed NuGet/artifact unchanged and tag/release/assets/two attestations absent; TASK-0251 was not executed.
- TASK-0252 adapted recovery to verify the owner-created exact tag without any tag mutation and passed standard CI. TASK-0253 run `29345313517` passed all immutable gates, then GitHub returned HTTP 403 at prerelease creation. One log read and one audit confirmed package/artifact/tag unchanged and prerelease/assets/two attestations absent; TASK-0254 was not executed.

## [1.0.0-rc.1] - 2026-07-14

### Candidate scope
- Freezes the reviewed CLI command/option surface, exit semantics, config schema `1`, baseline schema `1`, JSON schema `2`, SARIF `2.1.0` profile, stable rule/diagnostic identifiers, and generated-file conventions for exact-candidate validation.
- Preserves read-only config diagnostics, no automatic config migration, deterministic baseline fingerprints, language-independent machine output, and offline-first behavior.
- Records `Cynrath` as primary security owner and `ShadowFlameC` as backup notification/recovery owner without changing repository or package ownership.
- Expands final-candidate performance/resource evidence to a 2,000-file mixed corpus with time and peak-working-set thresholds plus interruption and unreadable-file regression coverage.
- Preserves English/Turkish help, error, exit, and JSON semantic parity while allowing localized human prose to improve.
- Validates the upgrade path from published immutable predecessor `0.2.0-alpha.4` to a run-unique `1.0.0-rc.1` source candidate without rewriting predecessor config.

### Known limitations
- NuGet `1.0.0-rc.1` is available and repository-signed; exact tag `v1.0.0-rc.1`, GitHub prerelease, validated nupkg/snupkg assets, both attestations, and Windows/Ubuntu/macOS installed-package smoke are complete. Earlier recovery failures remain recorded separately.
- Author signing and SBOM publication remain documented bounded accepted risks; neither is claimed as implemented.
- Author signing and SBOM publication remain bounded accepted risks; the exact GitHub release assets have GitHub artifact attestations, but this does not imply author signing or an SBOM.
- External adoption evidence remains limited, and hosted documentation/GitHub Pages remains deferred.

### Added
- Added a dedicated pure-Markdown `README.nuget.md` package README and package metadata wiring so nuget.org does not render GitHub README HTML as raw text.
- Added agent-facing documentation for the split between GitHub `README.md` and NuGet `README.nuget.md` ownership.
- Added two new stable scanner rule IDs: `ACKIT006` `ProductionConfigLike` (High) for production configuration, environment-specific appsettings, and live-service connection strings, and `ACKIT007` `DocumentationGap` (Medium) for documentation gaps surfaced by the scanner. Existing `ACKIT001` and `ACKIT005` descriptions were narrowed to reflect the new dedicated rules.
- Added an `Ackit006Ackit007EndToEndTests` coverage class that exercises the Core `RepositoryScanner` on a synthetic `appsettings.Production.json` fixture, asserts the new `ACKIT006` ruleId flows into JSON and the redact-check filter, asserts the catalog mapping for `ACKIT007`, and asserts the SARIF rule catalog advertises the new ID.

### Vibe-Feature Local Product Continuation Batch
PROJECT-CONTROL-0108 planning commit `08442c0` opens the new control after PROJECT-CONTROL-0107 closed TASK-0159 through TASK-0167 with 257/257 local tests green. The new batch targets additive `generate` targets for Anthropic CLI and Continue (Tier 1), a safe local `ackit hooks` command (Tier 1), read-only `ackit diff` for baselines (Tier 2), deterministic `ackit trim --max-chars` (Tier 2), a design-driven `ackit watch` mode (Tier 2), a conservative high-entropy scanner rule research (Tier 2), and design-only `ackit mcp --stdio` (Tier 2+). No release, tag, NuGet publication, secret, or model-name disclosure is part of this batch.

### Local-Only Extension Batch
PROJECT-CONTROL-0106 and the independent local product/code-quality track delivered a small, additive batch: agent rule sync (`AGENTS.md`, `CLAUDE.md`, copilot, cursor, `DEVELOPMENT_STANDARD`); queue and handoff consistency; scanner rule doc and SARIF/JSON/SECURITY_MODEL contract alignment with two new consistency guard tests; agent instruction surface guard test; seven candidate task records (`TASK-0146` through `TASK-0152`) and a forward-looking roadmap note; catalog text guard; config-check diagnostics cookbook; baseline diff cookbook; SARIF rule metadata completeness guard; offline-only and accessibility guard for the HTML report; prompt pack and context export redaction guard; sample gallery coverage tests. All of these changes are local-only; the published `0.2.0-alpha.2` package, JSON schema, SARIF profile, and default CLI surface remain unchanged.

### Starter Config and Locale Guard Batch
PROJECT-CONTROL-0107 planning commit `c249a13` opens with the post-0158 state sync and a new local-only batch: starter `brandKeywords` and `piiKeywords` config (`TASK-0156`); starter `safeDomains` and `ignoredPaths` config (`TASK-0157`); Turkish CLI locale fallback guard (`TASK-0158`); commit-completeness hard rule plus a new `scripts/check-tracked-vs-untracked-md.ps1` guard. Total tests are 238/238. No release, tag, or NuGet state change.

### Security
- Added least-privilege GitHub artifact provenance for exact future release nupkg assets, with idempotent digest detection and CLI verification.
- Recorded bounded author-signing and SBOM deferrals without claiming controls that are not published.

### Planning
- Selected `0.2.0-alpha.3` as the smallest compatible next prerelease scope without changing package metadata or approving publication.
- Recorded an evidence-backed alpha.3 NO-GO until independent backup security ownership and recovery authority/backup evidence are complete.

## [0.2.0-alpha.3] - 2026-06-20

### Added
- Added the published package for MCP stdio transport, `ackit.rules`, `ackit watch`, `ackit diff`, `ackit trim`, scan include/exclude filters, release-hardening scripts, and release blocker evidence cleanup accumulated after `0.2.0-alpha.2`.

### Release
- Published `AgentContextKit` `0.2.0-alpha.3` to NuGet through the OIDC release workflow sequence.
- Created exact tag `v0.2.0-alpha.3` and GitHub prerelease targeting `92984c6448332aa24b7cff94647f627bf944e535`.
- Verified global tool install from NuGet; `ackit version` reports `AgentContextKit 0.2.0-alpha.3`.
- Recorded refreshed hosted RC evidence run `27870246504` and immutable release verification run `27870813763`.
- Known follow-up: harden the release workflow provenance probe before the next publish so missing attestation state does not fail before attestation can run.

## [0.2.0-alpha.2] - 2026-06-13

### Added
- Added a dependency-free local Markdown-link gate with positive/negative smoke coverage and release-gate integration.
- Added manual exact-commit GitHub release automation with NuGet OIDC Trusted Publishing, scoped permissions, idempotent recovery, package inspection, and installed-tool smoke verification.
- Added table-driven scanner regression fixtures for secret, artifact, local-path, PII/brand noise, stable rule IDs, and Critical suppression boundaries.
- Added current-source sanitized suppression audit metadata for `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` in human/JSON scan output.
- Added safe screenshot and docs-site planning plus first-five-minutes and existing-repository adoption tutorials.
- Added a versioned, sanitized baseline identity model with deterministic SHA-256 finding fingerprints and focused cross-platform normalization tests.
- Added report-only Core configuration validation with stable diagnostic codes for unknown, obsolete, duplicate, malformed, and unsafe settings.
- Added explicit sanitized baseline creation/update, integrity-checked loading, finding classification, and opt-in new-finding CI policy.
- Added additive baseline metadata to SARIF, HTML reports, Web UI, and their JSON command summaries.
- Added published-config and baseline-schema upgrade compatibility fixtures with focused tests.
- Added a disposable synthetic scan benchmark and release-candidate evidence gate.
- Added security response, support lifecycle, upgrade compatibility, performance, and supply-chain policy documents.
- Added read-only `ackit config-check` with sanitized human/JSON diagnostics, explicit warning/error exits, and manual obsolete-key migration guidance.
- Added a manual-only Windows/Ubuntu/macOS release-candidate evidence workflow design with isolated predecessor/source tools, config immutability, baseline/SARIF checks, and the synthetic performance tripwire.
- Added a normalized related-tools matrix, official-source evidence policy, privacy-first external workflow examples, no-dependency interoperability/command/import designs, external-tool threat model, and disposable lab plan.
- Added the authoritative no-network default policy, agent context pipeline taxonomy, docs toolchain decision, release blocker board, maintainer decision register, and planning-only alpha.2 refresh.

### Changed
- Scanner email, phone, and IP rules now evaluate all distinct candidates in each file; raw finding matches are omitted from human, JSON, and Web UI output while JSON keeps its compatible nullable field.
- Baseline-aware CI now treats severity escalation as a new finding without changing baseline schema or fingerprints.
- Config diagnostics reject unmatched quotes with sanitized `ACKITCFG006` output.
- Suppression audit records are deduplicated before human/JSON reporting.
- Polished README installed-tool and source command examples.
- Froze a compatibility-preserving `v0.2.0-alpha.2` hardening scope without changing version metadata.
- Reclassified historical v1.0 asset checks and added an explicit P0/P1/P2 1.0 readiness gap register.
- Migrated the test project from Legacy `xunit` `2.9.3` to xUnit v3 while preserving all 169 tests and clean dependency reviews.
- Added a conditional release-candidate contract freeze and explicit maintainer GO/NO-GO decision package without changing version or publishing.
- Added machine-readable command JSON, baseline, and SARIF profile schemas with sanitized golden fixtures and live-output contract tests.
- Added English/Turkish human-output, known-error, exit-code, and JSON semantic parity release gates across all language-aware commands.
- Added a metadata-only security/supply-chain evidence register, maintainer handoff, and local structure gate for private reporting, signing, SBOM, provenance, and package recovery decisions.
- Added a consolidated final RC local-readiness decision and read-only orchestration gate with an explicit remote NO-GO boundary.
- Added exact hosted CI/source/published smoke evidence for commit `37d5220` while preserving the unrun manual RC workflow blocker.
- Added read-only GitHub evidence that private vulnerability reporting is disabled, with explicit P0 enablement and notification-owner completion criteria.
- Added a read-only published package/release supply-chain audit covering NuGet repository signing, author-signature absence, owner-profile alignment, SBOM, provenance, and recovery evidence.
- Added an initial offline OSS ecosystem catalog, product positioning, external-tool workflow guidance, interoperability backlog, and split local-versus-maintainer execution queue without adding dependencies.

### Fixed
- Prevented `id-token: write`, escaped text ending in drive-like syntax, and plain numeric hosted run IDs from producing token/path/phone false positives.
- Made the local Markdown link gate compatible with Windows PowerShell 5.1, including repository-escape diagnostics.
- Run Markdown link release gates in isolated hosted `pwsh` child processes and preserve child output on fixture failures.
- Normalize Markdown targets as repository-relative path segments so Windows 8.3 temp paths cannot create false repository-escape failures.
- Use cross-platform `pwsh` for release-job preparation and published-package verification on Ubuntu.
- Make published-package verification choose a portable temporary directory and opt release actions into the Node.js 24 runtime.
- Made case-insensitive scanner regexes culture-invariant so ASCII token, email, domain, and local-path detection stays consistent under Turkish and other process cultures.
- Allowlisted Shields.io badge hosts and common `System.IO` namespace-shaped technical tokens to prevent culture-invariant self-scan noise.

### Release
- Published `AgentContextKit` `0.2.0-alpha.2` to NuGet through GitHub OIDC Trusted Publishing.
- Created exact tag `v0.2.0-alpha.2` at `f540479a92cbe66097f6796553828ee49ddd5512` and published the GitHub pre-release with validated package assets.

## [0.2.0-alpha.1] - 2026-06-11
### Added
- Added `ackit sarif` source command for SARIF 2.1.0 output.
- Added scanner rule catalog with stable `ACKIT` rule IDs.
- Added additive JSON `ruleId` field.
- Added config allowlist foundation: `safeDomains`, `ignoredPaths`, `ignoredFindingIds`.
- Added expanded scanner patterns.
- Added sample gallery and demo scenarios.
- Added Web UI preview and visual asset guidance.
- Added `ackit sarif --output <repo-relative.sarif>` documentation and GitHub Code Scanning readiness notes for the published `0.2.0-alpha.1` package.
- Added documentation-only GitHub Actions examples for scan CI, SARIF upload, published-tool smoke, and source-package smoke.
- Added GitHub Actions usage guidance for CI command order, privacy, failure interpretation, and SARIF upload decisions.
- Added sample repository gallery and demo scenario docs for onboarding.
- Added safe sample repositories for .NET console, generic empty repository health gaps, and security fixture wording.
- Added a local sample smoke helper script.
- Added a central scanner rule catalog with stable `ACKIT` rule IDs, default severity context, and SARIF help metadata.
- Added configurable `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` scanner allowlist fields for narrow non-Critical noise suppression.
- Added scanner coverage for additional package artifacts, provider-token-like values, bearer token-like values, and Unix home path leakage.

### Changed
- Published NuGet `0.2.0-alpha.1` now includes `ackit sarif`.
- JSON finding objects now include additive `ruleId` metadata.
- SARIF rule metadata now uses the centralized scanner rule catalog.
- Scanner documentation and security model are updated for v0.2.0-alpha.

### Security
- Critical findings cannot be silently suppressed by config allowlist.
- SARIF output avoids raw secret matches and absolute local paths.

## [0.1.0-alpha.2] - 2026-06-05
### Added
- Added a cross-platform source smoke workflow that packs the current branch and installs `AgentContextKit` `0.1.0-alpha.2` from a temporary local package source on Windows, Ubuntu, and macOS.
- Added alpha.2 hardening tasks for scanner noise reduction, GitHub Actions Node 24 readiness, Turkish CLI output polish, and release preparation.
- Published `v0.1.0-alpha.2` on GitHub and NuGet and verified global tool installation.

### Changed
- Reduced scanner noise with a conservative safe technical domain allowlist and fixture-only placeholder email handling.
- Added safe technical allowlist coverage for common platform/package domains while preserving Critical secret detection.
- Reduced fixture placeholder noise without suppressing real source/docs email or secret findings.
- Prepared GitHub Actions workflows for Node 24-ready official action majors and explicit Windows runner labeling.
- Polished Turkish human CLI output while preserving JSON schema fields.
- Bumped source/package metadata and CLI runtime version to `0.1.0-alpha.2`.
- Updated the published-package smoke workflow to install `AgentContextKit` `0.1.0-alpha.2`.
- Recorded successful cross-platform GitHub Actions smoke validation for the published NuGet global tool.
- Synced post-push GitHub release status docs after `master` and `v0.1.0-alpha.1` were pushed.
- Verified NuGet publication and global tool install for `AgentContextKit` version `0.1.0-alpha.1`.
- Verified NuGet global tool smoke test in a clean demo app.

## [0.1.0-alpha.1] - 2026-06-04
### Added
- Initial offline-first .NET CLI tool package with command name `ackit`.
- CLI commands: `init`, `scan`, `scan --ci`, `report`, `webui`, `prompt-pack`, `context-export`, `generate`, `task`, `redact-check`, `doctor`, `version`, and `help`.
- Repository scanner for docs, tests, CI, Docker, generated agent files, package metadata, and stack signals.
- Sample-aware main stack detection for `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions` without treating `samples/` stacks as the main product stack.
- Pattern-based secret, PII, brand, risky path, and risky extension scanning.
- JSON output with schema/tool metadata, generated timestamps, repository metadata, summaries, and CI mode fields.
- Task-first development document generation under `docs/tasks`.
- Agent instruction generation for Codex, Claude, Cursor, and GitHub Copilot.
- Offline static HTML report generation with safe repository-relative output handling.
- Offline static Web UI prototype generation for local scan review.
- Local-only dry-run prompt pack generation and explicit-approval context export manifests.
- English and Turkish output/template foundation.
- Config schema documentation and generated-file conventions.
- Focused xUnit test coverage and GitHub Actions CI.
- Local release verification, package metadata, public release audit, release blocker, public gate, and v1.0 readiness scripts.
- v1.0 final local readiness review documentation and gate script.
- Source archive hygiene docs and WinRAR exclude guidance for local ZIP/RAR sharing.
- OSS readiness, governance, privacy, support, security, package, release, and maintainer handoff documentation.

### Changed
- Public package and docs metadata use the `Cynrath` persona.
- Package URLs point to `https://github.com/Cynrath/agent-context-kit`.
- Public release blockers track the completed GitHub Release and NuGet publication state, with Codex for OSS submission as the remaining follow-up.

### Fixed
- Added NuGet package README metadata for local pack readiness.
- Refined self-scan stack accuracy so sample ASP.NET Core, Minimal API, TypeScript, and Tailwind CSS signals are not reported as the main repository stack.