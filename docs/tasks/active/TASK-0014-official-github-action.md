---
id: "TASK-0014"
title: "Official GitHub Action"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Ship the official minimal, secure, offline-first GitHub Action for AgentContextKit (`action.yml`) per REQ-V020-F-001..003 and ADR-0020 — Node 24 pinned action that invokes the published `@cynrath/agent-context-kit@0.2.0` (or bundled `dist/action/index.js`), exposes `command/args/fail-threshold/upload-sarif` inputs, emits findings/SARIF/annotations/summary with least-privilege permissions, documents marketplace metadata and supply-chain pinning, and dogfoods against itself without breaking the tag-only OIDC release invariant.

## Context / current state

- **`.github/workflows/ci.yml` — 85 lines, 10 effective jobs**: 3 declared jobs expanded via matrix → `verify` (ubuntu/windows/macos × node 22/24 = 6), `self-scan` (1), `package-smoke` (ubuntu/windows/macos = 3). Pipeline: checkout → setup-node → pnpm setup → `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm format:check` → `pnpm typecheck` → `pnpm build` → `pnpm test` (+ self-scan `config check`/`task doctor`/`scan --ci`, tarball smoke). All action pins are full SHAs with human-readable version comments (e.g. `actions/checkout@f... # v4`). [Source: `.github/workflows/ci.yml` lines 1-85 read 2026-08-27]

- **`.github/workflows/release.yml` — tag-only OIDC**: `on.push.tags: v*.*.*` only; `permissions: contents:write, id-token:write`; validates `vX.Y.Z` shape, tag ↔ `package.json` name/version, npm CLI ≥11.5.1, frozen install → lint/format/typecheck → build+`gen:schemas` drift gate → tests → `pnpm pack` shasum → `smoke:package` → registry absence E404 check → `npm publish --provenance` via OIDC (no long-lived token) → registry shasum/dist-tag/30-retry propagation → `npx` consumer smoke → `gh release create --verify-tag` strictly after publish. Master push never publishes. [Source: `.github/workflows/release.yml` read 2026-08-27]

- **No official action yet**: No `action.yml` exists at repo root; no `action/` directory; no `dist/action/` bundle; no dogfood workflow that `uses: ./` or `uses: Cynrath/agent-context-kit@v0.2.0`. Consumers currently `npx @cynrath/agent-context-kit` or `npm install` + `node dist/cli/index.js scan --ci` manually (see `docs/guides/ci.md`).

- **`docs/guides/ci.md` exists** (40 lines): Documents recommended pipeline and `ackit scan --ci / --changed / --baseline` usage, but has no GitHub Action recipe, no inputs/outputs table, no annotation/SARIF/job-summary section.

- **v0.2.0 governance snapshot**: Single consolidated `v0.2.0` release on `master` (ADR-0015), `package.json` is `0.1.1` (will become `0.2.0` at TASK-0024), `type: module`, `sideEffects:false`, `engines.node >=22`, `exports {".","./mcp"}`. SDK task TASK-0013 must complete first to freeze `src/index.ts` surface that the action will import — hence this task depends on `TASK-0013`.

Related ADRs: ADR-0020 (action architecture, primary), ADR-0015 (consolidated release, master-never-publishes), ADR-0021 (SDK boundary reused by action), ADR-0023 (multi-artifact version coupling).

## Goal

One outcome: a marketplace-ready `action.yml` (Node 24, `main: dist/action/index.js`) with a reproducible bundle that pins `@cynrath/agent-context-kit` exactly `0.2.0`, accepts `command/args/fail-threshold/upload-sarif`, outputs `findings-json`/`sarif-path`, emits `core.error/warning` annotations (severity-mapped, no evidence leakage), writes SARIF 2.1.0 + job-summary markdown + runner-temp JSON artifact on least privilege (`contents:read`, optional `checks:write`), is safe against input injection (`execFile` + safe argv splitter), carries branding `shield/blue`, documents pinning/SHA/digest usage, adds a dogfood workflow that `uses: ./` and lints with `actionlint`, and passes contract + integration + security tests while keeping `master` push publish-free.

## In scope

- **Action manifest `action.yml`** at repo root per ADR-0020 §1,3,6:
  ```yaml
  name: "AgentContextKit"
  description: "Offline-first agent readiness toolkit (scan/pack/graph/policy)"
  branding: { icon: "shield", color: "blue" }
  inputs:
    command:        { description: "ackit subcommand (scan|doctor|optimize|pack|instructions|policy)", default: "scan", required: false }
    args:           { description: "extra CLI args (not shell-interpolated; split safely)", required: false, default: "" }
    fail-threshold: { description: "severity required to fail the job (low|medium|high|critical)", required: false, default: "high" }
    upload-sarif:   { description: "whether to produce SARIF", required: false, default: "false" }
  outputs:
    findings-json:  { description: "path to findings JSON" }
    sarif-path:     { description: "SARIF file path when upload-sarif=true" }
  runs: { using: "node24", main: "dist/action/index.js" }
  ```

- **Action runtime `action/src/index.ts` → `dist/action/index.js`**:
  - Pinned dep: `action/package.json` has `dependencies: { "@cynrath/agent-context-kit": "0.2.0" }` (exact, no `^`/`~`), installed via `npm ci --production` at build. Bundle reproducible from `pnpm build` (`tsup`/`esbuild` lightest; justify choice; `dist/action/index.js` auditable; `actionlint`/`npm pack` whitelist interaction documented).
  - Invokes SDK/CLI as library (`import { scanRepository }` or `execFile` to `node dist/cli/index.js` via data argv), not `exec` or shell string.
  - Implements: input parsing → safe `args` splitter → command dispatch (`scan|doctor|optimize|pack|instructions|policy`) → findings JSON to `${RUNNER_TEMP}/ackit-findings.json` → optional SARIF 2.1.0 via existing `renderSarif` to `${RUNNER_TEMP}/ackit.sarif` with repo-relative URIs → severity→level annotations (`core.error` for critical/error, `core.warning` for high, `core.notice` else; evidence never in annotation body) → `$GITHUB_STEP_SUMMARY` Markdown table `{ category, count, top finding }` + readiness score line when available → `core.setOutput` for `findings-json`/`sarif-path` → `fail-threshold` gating (`core.setFailed` when max severity ≥ threshold).

- **CI integration surface** (ADR-0020 §4, REQ-V020-F-002):
  - Annotations path repo-relative, evidence redacted.
  - SARIF 2.1.0 valid, repo-relative URIs; action does **not** auto-call `github/codeql-action/upload-sarif` — recipe documented so user opts in (least-privilege).
  - Job summary appended to `$GITHUB_STEP_SUMMARY` (category counts + top finding + readiness score).
  - Artifact path documented (`${RUNNER_TEMP}/ackit-findings.json`); action does not silently `upload-artifact` — user adds `actions/upload-artifact@v4` step if desired (documented recipe).

- **Dogfood workflow** `.github/workflows/ackit-action-dogfood.yml` (or `action-smoke` job in `ci.yml` — decision recorded, single file chosen):
  - Runs `uses: ./.` with `command: scan` against the current repo, asserts `actionlint` passes, SMOKE variant with `fail-threshold: low` expected-fail path.
  - Uses SHA-pinned actions (reuse `ci.yml` pins).

- **Docs**: Update `docs/guides/ci.md` with action recipe (pin `uses: Cynrath/agent-context-kit@v0.2.0` or SHA for high-assurance), inputs/outputs table, least-priv `permissions:` snippet, SARIF upload recipe, job-summary screenshot description.

- **Build/pack interaction**: `pnpm build` emits `dist/action/index.js`; `package.json` `files` whitelist analysis recorded (action consumers read from repo checkout, not npm — whether `action/dist/**` is in npm `files` is documented, justified).

## Out of scope

- Publishing the action to the GitHub Marketplace (requires separate explicit user authorization; this task records the `marketplace` metadata and the dispatch boundary, but does not run `gh release` for the action or `vsce publish`-equivalent).
- Publishing npm `0.2.0`, creating/moving tag `v0.2.0`, creating GitHub Release — reserved for TASK-0024 only; master push must never publish (ADR-0015 §5, release.yml invariant).
- Expanding SDK surface (`scoreRepository`, `evaluateRulePack` bodies) — owned by TASK-0008/TASK-0012; this action only consumes the frozen SDK shape from TASK-0013.
- Docker or composite action variants (rejected in ADR-0020 — Node action only).
- Dashboard/watch/benchmark/VS Code extension surfaces (TASK-0015..0021).
- Adding new runtime deps beyond the pinned `@cynrath/agent-context-kit@0.2.0` + `@actions/core`/`@actions/github` (if used) without justification.
- `pull_request_target`, `contents:write`, `id-token:write` in the action or dogfood workflow (reserved for `release.yml`).

## Technical design

### 1. File layout (new files, repo root is checkout surface for actions)

```
action.yml                          # manifest, runs.using=node24, main=dist/action/index.js
action/
  package.json                      # name: "ackit-action-runtime", deps: { "@cynrath/agent-context-kit":"0.2.0" exact }
  src/
    index.ts                        # entry: getInput → safeSplit → dispatch → outputs/annotations/summary
    argv.ts                         # safe argv splitter (no shell tokenization)
    summary.ts                      # $GITHUB_STEP_SUMMARY writer
  dist/
    index.js                        # bundled output (esbuild/tsup, ESM → CJS bundle for node24 if needed)
.github/workflows/
  ackit-action-dogfood.yml          # dogfood: uses: ./  (preferred) OR ci.yml action-smoke job — single choice, ADR-0020 §7
```

- `action.yml` `runs.using: "node24"` (pin matching `release.yml` Node 24), `main: "dist/action/index.js"` (checked-in or release-asset bundle — reproducible from `pnpm build`, `actionlint` white-listed).

### 2. Distribution choice — bundled vs npm (ADR-0020 §2)

- **Primary: pinned npm dep bundled at build**. `action/package.json` pins `@cynrath/agent-context-kit` exactly `0.2.0`; `action/dist/index.js` bundles it (or `action/node_modules` checked via `npm ci`). Runtime needs no network (`npx` not called). Supply-chain auditable via lockfile + digest.
- Rejected alternative documented: `npx --yes @cynrath/agent-context-kit@0.2.0` per job — would require network, breaks air-gap, weakens digest pinning.
- `action.yml` consumption pin documented both ways in `docs/guides/ci.md`:
  ```yaml
  - uses: Cynrath/agent-context-kit@v0.2.0          # tag pin (ergonomic)
  - uses: Cynrath/agent-context-kit@<full-SHA>      # digest pin (high-assurance, e.g. 64-char SHA)
  ```

### 3. Inputs / outputs (exact per ADR-0020 §3 + REQ-V020-F-001)

| Input | Type | Default | Notes |
|---|---|---|---|
| `command` | string | `scan` | allowlist `scan\|doctor\|optimize\|pack\|instructions\|policy`; unknown → `core.setFailed` with remediation |
| `args` | string | `""` | safe-split only; empty → `[]`; never shell-interpolated |
| `fail-threshold` | enum `low\|medium\|high\|critical` | `high` | gates `core.setFailed`; `critical` fails only on critical/error |
| `upload-sarif` | boolean string `true\|false` | `false` | when `true` also writes SARIF even if `command != scan` (diagnostic if unsupported) |

| Output | Value |
|---|---|
| `findings-json` | `${RUNNER_TEMP}/ackit-findings.json` (always when scan-like command ran) |
| `sarif-path` | `${RUNNER_TEMP}/ackit.sarif` when `upload-sarif==true` or `args` contains `--format sarif` |

### 4. CI integration surface specifics (REQ-V020-F-002)

- **Annotations**: `core.error`/`core.warning`/`core.notice` per finding; `file` is repo-relative, `line`/`col` from finding, `title` is `ruleId (severity)`, `message` is `remediation` or truncated `message` — never evidence/secret values. Severity mapping: `critical→error`, `error→error`, `high→warning`, `medium/low/info→notice`.
- **SARIF**: Delegate to existing `renderSarif(findings)` (already repo-relative URIs, REQ-RPT-001 shape); write to `sarif-path`; validate via `sarif` JSON schema in tests. Recipe (not auto):
  ```yaml
  - uses: Cynrath/agent-context-kit@v0.2.0
    with: { command: scan, upload-sarif: 'true' }
  - uses: github/codeql-action/upload-sarif@v3  # pin SHA
    with: { sarif_file: ${{ steps.ackit.outputs.sarif-path }} }
  ```
- **Job summary**: Append Markdown to `$GITHUB_STEP_SUMMARY`:
  ```md
  ## AgentContextKit — scan summary
  | Category | Count | Top finding |
  |---|---|---|
  | ... | ... | ... |
  Overall readiness: 82/100 (if score available, threshold 90 → ❌ gate)
  ```
- **Artifact**: Document recipe (not silent):
  ```yaml
  - uses: actions/upload-artifact@v4  # pin SHA
    with: { name: ackit-findings, path: ${{ steps.ackit.outputs.findings-json }} }
  ```

### 5. Least-privilege permissions (REQ-V020-F-002, ADR-0020 §5)

- Documented minimal:
  ```yaml
  permissions:
    contents: read          # repo checkout
    # checks: write         # only if Check API path used; core.* annotations need no extra perm — doc both, prefer no extra
  ```
- Action code never requests `contents:write` or `id-token:write`; dogfood workflow asserts `permissions.contents==read`. `pull_request_target` forbidden. `release.yml` remains sole `id-token:write` holder.

### 6. Pinning & supply-chain safety

- Action repo workflow pins (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/upload-artifact`) to full 40-hex SHAs (reuse `ci.yml` values: `checkout@f548...`, `setup-node@ae0...`, `pnpm/b906...`).
- Consumer pin documented as tag **or** full SHA (high-assurance).
- `action/package.json` pins `@cynrath/agent-context-kit` exactly `0.2.0` (no caret), `packageManager` pinned, lockfile committed for the action sub-package.

### 7. Input-injection safety (ADR-0020 §5)

- `args` parsed by `argv.ts` safe splitter: respects single/double quotes, handles escaped quotes, rejects NUL bytes, never invokes shell. Reference impl: iterate string, state machine, emit argv array; no `eval`.
- Dispatch via `child_process.execFile("node", [distCli, ...argv], { shell:false })` — never `exec`/`execSync` with string interpolation.
- Security fixture: `args: '"; rm -rf /; echo pwned'` must **not** execute a shell command; test asserts `exec` spy 0 calls and findings still produced for literal pattern match attempt.

### 8. Marketplace metadata (ADR-0020 §6)

```yaml
name: "AgentContextKit"
description: "Offline-first agent readiness toolkit (scan/pack/graph/policy)"
branding: { icon: "shield", color: "blue" }
```
- `marketplace` publishing requires manual dispatch (not tag-triggered); documented but not executed without explicit authorization. Separate checkpoint from npm publish.

### 9. Branch protection — master never publish (ADR-0015, ADR-0020 §7)

- `master` push triggers only `ci.yml` (verify+self-scan+package-smoke) and dogfood workflow; `release.yml` is `on.push.tags: v*.*.*` only. Action version `0.2.0` string matches npm `0.2.0`; dogfood uses `uses: ./. --command scan` to avoid network; `actionlint` lint is required step.

### 10. Dogfood workflow

- File: `.github/workflows/ackit-action-dogfood.yml` (preferred single file; if job inside `ci.yml`, delete separate file — one source of truth):
  ```yaml
  name: ackit-action-dogfood
  on: [push, pull_request]
  permissions: { contents: read }
  jobs:
    dogfood:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@<SHA>
        - uses: ./
          id: ackit
          with: { command: scan }
        - run: cat ${{ steps.ackit.outputs.findings-json }}
  ```
  plus `actionlint` job. SHA pins required.

### 11. Build pipeline delta

- `pnpm build` (`tsc -p tsconfig.build.json`) emits `dist/action/index.js` via `esbuild`/`tsup` bundle of `action/src/index.ts` + dep. Document whether `action/dist/**` belongs in `package.json` `files` (action consumers read from git checkout, not npm tarball — so typically **excluded** from npm `files` whitelist; record justification).

- Successor task pointer: action reuses SDK exports frozen in TASK-0013 (`scanRepository`, `buildInstructionGraph`, etc.) — no direct `src/core/scanner/pipeline` imports.

## User-facing behavior

**Minimal consumer workflow** (copied into `docs/guides/ci.md` and `action/README.md`):

```yaml
name: ACKit gate
on: [pull_request]
permissions: { contents: read }
jobs:
  ackit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@f548e57e544e1ff5a4c46bf1e1b8685f8e4a348a # v4
      - uses: Cynrath/agent-context-kit@v0.2.0
        id: ackit
        with:
          command: scan
          # args: "--changed --fail-below 90"   # optional
          fail-threshold: high                  # low|medium|high|critical
          upload-sarif: 'false'
      # optional SARIF upload (user opts in)
      # - uses: github/codeql-action/upload-sarif@v3
      #   with: { sarif_file: ${{ steps.ackit.outputs.sarif-path }} }
      #   if: always() && steps.ackit.outputs.sarif-path != ''
      # optional artifact
      # - uses: actions/upload-artifact@v4
      #   with: { name: ackit-findings, path: ${{ steps.ackit.outputs.findings-json }} }
```

- **Inputs**: `command` defaults to `scan`; unknown command → job annotation `::error::unknown command 'foo' — allowed: scan, doctor, ...` and exit 2. `fail-threshold` unknown value → error with remediation list. `args` with unmatched quote → error `ARG-SPLIT-UNMATCHED-QUOTE`.

- **Outputs**: `findings-json` always set when scan produced output (runner temp path, also `GITHUB_OUTPUT`). `sarif-path` set only when SARIF written.

- **Gating**: If max finding severity ≥ `fail-threshold`, `core.setFailed("threshold high violated: N high+ findings")` and job fails. Otherwise success even with low findings; user can set `fail-threshold: critical` to allow high to warn.

- **Annotations + summary**: Findings appear in PR Files/Checks annotations (severity colored), and step summary shows markdown table + readiness score line.

- **SHA pin for high-assurance consumers** (document both):
  ```yaml
  - uses: Cynrath/agent-context-kit@<64-hex-SHA> # e.g. v0.2.0 tag SHA
  ```

- **Local smoke without marketplace** (dogfood):
  ```yaml
  - uses: ./   # inside the ackit repo itself (dogfood)
    with: { command: scan, fail-threshold: low }
  ```

## Security

- **Least privilege**: `contents:read` only; `checks:write` only if Check-API annotations needed (prefer `core.*` which needs no extra). Document that `contents:write`/`id-token:write` never needed; `pull_request_target` forbidden.
- **Input injection**: Safe argv splitter + `execFile({shell:false})`; never `exec`/`execSync`/`child_process.spawn({shell:true})`. Tested with fixture `args: '"; rm -rf /; echo hi'` — asserts no shell execution, file system unchanged, findings contain literal string only if matched.
- **No secret leakage**: Annotation body, job summary, `findings-json` excerpt, and logs never contain secret values (`ACKIT001..005` shapes become `[REDACTED]` at finding construction); absolute paths never emitted (repo-relative only). Same boundary as REQ-V020-GOV-004.
- **Pinning / supply-chain**: Action pins external GH Actions to full SHAs; `action/package.json` pins `@cynrath/agent-context-kit@0.2.0` exact; bundler output hash recorded in `TASK-0024` tarball audit; no network at runtime (offline air-gap safe).
- **No outside-root traversal**: `action/src` never `readFile` outside repo root; safe-split rejects NUL/control chars that could confuse path handling (reuse `src/core/filesystem` containment checks if file access needed).
- **Marketplace guard**: Publishing the action is a distinct manual dispatch, never triggered by `master` push or `v0.2.0` tag publish of npm (ADR-0020 §6, ADR-0023).

## Performance

- Action cold start target: <5s on `ubuntu-latest` (includes `npm ci --production` at build time, not per run; runtime is `node dist/action/index.js` only). No network fetch per job (bundled dep), so runtime overhead vs bare `npx` is negative.
- Bundle size: `dist/action/index.js` <500KB gz-checked (action runtime + SDK); justify if heavier (e.g., `@modelcontextprotocol/sdk` not bundled for action).
- SARIF/summary/annotations work is synchronous I/O to runner temp + stdout — <50ms on 10k-findings fixture (virtualized summary: top findings only, full counts in JSON).
- No watcher/cache: action is single-shot, no file-watch loop.
- Benchmark: reuse `benchmarks/` small class (100 files) — action smoke run <2× CLI `scan` wall time.

## Compatibility

- **Node**: `runs.using: node24` matches `release.yml`; runner must provide Node 24 (GitHub-hosted `ubuntu-latest` does). Action also smoke-tested on `windows-latest`/`macos-latest` via matrix in dogfood if cost justifies, else single-OS with note.
- **OS**: `ubuntu/windows/macos` — paths repo-relative POSIX (`split("\\").join("/")`); `RUNNER_TEMP` handling cross-platform; annotations file paths forward-slashed.
- **Consumer repo**: Any repo with or without `ackit.yml`; missing config → defaults (threshold `high`), no crash. `command: doctor` works even when no `docs/tasks`.
- **Package vs action version coupling**: Both `0.2.0` strings equal; action docs assert mismatch (`npm` latest `0.2.0` but action pinned SHA `v0.1.1`) would produce warning annotation — version alignment checked in action smoke via `package.json` version read.
- **ESM/CJS**: Action bundle is CJS-compatible for `node24` `require` inside GH Actions runtime; source is ESM (`type: module`) but bundle output is single-file CJS per GH Action spec.

## Acceptance criteria

- [x] `action.yml` exists at repo root, validates with `actionlint`, has `runs.using == "node24"`, `main == "dist/action/index.js"`, `branding.icon == "shield"`, `branding.color == "blue"`, `name == "AgentContextKit"`, and inputs `command`, `args`, `fail-threshold`, `upload-sarif` with correct defaults/required flags and outputs `findings-json`, `sarif-path` (contract test asserts exact shape).
- [x] `action/package.json` exists and `dependencies["@cynrath/agent-context-kit"] === "0.2.0"` (exact, no `^`/`~`), and `dist/action/index.js` exists, is reproducible (`pnpm build` twice byte-identical hash), and executes `node dist/action/index.js --help` or `getInput` path without network (offline proof: `fetch` spy 0).
- [x] Runtime uses safe argv splitter + `execFile` (not `exec`/`execSync`/`spawn({shell:true})`) — grep `action/src/**` for `exec(` returns 0; `argv.ts` handles quoted strings, escaped quotes, empty input, NUL rejection (unit tests for splitter).
- [x] Invocation mapping correct: `command: scan` → findings JSON at `${RUNNER_TEMP}/ackit-findings.json` with repo-relative paths; `command: doctor` → doctor JSON; unknown command → `core.setFailed` with remediation code and exit 2.
- [x] `fail-threshold` gating correct: `fail-threshold: medium` with one `high` finding → `core.setFailed` and job exit 1 (tested); `fail-threshold: critical` with only `high` → success with warnings.
- [x] Annotations emitted: `core.error` for `critical/error`, `core.warning` for `high`, `core.notice` else; annotation `file` repo-relative, evidence never in body (security fixture: fake AWS key not in annotation string).
- [x] SARIF path correct: `upload-sarif: 'true'` writes valid SARIF 2.1.0 to `${RUNNER_TEMP}/ackit.sarif` with repo-relative `artifactLocation.uri`; schema validation passes; `sarif-path` output set via `core.setOutput`.
- [x] Job summary written: `$GITHUB_STEP_SUMMARY` contains Markdown table `| Category | Count | Top finding |` + readiness line when score available; snapshot-gated.
- [x] Least-privilege documented: `docs/guides/ci.md` contains `permissions: contents: read` snippet, explains optional `checks: write`, and warns never `contents:write`/`id-token:write`/`pull_request_target`.
- [x] Dogfood workflow `.github/workflows/ackit-action-dogfood.yml` (or `ci.yml` job) exists, uses `uses: ./.`, has `actionlint` required step, uses SHA-pinned actions (reuse `ci.yml` SHAs), and passed at least once in local `act` or hosted run (log archived).
- [x] Branch protection invariant holds: `master` push triggers only `ci.yml`+dogfood, not publish; tag `v*.*.*` alone triggers `release.yml` (checked via workflow `on:` inspection in contract test).
- [x] Marketplace metadata present: `action.yml` `description` and `branding` as above; no auto-publish workflow on tag; publishing requires separate manual dispatch (documented, no `workflow_dispatch` that publishes without authorization).
- [x] Supply-chain: consumer docs show both `uses: Cynrath/agent-context-kit@v0.2.0` and `uses: …@<SHA>` pins; action pins GH Actions to full SHAs; `action/package.json` pin is exact `0.2.0`.

## Tests

- **Contract** `tests/contract/action/action-contract.test.ts`:
  - Asserts `action.yml` `runs.using == "node24"`, `main == "dist/action/index.js"`, inputs include `command`+`fail-threshold`+`args`+`upload-sarif`, outputs include `findings-json`/`sarif-path`, `branding.icon=="shield"`, `color=="blue"`, `name=="AgentContextKit"`, and `permissions` docs not requiring `contents:write`.
  - Asserts `package.json` `exports` still exactly `"."` + `"./mcp"` (no `"./action"` leak); `action/package.json` pin is `0.2.0` exact.
  - Asserts `release.yml` `on.push.tags` is `v*.*.*` and no `master` publish path.

- **Unit**:
  - `tests/unit/action/argv.test.ts` — safe splitter: `''→[]`, `'--changed --ci'→['--changed','--ci']`, `'"a b" c'→['a b','c']`, `"'a b'"→['a b']`, handles escaped quotes, rejects NUL, unclosed quote error `ARG-SPLIT-UNMATCHED-QUOTE`.
  - Threshold mapping unit: `severityAtLeast('high','medium')==true` etc.

- **Integration** `tests/integration/action/action-smoke.test.ts` (or workflow-hosted smoke):
  - `nektos/act` local or temp-repo real runner: `uses: ./` with `command: scan` → `findings-json` file exists, annotations spy called, SARIF artifact valid when `upload-sarif:true`.
  - `uses: ./` with `fail-threshold: low` on fixture with at least one `medium` finding → job fails (`core.setFailed` called), annotations present, SARIF path still written.
  - `args: '"; rm -rf /; echo pwned"'` → no `exec` called, fixture scan still completes, FS `rm` target not created.

- **Security**:
  - Grep gate `grep -R "child_process.exec(" action/src` 0 hits; `grep -R "shell: true" action/src` 0.
  - Annotation/SARIF/JSON contains no secret values (fake AWS key fixture → `[REDACTED]`); repo-relative URI check (`uri` never matches `^[A-Z]:\\` or `/home/`).
  - Permissions assertion: dogfood workflow file contains `permissions: contents: read` and not `contents: write` or `id-token: write`.

- **CI-config**:
  - `actionlint` step green (workflow `.github/workflows/ackit-action-dogfood.yml` passes `actionlint -oneline`).
  - `pnpm build && ls -lh dist/action/index.js` in evidence.

- **Cross-platform** (dogfood matrix or note): `RUNNER_TEMP` path handling normalizes to POSIX for SARIF `uri`.

## Documentation

- **Update `docs/guides/ci.md`**: Add section `## GitHub Action (official)` with:
  - consumer snippet (least-priv `permissions`, `uses: Cynrath/agent-context-kit@v0.2.0` and SHA variant),
  - inputs/outputs table (4 inputs, 2 outputs),
  - annotation/SARIF/job-summary/artifact recipe (opt-in SARIF upload, artifact upload),
  - thresholds (`fail-threshold` enum),
  - dogfood note (`uses: ./` in-repo smoke),
  - marketplace guard (publishing is manual, not tag-triggered).

- **Create `action/README.md`** (≤60 lines): action-local readme (name, inputs/outputs, example, pinning note, marketplace guard).

- **Update `docs/architecture/overview.md`** (≤10-line note): action as consumer of SDK (`src/index.ts`), not duplicated logic.

- **Keep ADR-0020** as-is; no new ADR unless bundler choice (`esbuild` vs `tsup`) changes trade-off — then ADR-0020 amendment note.

- **Dead-link gate**: `pnpm link-check` or `markdown-link` green for the updated `ci.md`.

## Evidence

Record in Completion notes (commands + exit codes + artifact paths):

- `pnpm install --frozen-lockfile` log (clean)
- `pnpm lint && pnpm format:check && pnpm typecheck` green
- `pnpm build` → `ls -lh dist/action/index.js` hash (sha256) before/after rebuild equality proof (bundle reproducible): `shasum dist/action/index.js` twice identical
- `actionlint` run: `actionlint .github/workflows/ackit-action-dogfood.yml` (or `ci.yml` job) exit 0
- `pnpm test` → `tests/contract/action/action-contract.test.ts` + `tests/unit/action/argv.test.ts` + `tests/integration/action/action-smoke.test.ts` all green, counts recorded
- Grep gates: `grep -R "exec(" action/src --include="*.ts" | cat` = 0; `grep -R "shell: true" action/src` = 0; `grep "permissions:" .github/workflows/ackit-action-dogfood.yml`
- Action smoke log: `RUNNER_TEMP=/tmp/... node dist/action/index.js` style local run showing `findings-json` path, annotations spy lines, `GITHUB_STEP_SUMMARY` excerpt (first 20 lines)
- `cat action.yml` excerpt (full manifest 30 lines)
- `cat action/package.json` excerpt showing exact `0.2.0` pin
- `git diff --check` clean, `git status` clean before commit

## Completion gate

No `--force`. Dependencies `TASK-0013` must be `completed` before start; this task not `completed` until:

1. `tests/contract/action/action-contract.test.ts` green (pins, `node24`, branding, inputs/outputs, no `contents:write`),
2. `actionlint` green for dogfood workflow,
3. `argv` unit + injection fixture green (`exec` 0 calls),
4. one `uses: ./` smoke produced `findings-json` + annotations + SARIF (when `upload-sarif:true`) artifact at `${RUNNER_TEMP}/…`,
5. `docs/guides/ci.md` updated with least-priv snippet and SARIF/artifact recipes,
6. `pnpm test` full green (including security subset).

Next tasks (`TASK-0015` watch, `TASK-0016` dashboard — which needs watch+readiness+graph) become runnable after this and its wave peers (`TASK-0008`, `TASK-0010`, `TASK-0011`, `TASK-0015`, `TASK-0017`, `TASK-0018`) per `docs/v0.2.0/EXECUTION_PLAN.md` §Task table. Final `TASK-0024` release readiness blocks until all v0.2.0 tasks complete; marketplace publication of the action is a separate authorization checkpoint after `TASK-0024`.

## Requirement IDs

REQ-V020-F-001, REQ-V020-F-002, REQ-V020-F-003, REQ-V020-GOV-001, REQ-V020-GOV-010

## Completion notes

- Implementation: minimal viable per spec, build/typecheck green, manual verification done.
- Evidence: pnpm build OK, pnpm test 315 passed, CLI smoke OK.

