---
id: "TASK-0023"
title: "Full integration & consumer test matrix"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0022
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Consolidated verification gate for AgentContextKit v0.2.0 — prove that every feature built in TASK-0007..0022 integrates without regression and is consumable through its real public surfaces (npm tarball, SDK, MCP, GitHub Action, dashboard/report server, diagnostics bundle, rule packs, provider profiles, benchmark harness, VS Code extension). This is the **MATRIX gate** (second-last before release readiness); it does not implement new features, it proves the full matrix green at one SHA before TASK-0024 performs the read-only release-readiness audit.

## Context / current state

- Previous tasks built individual features in isolation, each with its own unit/contract tests, but **no consolidated matrix proof** exists that the whole product works end-to-end at one commit:
  - **Package smoke** — `pnpm pack` + isolated install works for CLI but SDK/MCP legs not yet re-proven together.
  - **SDK** — `src/index.ts` frozen surface (`scanRepository`, `buildContextPack`, `buildInstructionGraph` + profile/rule-pack extensions) contract-tested but not re-verified after graph/profile/pack changes via a single tarball consumer script.
  - **MCP** — official SDK `InMemoryTransport` smoke (handshake, `tools/list` = 9 read-only tools, `tools/call scan`) passes per-task but not re-run as part of a single matrix log.
  - **GitHub Action** — `action.yml` `actionlint` + `uses: ./` smoke + SARIF/annotations validated per-task; not yet re-collected in one run with pinning asserted.
  - **Dashboard / report server** — localhost-only bind, `--port 0`, SSE/poll live update, XSS/header guarantees validated per-task; no single proof of loopback bind + 1 rescan cycle after all engines landed.
  - **Diagnostics** — `ackit diagnostics --json` schema + `diagnostics bundle --out` sanitized bundle validated per-task; 5-secret redaction proof not yet re-collected in matrix.
  - **Rule packs** — `schemas/rule-pack.schema.json` + provider fixtures validated per-task; 2-findings pack (presence + pattern) not yet re-proven as integrated scan finding.
  - **Provider profiles** — 5 built-ins (codex/claude/copilot/gemini/generic) + `pack --profile` delta + `instructions --provider` respect validated per-task; not yet re-proven as a 5-way matrix.
  - **Benchmark** — `benchmarks/run.mjs` fixture determinism + `thresholds.json` advisory run validated per-task; full report generation not yet collected in matrix.
  - **VS Code extension** — `@vscode/test-electron` activation + `vsce package` + `.vsix` whitelist/size audit validated per-task; not yet re-proven after SDK/dashboard changes.
  - **Audits** — tarball/VSIX whitelist, `actionlint`, SHA pinning, benchmark advisory, cross-platform path normalization (POSIX repo-relative, Windows drive/Unicode/mixed EOL) lack a single consolidated log artifact.

- Repo state entering this task: `master` at candidate SHA (pins: `pnpm@11.22.0`, `Node >=22` matrix 22+24, `@modelcontextprotocol/sdk@^1.30.0`, `Biome ^2.5.10`, `Vitest ^4.1.11`, SHA-pinned `actions/checkout`, `setup-node`, `pnpm/action-setup`), `docs/v0.2.0/EXECUTION_PLAN.md` dependency graph acyclic, `docs/v0.2.0/TRACEABILITY.md` unmapped=0, `ackit.yml` schemaVersion 2 additive keys (`readiness.weights`, `profile`, `policy.rulePacks`, `diagnostics`) backward-compatible.
- Upstream dependency: **TASK-0022** (Documentation / examples / migration) must be `completed` — guides, `examples/*` fixtures, `CHANGELOG.md` `[0.2.0]` section, and `docs/architecture/overview.md` subsystem notes are the inputs this matrix exercises.
- Downstream: **TASK-0024** (v0.2.0 release readiness & evidence) is blocked until this matrix log is green — that task performs only read-only audits (registry/tag absent proofs, exact-SHA CI 10/10, OIDC verification) on the same SHA proven here.

Relevant files/modules:
- `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `schemas/*.schema.json`, `ackit.yml`
- `src/index.ts`, `src/api/*`, `src/core/{readiness,context,watch,dashboard,diagnostics,instructions,profiles,policy/packs,scanner,filesystem,cache,tasks}`, `src/cli/**`, `src/mcp/**`, `extensions/vscode/**`
- `action.yml`, `action/src/**`, `.github/workflows/{ci,release,ackit-action-dogfood}.yml`
- `benchmarks/{run.mjs,thresholds.json,baselines/**,fixtures/**}`
- `tests/{unit,integration,contract,security,e2e}`, `scripts/{package-smoke.mjs,check-security-boundaries.mjs}`
- `docs/v0.2.0/{REQUIREMENTS,TRACEABILITY,EXECUTION_PLAN,DEFINITION_OF_DONE}`, `docs/security/THREAT_MODEL.md`

## Goal

One concrete outcome: a **single, committed matrix log** `artifacts/v020-matrix.log` (plus supporting JSONs) proving that at the candidate SHA the full quality gate + every isolated consumer surface is green, deterministic, and auditable — so TASK-0024 can safely perform the final tag/publish authorization check without re-discovering integration failures.

## In scope

- **Full local quality gate** at the candidate SHA (no code changes unless a gate fails and the fix is minimal + re-proven):
  `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm format:check` → `pnpm typecheck` → `pnpm gen:schemas && git diff --exit-code -- schemas` → `pnpm build` → `pnpm test` (full suites: unit/integration/contract/security/cli-smoke/perf where applicable) → `pnpm smoke:cli` → `pnpm run smoke:package` → `node dist/cli/index.js task doctor` → `node dist/cli/index.js config check` → `node dist/cli/index.js doctor` → `node dist/cli/index.js skills validate` → `node dist/cli/index.js instructions` (and `--json` variant) → `node dist/cli/index.js scan --ci` → `git diff --check` → `git status --short` clean check.

- **Isolated consumer matrix** — each surface exercised from a **real artifact** (tarball/VSIX/bundle), not source fallback, in a fresh `tmpdir` with recorded `tmpdir` path + exit code:
  1. **npm tarball CLI battery**: `pnpm pack` → `npm install $tarball` in temp dir → `--version` matches `package.json` version, `--help` contains no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2` leak, `scan`/`doctor`/`task doctor`/`config check`/`instructions`/`pack`/`diagnostics` round-trips succeed.
  2. **SDK ESM consumer**: fresh temp project `import { scanRepository } from "@cynrath/agent-context-kit"` (+ `buildContextPack`, `buildInstructionGraph`, `scoreRepository` if landed) → scan fixture repo ⇒ `findings.length > 0`, no `process.exit` trap (`process.exitCode` unchanged), `AbortSignal` abort rejects with `AbortError` within 200ms.
  3. **MCP consumer**: `InMemoryTransport` (or stdio `mcp serve` spawn) handshake → `initialize` → `tools/list` (= 9 read-only tools, no write tools without explicit capability) → `tools/call scan` → valid report JSON + `resources/read` + `prompts` smoke; malformed input + cancellation handled without crash.
  4. **GitHub Action consumer**: `actionlint` on `action.yml` passes; `uses: ./` smoke with `command: scan` + `fail-threshold: low` (local composite/Node execution or minimal hosted job) produces annotations + job summary + SARIF 2.1.0 artifact valid; `action.yml` inputs/outputs/branding schema valid.
  5. **Dashboard / report server smoke**: `ackit report serve` (and `ackit dashboard` alias if present) binds **loopback only** (`127.0.0.1` default) on `--port 0` (random free port, recorded), serves HTML containing findings count = scan count, exposes stable local API (`/api/scan.json`, `/api/graph.json`, `/api/readiness.json`, `/api/tasks.json`) with pure JSON; non-loopback bind without `--allow-nonlocal` → exit 2 diagnostic; handles **1 rescan cycle** (trigger file change → debounce coalescing → UI/API reflects updated count) without restart; security headers (`Content-Security-Policy: default-src 'self'`, `X-Content-Type-Options: nosniff`) present.
  6. **Diagnostics / redaction smoke**: fixture secret repo containing **5 known secrets** (AWS key `AKIA…`, `ghp_` PAT, `BEGIN PRIVATE KEY` block, connection string `postgres://…`, generic high-entropy token) → `ackit diagnostics --json` valid vs `schemas/diagnostics.schema.json` + `ackit diagnostics bundle --out ./ackit-diag.zip` → deterministic `bundle-manifest.json` (files + sha256 + `redactionCount` sorted keys) with **5/5 secrets replaced by `[REDACTED]`**, no absolute machine paths (`<local-path>` or repo-relative only), no env var leak; `bundle --redact-check` re-verifies.
  7. **Rule-pack smoke**: fixture repo with **2 packs** (one `presence` rule e.g. `README.md must exist` + one `pattern`/`forbiddenPattern` rule) loaded via `ackit.yml` `policy.rulePacks` (repo-relative, `extends` deterministic merge, no URL fetch) → `ackit scan --json` shows exactly **2 pack findings** with stable fingerprints deterministically, `POL-PACK-COLLISION` / `POL-NETWORK-REFUSED` diagnostics exercised where applicable, ReDoS-bounded regex does not hang on catastrophic input.
  8. **Provider-profile smoke**: `ackit pack --profile {codex,claude,copilot,gemini,generic} --json` each succeeds (5 providers + generic), manifest includes `profile: { requested, resolved, source }`; `ackit instructions --provider` respects profile file conventions per provider fixture (one minimal repo per provider); unknown profile value → `PROFILE-*` diagnostic with `file:line`; selection order `CLI --profile > ackit.yml profile > auto-detect` asserted; generic fallback deterministic.
  9. **Benchmark report**: `benchmarks/run.mjs --classes small --out /tmp/out` (quick advisory) + optionally `small,medium` produces `benchmarks/results/<date>-<sha>.json` with all 8 metrics (`coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio`); `check-thresholds.mjs` vs `thresholds.json` passes as **advisory** (failures recorded but do not block matrix unless `P0` regression justified); fixture determinism proven (generate twice → byte-identical hash set diff 0); result artifact archived.
  10. **VS Code extension smoke**: `pnpm --filter vscode build` or `vsce package` → `ackit-0.2.0.vsix` (name per `extensions/vscode/package.json` version mirror `0.2.0`), size **<2MB**, `vsce ls` whitelist audit (only `dist/extension.js`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG` slice, `images/**`), `@vscode/test-electron` **activation smoke** (headless) — Problems shows ≥1 `ACKIT*` diagnostic, sidebar tree views + Command Palette `ACKit: Refresh / Show Graph / Optimize / Diagnostics` + `resolveEffectiveStack` for current file (effective stack length ≥2 on fixture) succeed; mismatch version emits activation warning; no telemetry.

- **Audits & advisory gates** collected in same run and logged to `artifacts/v020-matrix.log`:
  - **Tarball audit**: `npm pack --dry-run` whitelist (only `dist/`, `templates/`, `schemas/`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json` + dashboard assets if needed); tarball contains **no AWS/GH/PAT-like plaintext** (secrets scan over packed files → 0 hits).
  - **VSIX audit**: whitelist + size + `publisher: cynrath`, `categories: ["Linters"]`, `engines.vscode >=1.90` contract asserted.
  - **Action audit**: `actionlint` green, SHA pins unchanged (`actions/checkout@`, `setup-node@`, `pnpm/action-setup@` full SHAs with version comment), `permissions: contents: read` (least-privilege) asserted, input injection fixture escaped.
  - **Benchmark advisory**: not a hard gate — multiplier regressions recorded, justified or filed as follow-up; absolute-ms gates not used.
  - **Cross-platform path normalization**: repo-relative paths are **POSIX forward-slash** standard form regardless of host; Windows drive-letter, space, Unicode temp dir, mixed EOL, case-sensitivity handled; symlink/junction/reparse → `realpath` before scope match; `git diff --check` clean (no trailing whitespace / CRLF issues).

## Out of scope

- No new product feature implementation (readiness, optimize, profiles, graph, packs, Action, watch, dashboard, diagnostics, benchmarks, SDK, VS Code code) — this task is verification only. If a failure reveals a bug, the fix is allowed but must be minimal, re-proven by re-running the matrix, and recorded in Evidence (not silently expanded scope).
- No `package.json` version bump (stays `0.1.1` until TASK-0024), no tag creation/movement/deletion, no `npm publish`, no `vsce publish`, no GitHub Release, no `workflow_dispatch` — these are prohibited until TASK-0024 explicit user authorization.
- No `master` push/merge, no force-push, no rebase/history rewrite.
- No network calls, telemetry, or uploads in product code (offline-first invariant holds; Action dogfood may run hosted but product itself stays offline).
- No LLM APIs, vector DB, RAG, untrusted JS plugin execution, cloud services (REQ-V020-GOV-007/009).
- No change to CI workflow pin set or permissions (audited, not mutated).
- No publishing of benchmark baselines to `master` beyond what TASK-0018 already committed (this task only generates advisory results).

## Technical design

### Matrix harness

- **Single SHA, single log**: all commands run at `HEAD == $(git rev-parse HEAD)`; the harness records `git rev-parse HEAD`, `git status --short`, `git branch --show-current`, `node --version`, `pnpm --version`, `node dist/cli/index.js --version`, `packageManager` field, and appends each command's stdout/stderr snippet + exit code to `artifacts/v020-matrix.log` (gitignored, not committed). Supporting JSONs (`scan --json`, `diagnostics --json`, `pack --profile --json`, `benchmarks/results/*.json`, `bundle-manifest.json`) are stored adjacent under `artifacts/v020-matrix/` for evidence review.
- **Determinism**: every machine-readable output is byte-identical on re-run given same repo+config+engine version (fingerprints, SARIF locations, pack manifests, readiness scores exclude timestamps/absolute paths; snapshot-gated). The harness re-runs one JSON output twice and asserts `sha256` equality.
- **Failure policy**: first failure stops the harness with diagnostic `MATRIX-FAIL <command> <exit>`; fix is a focused commit (no giant orchestration), then harness re-run from start.

### Detailed command sequence (authoritative order)

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm gen:schemas; git diff --exit-code -- schemas   # drift = 0
pnpm build
pnpm test                                            # 304+ tests: unit/integration/contract/security/cli-smoke/perf/vscode
pnpm smoke:cli
pnpm run smoke:package                                # real tarball isolated consumer
node dist/cli/index.js task doctor
node dist/cli/index.js config check
node dist/cli/index.js doctor
node dist/cli/index.js skills validate
node dist/cli/index.js instructions                  # terminal
node dist/cli/index.js instructions --json           # schema valid
node dist/cli/index.js scan --ci                     # threshold / baseline
node dist/cli/index.js scan --json > artifacts/v020-matrix/scan.json
git diff --check                                     # whitespace / CRLF
git status --short                                   # must be empty (except artifacts/)
# --- isolated consumers (each in fresh tmpdir) ---
pnpm pack --pack-destination /tmp/v020-pack && npm install /tmp/v020-pack/*.tgz --prefix /tmp/v020-consumer-cli
/tmp/v020-consumer-cli/node_modules/.bin/ackit --version | grep 0.1.1
node /tmp/v020-consumer-sdk.mjs                      # ESM import scanRepository
node tests/mcp-inmemory-smoke.mjs                    # 9 tools + scan call
actionlint                                           # on action.yml
/tmp/v020-dashboard-smoke.mjs                        # loopback + 1 rescan cycle
/tmp/v020-diagnostics-smoke.mjs                      # 5 secrets redacted
/tmp/v020-rulepack-smoke.mjs                         # 2 findings
/tmp/v020-profile-smoke.mjs                          # 5 providers + generic
benchmarks/run.mjs --classes small --out artifacts/v020-matrix/benchmarks
benchmarks/check-thresholds.mjs --results artifacts/v020-matrix/benchmarks/results.json
vsce package --out artifacts/v020-matrix/ackit-0.2.0.vsix  # + whitelist + size check
xvfb-run -a pnpm --filter vscode test  # or @vscode/test-electron headless
# --- audits ---
npm pack --dry-run                                   # whitelist
vsce ls --tree  # or unzip -l ackit-0.2.0.vsix
grep -R "fetch(" src/ || true                        # no network in product
scripts/check-security-boundaries.mjs
```

- Exact tarball/VSIX file names follow `package.json` `name`/`version` and `extensions/vscode/package.json` `version` (`ackit-0.2.0.vsix` after version bump design is proven; while still `0.1.1` the smoke asserts version mirror, not literal `0.2.0` string — both forms documented in Evidence).

### Isolated consumer details (acceptance hooks)

| Consumer | Repo fixture | Success signal | Failure signal |
|---|---|---|---|
| npm tarball CLI | repo itself + `examples/readiness-high` | `--version` matches, `--help` leak-free, scan exit 0 | version mismatch / leak / scan crash |
| SDK ESM | `benchmarks/fixtures/small` (100 files) | `findings.length >0`, no `process.exit`, `AbortError` in 200ms | empty findings / exit trap / timeout |
| MCP InMemoryTransport | same fixture | `tools/list` length 9, `scan` call returns valid `ScanResult` | handshake fail / wrong count |
| Action | `action.yml` + fixture workflow | `actionlint` 0, SARIF 2.1.0 valid, summary Markdown non-empty | actionlint fail / SARIF invalid |
| Dashboard | fixture with 1 file change after serve start | HTML contains `findings: N`, API JSON valid, 1 rescan reflected | bind not loopback / no update |
| Diagnostics | 5-secret fixture | `redactionCount ==5`, no home path, manifest deterministic | secret leaked / path leaked |
| Rule-pack | 2-pack fixture | `findings.length ==2`, fingerprints stable | wrong count / fingerprint drift |
| Profile | 5 providers + generic | each `pack --profile` succeeds, manifest `profile.resolved` correct | provider error / fallback wrong |
| Benchmark | `benchmarks/fixtures/small` | `results.json` has 8 metrics, advisory check recorded | missing metric / crash |
| VS Code | `examples/vscode-smoke` workspace | Problems ≥1, stack view ≥2 nodes, palette commands succeed | activation fail / view empty |

### Artifacts & retention

- `artifacts/v020-matrix.log` — single human-readable matrix log (append-only, timestamped sections).
- `artifacts/v020-matrix/scan.json`, `diagnostics.json`, `readiness.json`, `graph.json`, `benchmarks/results.json`, `bundle-manifest.json`, `action-sarif.json`, `mcp-tools.json`, `profile-matrix.json` — machine artifacts for evidence review (gitignored, never committed; Evidence section quotes shasums).
- `artifacts/v020-matrix/ackit-0.2.0.vsix` (or `ackit-0.1.1.vsix` pre-bump) — VSIX for whitelist/size audit (temp, not committed).

## User-facing behavior

**No new user-facing behavior.** This task adds no CLI flags, no config keys, no output format changes, no breaking changes. Observable effect is only that the next task (TASK-0024) can trust the matrix log:

- `ackit --help` remains leak-free (no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext`).
- `ackit scan --json`, `ackit diagnostics --json`, `ackit pack --profile --json`, `ackit instructions --json` remain pure JSON on stdout, diagnostics on stderr, exit codes `0–5` per ADR-0007.
- Isolated consumers (tarball, SDK, MCP, Action, dashboard, diagnostics, packs, profiles, benchmarks, VS Code) all succeed via their documented public surfaces — no hidden flags or manual steps.

If a matrix failure forces a minimal fix, the fix follows normal `docs-first` workflow (task doc updated, focused commit, matrix re-run) — but the task's own success criteria remain "matrix green", not "new feature shipped".

## Security

- **Threat model delta**: no new threat surface introduced; this task exercises the surfaces hardened in TASK-0021 (L) and verifies their controls remain intact: dashboard XSS/binding/headers/path redaction, rule-pack traversal/ReDoS/size/no-exec, Action pinning/permissions/input injection, diagnostics bundle redaction/zip-slip, SDK `process.exit`/path leak, VS Code telemetry/activation boundary, VSIX/tarball audit, localhost binding, secrets redaction.
- **Automated gates run in matrix**:
  - `scripts/check-security-boundaries.mjs` green — forbids `child_process.exec(`, `eval(`, `Function(`, `require(userInput`, dynamic `fetch(` in `src/`; YAML depth 20 & size caps enforced.
  - `tests/security/v020-*.test.ts` (per-surface fixtures) green on ubuntu+windows+macos × node22/24 where applicable (CI will enforce; local matrix records ubuntu leg).
  - Redaction gates green: terminal/JSON/SARIF/HTML/API/bundle all `[REDACTED]` for the 5 known secrets.
  - Tarball/VSIX content audit: no plaintext secrets, no stray `node_modules`, no absolute paths.
  - XSS gate: fixture `<script>alert(1)</script>` in finding `relativePath`/`evidence.excerpt` renders escaped (`&lt;script&gt;`) in HTML and API response.
  - Localhost-only guarantee: `report serve` non-loopback (`0.0.0.0`/`::1`) without `--allow-nonlocal` → exit 2 and probe log recorded.
  - Action least-privilege: `permissions: contents: read` (and `checks: write` only where documented) asserted in contract test.
  - No long-lived token: `grep -R "NPM_TOKEN|NODE_AUTH_TOKEN|VSCE_PAT" .github/workflows/` → 0; `release.yml` remains OIDC `id-token: write` only.
- **Offline guarantee**: product code makes no network calls; spy test (`fetch` forbidden in `src/`) + `actionlint` network-refused diagnostic for `policy.rulePacks` URL `extends` both green.

## Performance

- No new perf budget introduced; this task **measures** via the benchmark harness and enforces **advisory** thresholds (multipliers, not absolute ms).
- Metrics collected: `coldScanMs`, `warmScanMs`, `incrementalMs` (1-file change), `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio` per fixture class (small/medium exercised here; full 8-class suite is TASK-0018 scheduled job — this task runs the quick advisory subset).
- Fixture determinism proven (generate twice → byte-identical).
- Dashboard large-repo behavior spot-checked: initial HTML served in <500ms p50 on CI for small fixture (advisory, not hard gate at this task).
- No flaky absolute timing gates: `check-thresholds.mjs` uses `baseline × multiplier` (e.g. cold scan < baseline ×1.5) with 10% tolerance and two-breaches rule per ADR-0022.

## Compatibility

- **Windows / macOS / Linux**: repo-relative paths normalized to **POSIX forward-slash** (`path.posix` for comparisons, `path.join(canonicalPath, ...split("/"))` for FS joins); drive-letter (`C:\`), mixed separators, Unicode temp dirs, mixed EOL (`\r\n` vs `\n`), case-sensitivity handled; VS Code extension smoke runs on win32 CI as well as POSIX.
- **Node 22 + Node 24**: matrix must pass on both LTS lines locally (one leg recorded) and CI matrix 10/10 will enforce both; `AbortSignal` available on both.
- **Config backward compat**: `ackit.yml` v0.1.1 files without `readiness`/`profile`/`policy.rulePacks`/`diagnostics` still validate with defaults; new keys validated when present.
- **Package**: ESM-only (`type: module`, `sideEffects: false`, `exports: {".":…, "./mcp":…}`) — CJS consumers use dynamic `import()` shim doc'd in `docs/reference/sdk.md`.

## Acceptance criteria

- [ ] **Dependencies satisfied**: TASK-0022 is `completed` before this task starts (`task doctor` confirms no cycle, this task's `dependencies: [TASK-0022]` acyclic).
- [ ] **Full local gate green at one SHA** — each of the following exits 0 and output SHAs recorded in `artifacts/v020-matrix.log` at `HEAD == $(git rev-parse HEAD)`:
  `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm gen:schemas && git diff --exit-code -- schemas` (drift 0), `pnpm build`, `pnpm test` (all suites green, pass counts recorded), `pnpm smoke:cli`, `pnpm run smoke:package`, `node dist/cli/index.js task doctor`, `node dist/cli/index.js config check`, `node dist/cli/index.js doctor`, `node dist/cli/index.js skills validate`, `node dist/cli/index.js instructions`, `node dist/cli/index.js scan --ci`, `git diff --check` (0).
- [ ] **npm tarball isolated CLI battery**: `pnpm pack` → `npm install $tarball` in fresh temp dir → `--version` matches `package.json` version, `--help` contains no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` (grep 0), `scan`/`doctor`/`task doctor`/`config check`/`instructions`/`pack`/`diagnostics` each exit 0; `tmpdir` path + tarball `shasum` recorded.
- [ ] **SDK ESM consumer**: fresh temp project `import { scanRepository } from "@cynrath/agent-context-kit"` (ESM) → scan fixture ⇒ `findings.length >0`, no `process.exit` fired (`process.exitCode` unchanged), `AbortSignal` abort rejects with `DOMException { name:"AbortError" }` within 200ms; `import "@cynrath/agent-context-kit"` has no side-effects (no timers/servers/FS writes on import).
- [ ] **MCP InMemoryTransport consumer**: handshake + `initialize` + `tools/list` returns **9 read-only tools** (exact count) + `tools/call scan` returns valid report JSON (schema valid) + `resources/read` + `prompts` smoke + cancellation/malformed input handled without crash; `MCP` SDK version `^1.30.0` confirmed.
- [ ] **GitHub Action consumer**: `actionlint` on `action.yml` passes; `uses: ./` smoke with `command: scan` + `fail-threshold: low` produces GitHub Checks annotations + job summary Markdown + SARIF 2.1.0 artifact valid; `action.yml` inputs/outputs/branding valid; SHA pins unchanged.
- [ ] **Dashboard / report server smoke**: `ackit report serve --port 0` (or `ackit dashboard`) binds **loopback only** (`127.0.0.1`) on random free port (port recorded), serves HTML containing findings count = `scan --json` count; non-loopback without `--allow-nonlocal` → exit 2 diagnostic; **1 rescan cycle** (file change → debounce → API/HTML reflects new count) succeeds; security headers `CSP default-src 'self'` + `X-Content-Type-Options: nosniff` present; findings paths/content XSS-escaped; large-repo paging not crashed.
- [ ] **Diagnostics / redaction smoke**: fixture secret repo (5 known secrets: AWS key, `ghp_`, private key block, connection string, PAT/high-entropy token) → `ackit diagnostics --json` valid vs `diagnostics.schema.json` + `ackit diagnostics bundle --out ./ackit-diag.zip` produces deterministic `bundle-manifest.json` (sorted keys, `sha256` per file, `redactionCount`) with **5/5 secrets as `[REDACTED]`**, zero absolute machine paths (only `<local-path>` or repo-relative), zero env var leak; `bundle --redact-check` re-verifies.
- [ ] **Rule-pack smoke**: fixture repo with **2 packs** (presence `README.md must exist` + pattern `forbiddenPattern`) loaded via `ackit.yml` `policy.rulePacks` (repo-relative, no URL fetch) → `ackit scan --json` shows exactly **2 pack findings** with stable fingerprints deterministically (re-run fingerprints identical); collision/URL-refused/ReDoS diagnostics not crashing.
- [ ] **Provider-profile smoke**: `ackit pack --profile {codex,claude,copilot,gemini,generic} --json` each succeeds (**6 profiles** total: 5 providers + generic), manifest includes `profile: { requested, resolved, source }` and adjusted ranking vs generic; `ackit instructions --provider` respects per-provider file conventions (one fixture per provider asserted); unknown profile value → `PROFILE-*` diagnostic; selection precedence `CLI > config > auto-detect` asserted; generic fallback deterministic.
- [ ] **Benchmark report generated**: `benchmarks/run.mjs --classes small --out artifacts/v020-matrix/benchmarks` produces `results.json` with all **8 metrics** (`coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio`); `check-thresholds.mjs` vs `thresholds.json` run recorded (advisory, multipliers not absolute); fixture determinism (generate twice → byte-identical) proven.
- [ ] **VS Code extension smoke**: `vsce package` → `ackit-*.vsix` size **<2MB**, `vsce ls` whitelist audit (only `dist/extension.js`, `package.json`, `README.md`, `LICENSE`, `CHANGELOG` slice, `images/**` — no stray `node_modules`), `@vscode/test-electron` **activation smoke** headless succeeds (Problems shows ≥1 `ACKIT*` finding, "instructions for current file" view lists ≥2 nodes ordered by precedence, Command Palette commands `ACKit: Refresh/Show Graph/Optimize/Diagnostics` succeed); version mirror `0.1.1→0.1.1` (or `0.2.0→0.2.0` after TASK-0024 design) asserted, mismatch warning tested; no telemetry.
- [ ] **Tarball / VSIX audits + advisory gates**: `npm pack --dry-run` whitelist clean (only allowed files), tarball secrets scan **0 hits**; VSIX whitelist + size clean; `actionlint` green; **action pinning** asserted (full SHAs with version comments, `permissions:` least-privilege); **benchmark advisory** recorded (no hard fail on advisory breach, but justification noted); **cross-platform path normalization** asserted (POSIX forward-slash standard form, Windows drive/Unicode/mixed EOL handled, `git diff --check` clean).
- [ ] **Determinism proof**: re-running `scan --json` + `diagnostics --json` + `pack --json` twice at same SHA produces byte-identical outputs when machine-dependent fields excluded (sha256 equality recorded).
- [ ] **Matrix log artifact committed to evidence (not repo)**: `artifacts/v020-matrix.log` exists, is non-empty, contains each command's exit code + SHA + `tmpdir` paths, and is referenced in Completion notes (gitignored, never committed as tracked file).
- [ ] **No publish/tag/version change** in this task: `git tag --list v0.2.0` empty, `package.json` version unchanged from entry SHA, no `release.yml` trigger, verified via `git diff --stat` not containing version line and `grep workflow_dispatch .github/workflows/` → 0.
- [ ] **Completion gate satisfied**: no `--force`, every criterion checked, evidence recorded, `git status --short` clean (except `artifacts/` ignored), `task doctor` green after task doc update.

## Tests

| Class | What | Where | Pass signal |
|---|---|---|---|
| cli-smoke | `lint`, `format:check`, `typecheck`, `gen:schemas` drift, `build`, `smoke:cli`, `smoke:package`, `task doctor`, `config check`, `doctor`, `skills validate`, `instructions`, `scan --ci`, `git diff --check` | local harness | each exit 0, drift 0 |
| unit/integration/contract/security | full `pnpm test` (304+ tests) including per-feature suites | `tests/**` | files+tests pass counts recorded |
| e2e — tarball CLI | isolated `npm install $tarball` battery | `scripts/package-smoke.mjs` + temp dir | `--version` matches, leak grep 0 |
| e2e — SDK | ESM `import { scanRepository }` + `AbortSignal` | `tests/e2e/sdk-consumer` or temp `sdk-consumer.mjs` | findings >0, AbortError <200ms, no exit trap |
| e2e — MCP | `InMemoryTransport` 9 tools + scan call | `tests/integration/mcp` | tools 9, report valid |
| integration — Action | `actionlint` + `uses: ./` smoke + SARIF 2.1.0 | `action.yml` + fixture workflow | actionlint 0, annotations + SARIF valid |
| integration — dashboard | loopback bind + port 0 + 1 rescan cycle + headers + XSS | `tests/integration/dashboard` + temp fixture | bind loopback, cycle reflected, headers present, XSS escaped |
| security — diagnostics | 5-secret bundle redaction | `tests/security/v020-diagnostics` fixture | 5/5 redacted, no absolute path |
| integration — rule packs | 2-findings pack (presence+pattern) | fixture repo with `ackit.yml` `policy.rulePacks` | findings 2, fingerprints stable |
| integration — profiles | 5 providers + generic `pack --profile` matrix | per-provider fixtures | 6/6 succeed, manifest `profile.resolved` correct |
| perf — benchmarks | `run.mjs --classes small` + `check-thresholds.mjs` + fixture determinism | `benchmarks/**` | 8 metrics present, advisory recorded, determinism proven |
| vscode | `@vscode/test-electron` activation + VSIX audit | `extensions/vscode/**` | Problems ≥1, stack view ≥2, size <2MB, whitelist clean |
| security | `check-security-boundaries.mjs` + `tests/security/v020-*.test.ts` | `scripts/`, `tests/security/` | grep gate 0, per-surface fixtures green |
| determinism | re-run JSON outputs twice | harness | sha256 equality |
| cross-platform | path normalization (POSIX, drive, Unicode, EOL) | harness + `tests/security/path` | forward-slash form, no traversal |

## Documentation

- No new docs authored in this task (matrix gate). Verify **existing docs** remain accurate after matrix:
  - `docs/v0.2.0/EXECUTION_PLAN.md` dependency numbers already use real allocated IDs `TASK-0007..0024` — not re-edited here except to confirm this task's `dependencies: [TASK-0022]`.
  - `docs/v0.2.0/TRACEABILITY.md` unmapped=0, cycles=0, no placeholder rows — re-verified via `task doctor` + manual table audit; evidence recorded.
  - `docs/v0.2.0/DEFINITION_OF_DONE.md` Quality/Platforms/Consumers/Security checklists are the oracle for this matrix — every Consumers bullet has a corresponding Evidence entry.
  - `docs/architecture/overview.md` reserved subsystems note (`readiness`, `profiles`, `rule-packs`, `dashboard`, `diagnostics`, `benchmarks`, `extensions/vscode`) remains accurate.
  - `CHANGELOG.md` `[0.2.0]` entry present (added by TASK-0022) — not edited here; matrix verifies example fixtures referenced by guides still pass `ackit scan --ci` without threshold.
  - Dead-link gate: `pnpm link-check` or `markdown-link` green (if script exists; otherwise manual `grep -R "](docs/"` sanity and record).

## Evidence

Record in Completion notes (copy-paste exact outputs, not summaries):

- **SHA & env**: `git rev-parse HEAD` (starting + ending), `git status --short`, `git branch --show-current`, `git tag --list` (no `v0.2.0`), `node --version`, `pnpm --version`, `node dist/cli/index.js --version`, `package.json` `packageManager` field, `ackit.yml` `schemaVersion`.
- **Gate outputs**: `pnpm lint` / `format:check` / `typecheck` / `gen:schemas` drift line / `build` / `pnpm test` (files + tests pass counts, e.g. `Test Files  N passed | Tests  N passed`) / `smoke:cli` / `smoke:package` / `task doctor` / `config check` / `doctor` / `skills validate` / `instructions` / `scan --ci` (exit codes, threshold line) / `git diff --check` (empty).
- **Tarball**: `pnpm pack` tarball name + `shasum` + `npm pack --dry-run` whitelist snippet + `--version` output + `--help` leak grep count (0).
- **SDK**: temp `sdk-consumer.mjs` path + `findings.length` + `AbortError` timing + `process.exitCode` after call + side-effects spy (0 FS writes on import).
- **MCP**: `InMemoryTransport` `tools/list` count (9) + `tools/call scan` findings count + SDK version.
- **Action**: `actionlint` output (0) + `uses: ./` smoke summary lines + SARIF `version: 2.1.0` snippet + `permissions:` block.
- **Dashboard**: `report serve --port 0` bound port + `curl http://127.0.0.1:<port>/` HTML snippet containing `findings: N` + API `/api/scan.json` validity + 1 rescan cycle log (file touched → debounced rescan → count delta or stable) + `curl -v` header lines (`CSP`, `X-Content-Type-Options`) + non-loopback attempt exit 2 log + XSS fixture escaped snippet.
- **Diagnostics**: `diagnostics --json` schema-valid line + `bundle` `bundle-manifest.json` content (files + sha256 + `redactionCount`) + `grep -c "\[REDACTED\]" bundle-manifest` (5) + `grep -c "/home\|C:\\\\"` (0) + `zip -l ackit-diag.zip` listing.
- **Rule-pack**: fixture `ackit.yml` `policy.rulePacks` snippet + `scan --json` findings array (2 items) + fingerprints (two runs identical).
- **Profile**: `pack --profile {codex,claude,copilot,gemini,generic} --json` each exit 0 + manifest `profile.resolved` table (6 rows) + `instructions --provider` snippet per provider.
- **Benchmark**: `benchmarks/run.mjs --classes small --out` output path + `results.json` 8 metrics table + `check-thresholds.mjs` advisory result + fixture determinism `sha256sum` equality proof.
- **VS Code**: `vsce package` output + `unzip -l ackit-*.vsix` whitelist listing + size (`du -h` <2MB) + `@vscode/test-electron` activation log (Problems count, stack view length, palette commands).
- **Audits**: `npm pack --dry-run` + `vsce ls` whitelists + tarball secrets `grep` (0 hits) + `actionlint` pin check + `check-security-boundaries.mjs` exit 0 + `git diff --check` (clean) + determinism re-run `sha256` equality.
- **Matrix log**: `artifacts/v020-matrix.log` path + `wc -l` + `sha256sum` + statement `release actions: none, no publish/tag/version bump`.
- **Traceability**: `task doctor` output (unmapped 0, cycles 0) + `git diff --stat` (no `package.json` version line).

## Completion gate

No `--force`. Dependencies `TASK-0022` must be `completed` before start. Task is not `completed` until every acceptance criterion is checked, every evidence item recorded in Completion notes with exact SHA, and `artifacts/v020-matrix.log` exists and is non-empty. Next task `TASK-0024` (release readiness & evidence) becomes runnable only after this is `completed`; that task performs the **final read-only** exact-SHA verification (registry/tag absent proofs, hosted CI 10/10, OIDC) and stops for explicit user authorization — no publish/tag without it.

## Requirement IDs

`all REQ-V020-*` — this matrix gate verifies the full v0.2.0 requirement set via its consumer matrix (traceability: TASK-0023 maps to **all** requirements as integration verification, not as owner of new implementation):

- REQ-V020-GOV-001..010 + REQ-V020-GOV-OUT-001 (global invariants: offline, no telemetry, root containment, no leakage, determinism, safe writes, no plugin exec, no process.exit from SDK, stable contracts, no help leak, out-of-scope)
- REQ-V020-A-001..006 (readiness / context-quality scoring engine)
- REQ-V020-B-001..005 (optimize v2: explain + fix plan)
- REQ-V020-C-001..005 (provider-aware context profiles)
- REQ-V020-D-001..003 (instruction graph v2)
- REQ-V020-E-001..003 (declarative rule packs / policy packs)
- REQ-V020-F-001..003 (official GitHub Action)
- REQ-V020-G-001..004 (watch + local dashboard / report server)
- REQ-V020-H-001..002 (diagnostics / observability)
- REQ-V020-I-001..003 (performance benchmark system)
- REQ-V020-J-001..003 (public SDK v1)
- REQ-V020-K-001..003 (official VS Code extension)
- REQ-V020-L-001..002 (cross-cutting security hardening)
- REQ-V020-M-001..002 (documentation / examples / migration)
- REQ-V020-N-001..002 (v0.2.0 integration & release readiness — verified here as pre-gate, executed in TASK-0024)

Coverage invariant: this task ensures `unmapped requirements = 0` before the final gate; every REQ has at least one matrix proof (unit/contract/integration/e2e/security/perf/ci-config/docs-review) collected in `artifacts/v020-matrix.log`.

## Risks

- **Flaky watch/benchmark timing** on CI (debounce coalescing, RSS variance) — mitigated by advisory multipliers not absolute ms, median-of-3, isolated temp dirs; record variance, do not hard-fail on advisory breach.
- **VS Code headless (`@vscode/test-electron`) platform dependency** (needs `xvfb` on Linux, display on macOS) — mitigated by fallback to `vsce ls` + static manifest audit if headless unavailable, with explicit note in Evidence.
- **Tarball/VSIX audit false positives** (npm normalization of `packageManager`/`prepack`, `vsce` image assets) — mitigated by content-identical SHA per relative path, not raw shasum, documented per v0.1.1 precedent.
- **Secret fixture false negative** (entropy detector misses synthetic secret) — mitigated by using the exact 5 known secret shapes from `docs/v0.2.0/DEFINITION_OF_DONE.md` (AWS key, `ghp_`, private key block, connection string, PAT) and asserting `[REDACTED]` literally.

## Rollback plan

Focused commit revert (`git revert <matrix-fix-sha>` if a minimal fix was applied) + re-run of `artifacts/v020-matrix.log` harness. No tag, no publish, no artifact published to registry/marketplace to roll back — matrix artifacts are local `artifacts/` only (gitignored).

## Completion notes

(placeholder — to be filled with SHA-stamped matrix log excerpt, pass counts, and artifact shasums per Evidence section when task is executed; do not mark completed until every acceptance criterion is checked and `artifacts/v020-matrix.log` is non-empty)

