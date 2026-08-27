---
id: "TASK-0021"
title: "Cross-cutting security hardening"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0008
  - TASK-0009
  - TASK-0010
  - TASK-0011
  - TASK-0012
  - TASK-0014
  - TASK-0015
  - TASK-0016
  - TASK-0017
  - TASK-0018
  - TASK-0019
  - TASK-0020
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Harden every new v0.2.0 attack surface introduced in EPICs A–K under a single cross-cutting gate. Extends the existing `docs/security/THREAT_MODEL.md` T1–T15 and `docs/security/SECURITY_MODEL.md` with the v0.2.0 delta T16–T20 per ADR-0024, and proves each control with a dedicated regression fixture + automated grep/CI gate. This is the sole security-review checkpoint before docs/integration/release work may proceed.

Requirement IDs: REQ-V020-L-001, REQ-V020-L-002
ADR: ADR-0024 (Cross-Cutting Security Hardening — Dashboard, Rule Packs, Action, Diagnostics)
EPIC: L

## Context / current state

**Baseline that already exists (0.1.1 / vNext):**

- `docs/security/THREAT_MODEL.md` enumerates T1–T15 with mitigations and regression coverage:
  T1 prompt poisoning, T2 malicious links, T3 exfiltration, T4 skill/policy poisoning, T5 unsafe scripts (never executed), T6 plugin risk (no JS plugin), T7 supply chain (minimal deps, frozen lockfile, SHA pins), T8 path traversal/root escape (`normalize→realpath→containment`, `FS-PATH-ESCAPES-ROOT`), T9 secret leakage (redaction at construction), T10 terminal/ANSI injection (sanitized diagnostics), T11 resource exhaustion (engine limits), T12 symlink/junction cycles (`FS-CYCLE-SKIPPED`), T13 malformed inputs, T14 malicious globs, T15 dangerous MCP writes (read-only tools).
- `docs/security/SECURITY_MODEL.md` establishes trust boundaries: repo content untrusted, filesystem engine is the only door (`src/core/filesystem`), network does not exist (offline-first per ADR-0003), generated artifacts are outputs never inputs, exit code 4 for security-boundary refusals.
- Filesystem containment: `src/core/filesystem/engine.ts` implements requested→normalized→canonical path vs canonical repo root + `realpath` + `isInsideRoot`; outside-target denied; cyclic handling deterministic.
- Secret redaction: `src/core/scanner/rules` + `src/core/context/pack.ts` secret gate runs before any reporter; findings/JSON/SARIF/HTML never contain raw values; baseline/cache store structural fields only.
- SARIF/MCP read-only: SARIF 2.1.0 valid, repo-relative URIs; MCP exposes read-only tools only (`scan`, `doctor`, `pack`, `instructions`, `skills`, `tasks`, `policy check`); write tools gated behind capability.
- CI SHA pins: `.github/workflows/ci.yml` pins `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` to immutable full commit SHAs with human-readable version comment; `release.yml` is tags-only `v*.*.*`.
- Policy containment: `src/core/policy/{types,resolve}.ts` resolves extends offline only; remote URL auto-fetch forbidden; `npm:` extends via pre-installed packages only.
- Diagnostics ancestor: `ackit diagnostics` / `bundle` exists as concept but v0.2.0 implementation (TASK-0017) adds sanitized bundle with secret/path scrub and deterministic manifest.

**New surfaces that lack hardening before this task (why this task exists):**

- Dashboard/report server (`src/core/reporting/serve.ts`, `src/core/dashboard/*`, `src/dashboard/ui/*` from TASK-0016) — new localhost HTTP server + live HTML UI that renders finding evidence, file names, and API JSON.
- Declarative rule packs (`src/core/policy/packs/*`, `schemas/rule-pack.schema.json` from TASK-0012) — user-controlled globs/regex/YAML evaluated against repo.
- GitHub Action (`action.yml`, `action/src/*` from TASK-0014) — parses `args`/`inputs` and spawns the CLI; annotation/SARIF handling.
- Public SDK (`src/index.ts` from TASK-0013) — library embedding risk: `process.exit` leak, absolute path leak, network fetch.
- VS Code extension (`extensions/vscode/*` from TASK-0019/0020) — activation-time code, extension host boundary, marketplace packaging, telemetry prohibition.
- Diagnostics bundle (`src/cli/commands/diagnostics.ts`, `src/core/diagnostics/*` from TASK-0017) — zipped bundle that must redact secrets/paths.
- Generic hardening accumulation: YAML/JSON parser limits, memory/size limits, shell injection, archive/VSIX auditing, dependency review, malicious glob/repo content, ReDoS.

This task does not re-implement those features; it audits, hardens, proves, and gates them. It is the last defense before TASK-0022 (docs), TASK-0023 (integration matrix), TASK-0024 (release).

## Goal

One concrete outcome: every v0.2.0 surface has a bounded, tested control; the threat model delta T16–T20 is documented; the automated security gate (`scripts/check-security-boundaries.mjs` + `tests/security/v020-*.test.ts` + CI matrix) is green on all 6 legs (ubuntu/windows/macos × node22/24); no new surface can regress undetected.

## In scope

- Extend `docs/security/THREAT_MODEL.md` with v0.2.0 delta section T16 dashboard/report server, T17 rule packs, T18 GitHub Action input injection, T19 diagnostics/bundle, T20 VS Code extension, each mapping to controls + fixtures.
- Update `docs/security/SECURITY_MODEL.md` with localhost-only + security headers + redaction points + no-telemetry restatement for dashboard/diagnostics/VS Code.
- Harden and verify all surfaces listed in REQ-V020-L-001:
  dashboard/report server (XSS, localhost binding, headers, redaction), rule packs (traversal, ReDoS, size limits, no exec), GitHub Action (pinning, permissions, input injection), SDK (no `process.exit`, no path leak), VS Code extension (no telemetry, no remote AI, safe activation, host boundary, VSIX audit), diagnostics (sanitization + manifest), plus generic: path traversal, symlinks, malicious globs, malicious repo content, ReDoS, YAML/JSON parser limits, memory/size limits, shell/command injection, action input injection, archive/tarball/VSIX contents audit, dependency/supply-chain review, action pinning, localhost binding/security headers.
- Create/verify `scripts/check-security-boundaries.mjs` (grep gate) and `scripts/audit-package.mjs` / `scripts/audit-vsix.mjs` checks if not already present.
- Create/verify `tests/security/v020-*.test.ts` fixtures per surface (T16–T20) + `tests/security/secrets.test.ts` fake-secret sanitization proof.
- Run full security suite on all 6 CI legs and record evidence.
- No new runtime dependency without justification; no network fetch introduced.

## Out of scope

- Feature implementation for dashboard/rule packs/Action/SDK/VS Code/diagnostics/benchmarks themselves (owned by TASK-0008–0020). This task audits/hardens/gates them; any missing control fix is a small, focused remediation commit revertable independently.
- Changing product behavior, CLI flags, output schemas, or docs beyond security hardening notes.
- Adding network calls, telemetry, LLM APIs, vector DB, RAG, plugin execution, cloud services (REQ-V020-GOV-009 violation).
- `package.json` version bump (stays `0.1.1` until TASK-0024), tag creation, `npm publish`, `vsce publish`, `workflow_dispatch`, force-push, history rewrite.
- Adding heavy frameworks or new deps to satisfy a control (controls use zod, picomatch, yaml, node:zlib, esbuild — already justified).
- Stale v1 doc edits beyond the security docs delta.

## Technical design

### Files to touch (expected)

```
docs/security/THREAT_MODEL.md          # add v0.2.0 delta T16–T20 → controls table
docs/security/SECURITY_MODEL.md        # note localhost-only + headers + redaction points
scripts/check-security-boundaries.mjs  # grep forbids child_process.exec / eval / Function / require(userInput) / fetch in src
scripts/audit-package.mjs              # npm pack --dry-run whitelist + secret scan
scripts/audit-vsix.mjs                 # vsce ls / vsix whitelist audit
tests/security/v020-path-traversal.test.ts
tests/security/v020-redos.test.ts
tests/security/v020-dashboard.test.ts
tests/security/v020-rule-pack.test.ts
tests/security/v020-action.test.ts
tests/security/v020-diagnostics-redaction.test.ts
tests/security/v020-sdk.test.ts
tests/security/v020-vscode.test.ts
tests/security/secrets.test.ts         # fake-secret sanitization proof (if not already)
src/core/reporting/serve.ts            # harden headers, binding, redaction, XSS escape if needed
src/core/policy/packs/*               # clamp limits, zod strict, ReDoS guard if needed
src/core/diagnostics/*                # scrub + manifest determinism if needed
src/api/* / src/index.ts              # assert no process.exit path if needed
extensions/vscode/**                  # audit packaging + activation if needed
.github/workflows/ci.yml              # ensure security tests run on all 6 legs
benchmarks/security/redos-sentinel.txt # sentinel for ReDoS timing if needed
```

No new top-level `docs/` sprawl; edits stay in the two security docs plus scripts/tests.

### Controls per surface (normative, each has a regression fixture)

#### 1. Dashboard / report server (T16)

- **Binding:** default `127.0.0.1` only. Non-loopback (`0.0.0.0`, external IP) requires explicit `--allow-nonlocal` (CLI flag). Without flag → exit 2 with diagnostic `SRV-NONLOCAL-REFUSED`. Integration test probes `host: 0.0.0.0` without flag → exit 2; `::1` treated as loopback variant and allowed; `127.0.0.1` is canonical.
- **Security headers on every response:**
  ```
  Content-Security-Policy: default-src 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Cache-Control: no-store   # for /api/* JSON; no-store + no-cache for HTML
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  ```
  Verified by HTTP assertion against live server in integration test.
- **XSS:** every rendering path uses `textContent` or escaped interpolation (`escapeHtml` via DOM method / template literal escaping for line-break). Never `innerHTML` with user/evidence data. Fixture injects `<script>alert(1)</script>` as file name and as finding message → HTML source shows `&lt;script&gt;alert(1)&lt;/script&gt;` and API JSON shows raw but escaped on render; no execution.
- **Redaction:** `/api/*` runs the same secret gate (`PACK_SECRET_GATE_RULES` / `src/core/context/pack.ts` gate) before JSON serialization; absolute paths like `/home/...`, `C:\Users\...`, `/Users/...` replaced with `<local-path>`; evidence excerpts truncated at 500 chars.
- **Size/paging:** API responses page at `limit=100` (query param); `src/core/reporting/serve.ts` enforces `maxTotalBytes` from engine limits; large-repo UI virtualizes findings table.
- **Implementation notes:** reuse `src/core/filesystem/engine.ts` for any file read backing the API; `open` browser flag uses sanitized `spawn` with `shell: false` and allow-listed opener (`open`/`xdg-open`/`start`).

#### 2. Rule packs / policy packs (T17)

- **Filesystem & paths:** every path from `policy.rulePacks`, `extends`, diagnostics `bundle` accepted only after `normalizeRelativePath → join(canonicalRoot) → realpath → isInsideRoot` check. `..` outside-root → `FS-PATH-ESCAPES-ROOT` diagnostic; `tests/security/v020-path-traversal.test.ts` feeds `../../etc/passwd` and `policy.rulePacks: ["../../../tmp/evil.yml"]`.
- **Globs & regex (ReDoS):**
  - Globs compiled via `picomatch` only; user globs validated by `zod` before filesystem use; limits: `maxGlobLen 500`, `maxRules 200`, `maxPatternLen 500`, `maxFileBytes 512KB` per pack file.
  - Regex length/pile-up capped; any pattern >50ms on sentinel `benchmarks/security/redos-sentinel.txt` is rejected with `POL-PACK-REDOS` (never evaluated). Fixture `tests/security/v020-redos.test.ts` feeds catastrophic backtracking payload `(a+)+$` and asserts evaluate <100ms or rejected.
- **YAML/JSON parser limits:**
  - `yaml` parser guarded: max file 512KB, max depth 20, max alias count 50 (billion-laughs guard), `zod` strict schemas (unknown keys rejected). Binary YAML tags (`!!js/function`, `!!binary`) rejected. Malformed YAML produces `ACKITCFG00x` / `POL-PACK-LIMIT-*` diagnostics, never uncaught throw/crash.
- **No exec:** patterns are `string` regex + glob only; no `eval`, no `new Function`, no `vm.runInNewContext`. `scripts/check-security-boundaries.mjs` forbids `eval(`, `Function(` in `src/`; rule-pack evaluator is pure `evaluatePack(pack, repoFiles) → findings`.
- **Memory/size:** same engine limits (`maxFiles`, `maxFileBytes`, `maxTotalBytes`, `maxDepth`) enforced for pack assembly; archive extraction caps total unpacked bytes at 10× compressed size.

#### 3. GitHub Action (T18)

- **`action.yml` pinning:** `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` pinned to full SHAs (reuse `.github/workflows/ci.yml` pins). No floating tags for security-critical steps. Verified by `actionlint` + SHA regex in `scripts/check-security-boundaries.mjs`.
- **`args` input injection:** `args` splitter is `shell-quote`-less: bounded `argv` tokenization (quote-aware, no env expansion); final spawn uses `spawnFile`/`execFile` never `exec`. Injection string `"; rm -rf /"` or `"$(whoami)"` is passed literally and fails as unknown flag, never executed. Test: invoke action entry with `args: 'scan --json; rm -rf /'` → assertion that `execFile` argv contains the literal semicolon segment.
- **Annotations/SARIF:** artifact SARIF `uses: github/codeql-action/upload-sarif@v3` step is user opt-in; action itself never calls code-scanning APIs without explicit `upload-sarif: 'true'`. SARIF `uri` fields are repo-relative; traversal in SARIF `artifactLocation.uri` rejected by same `isInsideRoot`.
- **Permissions:** workflow `permissions:` documented as `contents: read` (default), `checks: write` only when Check annotations desired; `pull-requests: write` never required. Dogfood workflow asserts least-privilege.
- **Supply chain:** action pins `@cynrath/agent-context-kit` to exact `0.2.0` (no `^`); provenance via OIDC retained.

#### 4. SDK (public API boundary)

- **No `process.exit`:** SDK (`src/index.ts`, `src/api/*`, `src/core/**` when called via SDK) never calls `process.exit`; CLI layer owns termination. Grep gate forbids `process.exit(` in `src/api` + `src/core`. Integration test: call `scanRepository` in-process and assert `process.exitCode` unchanged.
- **No path/secret leak:** `Finding`, `ScanResult`, `ScanDiagnostic`, `PackResult` emit only repo-relative `relativePath`; absolute paths replaced with `<local-path>`; secrets redacted at construction. Re-run `tests/security/secrets/*` and assert no `/home/`, `C:\Users\`, AWS key pattern, or `ghp_` in SDK JSON output.
- **No network:** `fetch(` forbidden in `src/` (only `action/` may fetch if ADR-0020 justifies, scoped). `scripts/check-security-boundaries.mjs` enforces.
- **Errors typed:** SDK throws `AckitError` with `code` + `remediation`, never raw strings; `AbortSignal` cancellable within 200ms.

#### 5. VS Code extension (T20)

- **No telemetry, no remote AI, no net fetch:** extension manifest declares no `enableTelemetry`; runtime never calls `fetch`/`https.request`; activation registers providers only. Grep: `fetch(` in `extensions/vscode/src` → 0.
- **Activation host boundary:** `package.json` `activationEvents: ["onStartupFinished"]`, `enableProposedApi: false`; extension host boundary guarantees path containment — workspace root is the only root via SDK (`src/index.ts` reused, not subprocess by default; if subprocess chosen, ADR-0021 justification recorded and args sanitized via `spawnFile`).
- **Bundled `dist/extension.js` is ESBuild'd** and emitted sources contain no `eval`, `exec`, `require(remoteInput)`. Verified by `scripts/check-security-boundaries.mjs` scanning `extensions/vscode/dist` + `src`.
- **VSIX whitelist audit:** only `extension/**` (= `dist/extension.js`), `package.json`, `images/**`, `LICENSE`, `README.md`, `CHANGELOG.md` — check `scripts/audit-vsix.mjs` (or `vsce ls`) fails if `node_modules` sneaks in. Size <2MB. `publisher: cynrath`, version mirrors core `0.2.0`.
- **Redaction in UI:** Problems diagnostics (`DiagnosticCollection` with `ACKITxxx` codes) render redacted evidence; no secret value in `Diagnostic.message`.

#### 6. Diagnostics / bundle (T19)

- **Redaction:** `ackit diagnostics bundle` runs `PACK_SECRET_GATE_RULES` + path-scrub over every included file; test asserts 5 known secret shapes (AWS key `AKIA...`, GitHub PAT `ghp_`, private key block `-----BEGIN PRIVATE KEY-----`, connection string `postgres://user:pass@`, generic credential `api_key=`) all become `[REDACTED]`.
- **Path scrub:** absolute paths (`/home/user`, `C:\Users\user`, `/Users/user`) replaced with `<local-path>` or repo-relative; env vars never included.
- **Determinism:** bundle zipped via `node:zlib` with deterministic ordering (sorted file names, fixed mtime `1980-01-01`), manifest `bundle-manifest.json` with `{ path, sha256, redactedCount }`, validated by `tests/security/diagnostics-redaction.test.ts` + `bundle-manifest` snapshot.
- **Zip-slip guard:** extraction test asserts `isInsideRoot` on every zip entry; `../` entry rejected.

#### 7. Generic hardening (applies to all surfaces)

- **Path traversal & symlinks:** every consumer uses `src/core/filesystem/engine.ts`; tests cover outside-root symlink, Windows junction/reparse, cyclic link (`tests/security/v020-path-traversal.test.ts`), `../../` traversal, deep-loop; `realpath` before containment on every `readFile`/`readdir`.
- **Malicious globs:** user globs via `picomatch` + `zod` validation; `maxGlobLen 500`; oversized glob → `ACKITCFG` diagnostic, never evaluated.
- **Malicious repo content (poisoned instructions):** repo content untrusted; hidden Unicode controls, zero-width obfuscation, suspicious external refs, root-escape refs flagged as advisories without fetching.
- **ReDoS:** capped pattern length + sentinel timing guard (50ms) + rejection `POL-PACK-REDOS`; catastrophic payload test <100ms.
- **YAML/JSON parser limits:** max file 512KB, max depth 20, max alias 50, strict zod schemas, binary tags rejected, unknown keys rejected; malformed input → diagnostic, not crash.
- **Memory/size:** `maxFiles`, `maxFileBytes` (default 2MB), `maxTotalBytes` (default 50MB), `maxDepth` enforced; API pagination `limit=100`; archive extraction cap 10×.
- **Shell/command injection:** no `child_process.exec(` with user content; only `spawnFile`/`execFile` with explicit `argv` array and `shell: false`; `open` browser helper sanitizes args. Grep gate forbids `child_process.exec(` in `src/` + `extensions/`.
- **Archive/VSIX audit:** `scripts/audit-package.mjs` checks `npm pack --dry-run` file list against whitelist; secrets scan asserts tarball contains no AWS/GH/PAT-like value; VSIX audit mirrors.
- **Dependency/supply-chain review:** minimal dep set (commander, zod, yaml, picomatch, ignore, @modelcontextprotocol/sdk, esbuild for VS Code); each justified in ADR-0015; lockfile frozen; `pnpm audit` informational; `npm audit` not blocking but recorded.
- **Action pinning:** all Actions pinned to SHAs in both `ci.yml` and `action.yml`.
- **Localhost headers:** CSP + nosniff + no-store + DENY on dashboard (above).

### Global gates

```js
// scripts/check-security-boundaries.mjs (normative)
const FORBIDDEN = [
  /child_process\.exec\s*\(/,        // allow execFile/spawnFile only
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /require\s*\(\s*userInput/,
  /require\s*\(\s*process\.env/,
  /\bfetch\s*\(/,                    // forbidden in src/ (action/ scoped exception)
];
// Scans src/**/*.ts, extensions/vscode/src/**/*.ts, src/**/*.js
// Exits 1 on match, 0 otherwise. Contract-tested.
// Also checks: actions/checkout|setup-node|pnpm/action-setup are SHA-pinned (40 hex chars)
```

- `tests/security/*` runs on all 6 CI legs (ubuntu/windows/macos × node22/24). Windows-only path test covers drive-letter (`C:\`) handling and case-insensitivity.
- `docs/security/THREAT_MODEL.md` delta and `docs/security/SECURITY_MODEL.md` notes are the durable audit trail.

## User-facing behavior

**No visible behavior change.** This is a hardening gate; all user-facing commands retain their existing contracts:

- `ackit scan`, `ackit doctor`, `ackit optimize`, `ackit pack`, `ackit instructions`, `ackit report serve` / `ackit dashboard`, `ackit diagnostics bundle`, `ackit --help`, MCP tools, GitHub Action inputs, SDK imports — none change output shape, flag names, or exit codes beyond security diagnostics (`POL-PACK-REDOS`, `FS-PATH-ESCAPES-ROOT`, `SRV-NONLOCAL-REFUSED` etc. already specified by owning tasks).
- `ackit diagnostics bundle` remains sanitized: users see `[REDACTED]` and `<local-path>` placeholders; re-verification via `ackit diagnostics bundle --redact-check` can be offered but is not required to break the contract.
- `ackit optimize --explain` remains safe: provenance fields are still deterministic and redacted; no new PII.
- Dashboard remains localhost-only by default; requiring `--allow-nonlocal` for external binding is an explicit opt-in already described in TASK-0016 — this task verifies the guard, not changes the flag.
- Errors remain stable: YAML/JSON malformations emit `ACKITCFG00x` / `POL-PACK-LIMIT-*` diagnostics with `file:line` and `remediation`, never raw stacks.

## Security

### Threat model delta (T16–T20 beyond T1–T15)

| ID | Surface | Threat | Control | Fixture |
|---|---|---|---|---|
| T16 | Dashboard/report server | XSS via finding evidence in HTML; localhost binding bypass; missing security headers; secret leakage via `/api/*` | CSP/nosniff/no-store/DENY headers; `textContent`/escaped interpolation; `127.0.0.1` default + `--allow-nonlocal` gate; secret gate + path scrub; pagination | `tests/security/v020-dashboard.test.ts` |
| T17 | Rule packs | Path traversal via `glob`/`rulePacks` paths; ReDoS via malicious regex; CPU/memory DoS via large packs; YAML bomb; disguised exec code in `pattern` | `normalize→realpath→isInsideRoot`; picomatch+zod+limits (500/200/500); 50ms sentinel → `POL-PACK-REDOS`; YAML depth 20 / alias 50 / 512KB; no eval/Function/vm | `tests/security/v020-path-traversal.test.ts`, `v020-redos.test.ts`, `v020-rule-pack.test.ts` |
| T18 | GitHub Action | `args` shell interpolation; unsanitized annotation bodies; SARIF URI traversal; unpinned Actions | SHA pins; bounded argv tokenization + `spawnFile` never `exec`; SARIF URI containment; least-privilege `permissions` | `tests/security/v020-action.test.ts` |
| T19 | Diagnostics/bundle | Secret/path leakage; bundle manifest integrity; zip-slip | `PACK_SECRET_GATE_RULES` + path scrub over every file; deterministic zip (sorted, fixed mtime) + `bundle-manifest.json` `{path,sha256,redactedCount}`; `isInsideRoot` on zip entries | `tests/security/diagnostics-redaction.test.ts` |
| T20 | VS Code extension | Activation-time code exec outside host; untrusted workspace discovery; marketplace package pollution; telemetry | `onStartupFinished` lightweight; host boundary (workspace root only via SDK); VSIX whitelist audit; no telemetry/fetch | `tests/security/v020-vscode.test.ts` |

All T16–T20 map to REQ-V020-L-001; automated gates map to REQ-V020-L-002.

### Per-surface fixtures (must exist and be green)

- `tests/security/v020-path-traversal.test.ts` — `../../` + symlink/junction/reparse/cyclic/drive-letter fixtures assert `FS-PATH-ESCAPES-ROOT`.
- `tests/security/v020-redos.test.ts` — catastrophic backtracking payload asserts <100ms or `POL-PACK-REDOS`.
- `tests/security/v020-dashboard.test.ts` — XSS payload (`<script>`, `<img onerror>`) rendered escaped; headers asserted; `0.0.0.0` without flag → exit 2; `::1` allowed; `/api/*` redacted.
- `tests/security/v020-rule-pack.test.ts` — oversize pack (>200 rules / >500 pattern) → `POL-PACK-LIMIT-*`; outside-root pack path → `FS-PATH-ESCAPES-ROOT`; YAML bomb → diagnostic not crash.
- `tests/security/v020-action.test.ts` — `"; rm -rf /"` literal; `$(whoami)` literal; SHA pin regex; `permissions:` doc assertion; SARIF URI traversal.
- `tests/security/diagnostics-redaction.test.ts` — 5 secret shapes redacted; home path absent; manifest deterministic.
- `tests/security/v020-sdk.test.ts` — no `process.exit` after `scanRepository`; no absolute path in SDK JSON; `fetch` absent.
- `tests/security/v020-vscode.test.ts` — VSIX whitelist; no `eval`/`exec` in `dist/extension.js`; `activationEvents` + `enableProposedApi`; no fetch.

### Fake-secret sanitization proof

`tests/security/secrets.test.ts` (or equivalent `tests/security/v020-diagnostics-redaction.test.ts` extension) constructs a fixture repo containing:

```
AWS_KEY=AKIAIOSFODNN7EXAMPLE
GITHUB_PAT=ghp_1234567890abcdefghij1234567890abcdef1234
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE..."
CONN_STR=postgres://user:s3cr3t@db.example.com:5432/app
API_KEY=api_key=sk-live-abc123...
HOME_HINT=/home/developer/secrets.txt and C:\Users\developer\.aws\credentials
```

Asserts: every report/JSON/SARIF/HTML/API response/bundle file contains `[REDACTED]` (or `<local-path>`) and zero occurrences of the raw values; tarball/VSIX audit asserts same for packed artifacts.

## Performance

- No new benchmark: this task must not regress the performance baselines established in TASK-0018.
- ReDoS sentinel adds ≤50ms per pattern evaluation worst-case (rejected fast); normal patterns evaluate <1ms.
- Dashboard headers add zero measurable latency; pagination keeps API <100ms for >10k findings.
- Grep gate runs in <500ms even on full `src/` tree.
- If any control makes a hot path >10% slower (e.g., YAML depth guard), the regression must be documented with benchmark delta in Completion notes and justified via ADR note.

## Compatibility

- Windows / macOS / Linux: every path check uses `path.posix` for repo-relative comparison and `path.join(canonicalRoot, ...split("/"))` for FS join; drive letters (`C:`), backslashes, spaces, Unicode, mixed EOL handled; `realpath` containment verified on Windows CI leg.
- Node 22 + Node 24: `tests/security/*` and `scripts/check-security-boundaries.mjs` must pass on both LTS lines on all three OSes (6-leg matrix).
- v0.1.1 backward compat: no breaking config change; unknown future keys still ignored until TASK-0022 docs; SDK allowlist unchanged.
- Coverage invariants inherited: no new `REQ-*` ID leak into `--help` (REQ-V020-GOV-010), offline-first preserved, `type: module` + `sideEffects:false` unchanged.

## Acceptance criteria

- [ ] `docs/security/THREAT_MODEL.md` contains a `## v0.2.0 delta (T16–T20)` section mapping each of T16 dashboard, T17 rule packs, T18 GitHub Action, T19 diagnostics/bundle, T20 VS Code extension to controls + fixture file paths + ADR-0024 reference; existing T1–T15 rows untouched.
- [ ] `docs/security/SECURITY_MODEL.md` contains a paragraph noting localhost-only default, required security headers (CSP `default-src 'self'`, `object-src 'none'`, `nosniff`, `no-store`, `DENY`), and redaction points (pack/report/SARIF/MCP/API/bundle all scrubbed at construction), with no telemetry restatement.
- [ ] `scripts/check-security-boundaries.mjs` exists, is executable via `node scripts/check-security-boundaries.mjs`, forbids `child_process.exec(`, `eval(`, `Function(`, `require(userInput`, dynamic `fetch(` in `src/` (only `action/` may fetch — scoped exception), checks Action SHA pins, and exits 0 on the current codebase (verified by running it).
- [ ] Dashboard control verified: `tests/security/v020-dashboard.test.ts` (or integration equivalent) proves XSS payload is escaped (HTML source contains `&lt;script&gt;`), all security headers present on every `/` and `/api/*` response, `127.0.0.1` default, `0.0.0.0` without `--allow-nonlocal` → exit 2, `::1` allowed, `/api/*` secret/path redacted.
- [ ] Rule-pack controls verified: `tests/security/v020-rule-pack.test.ts` + `v020-path-traversal.test.ts` + `v020-redos.test.ts` prove traversal denied (`FS-PATH-ESCAPES-ROOT`), oversize pack (>200 rules / >500 pattern / >512KB / depth 20 / alias 50) → `POL-PACK-LIMIT-*`, ReDoS sentinel >50ms → `POL-PACK-REDOS` and <100ms evaluate, no `eval`/`Function`/`vm` execution.
- [ ] GitHub Action control verified: `action.yml` pins `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` to full 40-hex SHAs (reuse `.github/workflows/ci.yml` pins); `tests/security/v020-action.test.ts` proves injection string `"; rm -rf /"` passed literally (argv contains `;`), `spawnFile`/`execFile` used never `exec`, `permissions:` is least-privilege (`contents: read` baseline).
- [ ] SDK control verified: no file in `src/api/**` or `src/core/**` (when called via SDK) contains `process.exit(`; grep `process.exit` in `src/` → 0 outside `src/cli/**`; `tests/security/v020-sdk.test.ts` proves SDK JSON contains zero absolute paths (`/home/`, `C:\Users\`, `/Users/`) and zero raw secret shapes.
- [ ] VS Code control verified: `extensions/vscode/package.json` has `activationEvents: ["onStartupFinished"]`, `enableProposedApi: false`, `publisher: cynrath`, no telemetry; `dist/extension.js` contains zero `eval`/`exec`/`require(remoteInput)`/`fetch(`; `scripts/audit-vsix.mjs` (or `vsce ls`) proves VSIX whitelist is exactly `extension/**` + `package.json` + `images/**` + `LICENSE` + `README.md` + `CHANGELOG.md`, size <2MB.
- [ ] Diagnostics control verified: `tests/security/diagnostics-redaction.test.ts` proves 5 known secret shapes (AWS key, GitHub PAT `ghp_`, private key block, connection string, generic credential) all become `[REDACTED]` in bundle + API; bundle manifest `bundle-manifest.json` is deterministic (sorted names, fixed mtime `1980-01-01`, `{path,sha256,redactedCount}`); zip-slip fixture (`../` entry) rejected.
- [ ] Generic controls verified: `tests/security/v020-path-traversal.test.ts` covers symlink/junction/reparse/cyclic/drive-letter; `pnpm test` includes `tests/security/*` + all `v020-*.test.ts`; `scripts/audit-package.mjs` asserts `npm pack --dry-run` file list whitelisted and contains no secret shape.
- [ ] CI matrix green: `pnpm test` (including all `tests/security/*`) passes on all 6 legs (ubuntu/windows/macos × node22/24) — evidence recorded as local run + CI workflow reference (`.github/workflows/ci.yml` includes security tests on every leg).
- [ ] No `REQ-*`, `ADR-*`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext` strings in public `ackit --help` or MCP human-facing prompts (contract-tested; `tests/contract/cli-help.test.ts` passes).
- [ ] `pnpm lint` + `pnpm format:check` + `pnpm typecheck` + `pnpm build` all exit 0; `git diff --check` clean; `node dist/cli/index.js doctor` OK; `scan --ci` OK on fixture repos.

## Tests

| Class | File / command | What it proves | Owner |
|---|---|---|---|
| security | `tests/security/v020-path-traversal.test.ts` | traversal/junction/cyclic/drive-letter denied | REQ-V020-L-001 |
| security | `tests/security/v020-redos.test.ts` | catastrophic backtracking <100ms or `POL-PACK-REDOS` | REQ-V020-L-001 |
| security | `tests/security/v020-dashboard.test.ts` | XSS escaped, headers, binding, redaction | REQ-V020-L-001 |
| security | `tests/security/v020-rule-pack.test.ts` | size/yaml/binary-tag/no-exec/bomb | REQ-V020-L-001 |
| security | `tests/security/v020-action.test.ts` | injection literal, SHA pins, permissions, SARIF URI | REQ-V020-L-001 |
| security | `tests/security/diagnostics-redaction.test.ts` | 5 secrets redacted, path scrub, manifest determinism, zip-slip | REQ-V020-L-001 |
| security | `tests/security/v020-sdk.test.ts` | no exit, no path leak, no fetch | REQ-V020-L-001 |
| security | `tests/security/v020-vscode.test.ts` | activation, host boundary, VSIX audit, no telemetry | REQ-V020-L-001 |
| security | `tests/security/secrets.test.ts` | fake-secret sanitization across all reporters + tarball/VSIX | REQ-V020-L-001 |
| unit | `tests/unit/policy/pack-limits.test.ts` | maxRules/maxPatternLen/maxGlobLen/alias-count guard | REQ-V020-L-001 |
| integration | `pnpm test` full suite | all security fixtures + existing 304+ tests green | REQ-V020-L-002 |
| ci-config | `node scripts/check-security-boundaries.mjs` | grep gate exits 0; contract-tested via intentional violation fixture | REQ-V020-L-002 |
| ci-config | `node scripts/audit-package.mjs` + `scripts/audit-vsix.mjs` | whitelist + secret scan on tarball/VSIX | REQ-V020-L-001 |
| contract | `tests/contract/cli-help.test.ts` | no REQ/ADR leak in help | GOV-010 |
| cli-smoke | `node dist/cli/index.js scan --ci` on fixture | threshold gating still works with hardened packs | REQ-V020-L-001 |

Windows-only leg: `v020-path-traversal.test.ts` includes `C:\` + case-insensitive + `\\?\` handling.

## Documentation

- Update: `docs/security/THREAT_MODEL.md` — add `## v0.2.0 delta (T16–T20)` with table `{T16–T20, threat, control, fixture, ADR-0024 §}`; keep T1–T15 verbatim.
- Update: `docs/security/SECURITY_MODEL.md` — add 2–3 sentence note: dashboard loopback-only + headers, rule-pack offline/no-exec, diagnostics redaction points, VS Code no telemetry, supply-chain pins.
- Create/verify: `scripts/check-security-boundaries.mjs` header comment documents forbidden patterns + scoped exception for `action/`.
- Keep: `docs/decisions/ADR-0024-cross-cutting-security-hardening.md` as the durable rationale (no edit unless control changes, then ADR amendment).
- No new guide: per-surface security notes belong to the owning task's guide (e.g., `docs/guides/rule-packs.md` notes limits); this task only proves the gate.

## Evidence

Record in Completion notes (copy-paste exact outputs):

- `git rev-parse HEAD` + `git status --short` (clean) + `git diff --check` (clean)
- `pnpm test` pass counts (files+tests) with `tests/security/v020-*.test.ts` listed, on at least the local OS + note that CI matrix 6/6 is expected (link to `.github/workflows/ci.yml` legs)
- `node scripts/check-security-boundaries.mjs; echo $?` → `0` + grep-forbidden intentional violation run (prove gate would fail)
- `node scripts/audit-package.mjs; echo $?` → `0` + tarball file list excerpt (whitelist) + secret scan `0 matches`
- `node scripts/audit-vsix.mjs` or `vsce ls` output excerpt + size <2MB assertion
- Dashboard header dump (`curl -i http://127.0.0.1:<port>/` → `CSP`, `nosniff`, `no-store`, `DENY` present) + XSS fixture HTML excerpt showing `&lt;script&gt;`
- Binding probe: `ackit report serve --host 0.0.0.0` without flag → exit 2 diagnostic `SRV-NONLOCAL-REFUSED` (or equivalent)
- Rule-pack ReDoS fixture timing (`<100ms`) + `POL-PACK-REDOS` rejection snippet for sentinel >50ms
- Path traversal fixture diagnostic `FS-PATH-ESCAPES-ROOT` excerpt for `../../` payload
- Diagnostics redaction fixture: `grep -c "\[REDACTED\]" ackit-diag.zip` (≥5) and `grep -c "/home/"` → `0`
- Action pin audit: `grep -E "uses: actions/(checkout|setup-node)" action.yml` shows full SHAs
- SDK path-leak check: `grep -E "/home/|C:\\\\Users"` on `scan --json` output → `0`
- `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build` exits 0
- `node dist/cli/index.js doctor` + `scan --ci` on fixture repo exits 0

## Completion gate

No `--force`. This task is not `completed` until every acceptance criterion is checked and evidence recorded; it is the blocking gate for TASK-0022 (docs). The next runnable task after this is `TASK-0022` (documentation/examples/migration) per `docs/v0.2.0/EXECUTION_PLAN.md`.

Dependencies `TASK-0008,0009,0010,0011,0012,0014,0015,0016,0017,0018,0019,0020` must all be `completed` before this task may start. The task verifies their security acceptance criteria rather than re-implementing them — any missing control fix must be a focused remediation commit that preserves `git diff --check` and full test green. Final integration task TASK-0023 will re-run `tests/security/v020-*.test.ts` as part of the required green; TASK-0024 will audit VSIX/tarball contents for leak/size. History: `docs/tasks/archive/` and published tags `v0.1.0/0.1.1` remain immutable.

## Requirement IDs

REQ-V020-L-001, REQ-V020-L-002

## Risks

- ReDoS sentinel tuning risk: 50ms threshold may flake on slow CI runners → mitigate by median-of-3 and relative multiplier, not absolute wall clock, and record variance in Completion notes.
- Windows path handling risk: drive-letter + UNC + junction semantics differ → mitigate by explicit win32 test on windows leg + `path.win32` unit coverage.
- XSS escape false confidence: `innerHTML` may be reintroduced later → mitigate by grep gate forbidding `innerHTML` with evidence variables in `src/dashboard/ui/**`.
- VSIX whitelist drift: new `vsce` defaults may include extra files → mitigate by strict audit script that fails on any file not in whitelist, checked at TASK-0024.

## Rollback plan

Focused commit revert. Each hardening fix is a small, isolated commit (one per surface) so `git revert <sha>` restores the prior behavior without touching unrelated surfaces. Re-running `scripts/check-security-boundaries.mjs` and `pnpm test` after revert confirms rollback.

## Completion notes

(placeholder — to be filled with evidence listed above; must include `THREAT_MODEL.md` diff excerpt + all gate outputs before marking completed)
