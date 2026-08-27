# ADR-0024: Cross-Cutting Security Hardening (Dashboard, Rule Packs, Action, Diagnostics)

Status: Accepted · Date: 2026-08-27

## Context

v0.2.0 adds at least five new attack-surfaces on top of the vNext threat model (T1–T15, `docs/security/THREAT_MODEL.md`): a localhost HTTP server + live UI (dashboard), declarative rule-pack evaluation (patterns/globs/YAML), a GitHub Action (input injection, pinning, supply-chain), the public SDK (path/secret leakage, `process.exit` risk), the VS Code extension (activation, cross-platform, marketplace packaging), diagnostics bundles (redaction, bundle determinism), plus generic path traversal, symlink, malicious glob, malicious repository content, ReDoS, YAML/JSON parser limits, memory/size limits, shell/command injection, action input injection, archive/tarball/VSIX auditing, dependency/supply-chain review, action pinning, localhost binding/security headers. Each EPIC's tasks must carry per-feature security acceptance criteria; this ADR records the hardening patterns applied globally.

## Decision

### 1. Threat-model extension (specifics beyond existing T1–T15)

- **T16 dashboard/report server**: XSS via finding evidence in HTML, localhost binding bypass, security header absence, secret leakage via `/api/*`.
- **T17 rule packs**: path traversal via `glob`/`rulePacks` paths, ReDoS via malicious regex, CPU/memory DoS via large packs, YAML bomb (billion laughs), disguised executable code in `pattern` values.
- **T18 GitHub Action input injection**: `args` shell interpolation, unsanitized annotation bodies, SARIF URI traversal.
- **T19 diagnostics/bundle**: secret/path redaction completeness, bundle manifest integrity, zip-slip on extraction.
- **T20 VS Code extension**: activation-time code execution outside extension host, untrusted workspace discovery, marketplace package contents (extra binaries, leaked source maps).

### 2. Controls (normative, each has a regression fixture)

**Filesystem & paths** (all features):
- Every path from packs/extends/diagnostics accepted only after `normalizeRelativePath → join canonicalRoot → realpath → isInsideRoot` check. `..` outside-root → `FS-PATH-ESCAPES-ROOT`. Verified by `tests/security/v020-path-traversal.test.ts`.

**Globs & regex**:
- Globs compiled via `picomatch` only; user globs validated by `zod` before filesystem use; `maxGlobLen 500`, `maxRules 200`, `maxPatternLen 500`. Regex length/pile-up capped; any pattern >50ms on sentinel `benchmarks/security/redos-sentinel.txt` is rejected with `POL-PACK-REDOS` (not evaluated).
- Fixture `tests/security/v020-redos.test.ts` feeds a catastrophic backtracking payload and asserts <100ms evaluate.

**YAML/JSON parser limits**:
- `yaml` parser call guarded: max file 512KB, max depth 20, max alias count 50 (YAML 1.2 billion-laughs guard), `zod` strict schemas (unknown keys rejected). Malformed YAML produces `ACKITCFG00x`/`POL-PACK-LIMIT-*` diagnostics, never throw state crash. Binary YAML tags rejected.

**Memory/size**:
- Same engine limits as FS (`maxFiles`, `maxFileBytes`, `maxTotalBytes`, `maxDepth`) enforced for dashboard payload and bundle assembly; API responses page at `limit=100`; archive extraction caps total unpacked bytes at 10× original.

**Dashboard specifics**:
- Default bind `127.0.0.1` only; non-loopback requires `--allow-nonlocal` (CLI) → exit 2 otherwise; integration test probes `host: 0.0.0.0` without flag and `::1` as loopback variant.
- Security headers on all responses: `Content-Security-Policy: default-src 'self'; object-src 'none'`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` (API), `X-Frame-Options: DENY`.
- XSS: every rendering uses `textContent` or escaped interpolation (`escapeHtml` via DOM method for line-break); never `innerHTML` with user/evidence data. Fixture injects `<script>alert(1)</script>` as a file name/finding message → HTML and API response both show escaped, not executed.
- Redaction: `/api/*` runs the same secret gate (`PACK_SECRET_GATE_RULES`) before JSON serialization; absolute paths like `/home/...` and `C:\Users\...` replaced with `<local-path>`.

**Diagnostics/bundle**:
- `ackit diagnostics bundle` runs `PACK_SECRET_GATE_RULES` + path-scrub over every included file; test asserts 5 known secret shapes (AWS key, GitHub PAT, `ghp_`, private key block, connection string) all become `[REDACTED]`. Bundle zipped via `node:zlib` with deterministic ordering (sorted file names, fixed mtime `1980-01-01`), manifest `bundle-manifest.json` with `{ path, sha256, redactedCount }`, validated by `tests/security/diagnostics-redaction.test.ts`.

**GitHub Action**:
- `action.yml` pins `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` to full SHAs (reuse `.github/workflows/ci.yml` pins). `args` splitter is `shell-quote`-less: bounded `argv` tokenization (quote-aware, no env expansion); final spawn uses `spawnFile`/`execFile` never `exec`. Injection string `"; rm -rf /"` is passed literally and fails as unknown flag, not executed.
- Artifact SARIF `uses: github/codeql-action/upload-sarif@v3` step is user-opt-in; action itself never calls code-scanning APIs without explicit `upload-sarif: 'true'`.
- Workflow `permissions:` documented as `contents: read` (default), `checks: write` only when Check annotations are desired.

**VS Code extension**:
- No telemetry, no remote AI, no net fetch. Activation registers providers only; the extension host boundary guarantees path containment (workspace root is the only root via SDK). Extension `package.json` `activationEvents: ["onStartupFinished"]` with `enableProposedApi: false`. Bundled `dist/extension.js` is ESBuild'd and emitted sources contain no `eval`, `exec`, `require(remoteInput)`.
- VSIX whitelist audited in TASK-0024: only `extension/**`, `package.json`, `images/**`, `LICENSE`, `README.md` — check fails if `node_modules` sneaks in.

**Package/VSIX auditing**:
- `scripts/audit-package.mjs` checks `npm pack --dry-run` file list against whitelist; secrets scan (`tests/security/secrets.test.ts`) asserts tarball contains no AWS/GH/PAT-like value.
- `scripts/audit-vsix.mjs` (or `vsce ls`) does same for VSIX.

### 3. Global gates

- `scripts/check-security-boundaries.mjs`: grep forbids `child_process.exec(` (allow `execFile`), `eval(`, `Function(`, `require(userInput`, dynamic `fetch(` in `src/` (only `action/` may fetch — scoped).
- `tests/security/*` run on all 6 CI legs (ubuntu/windows/macos × node22/24). A Windows-only path test covers drive-letter handling.
- `docs/security/THREAT_MODEL.md` gains a v0.2.0 delta section mapping T16–T20 → controls; `docs/security/SECURITY_MODEL.md` notes localhost-only + no telemetry + redaction points.

## Rationale

Listing attack surface per feature and assigning bounded controls (zod validation, picomatch, realpath containment, fixed headers, CSP, redaction at construction, safe spawn, provisioned limits) avoids speculative defenses while guaranteeing every EPIC's reviewers can trace a control.

## Alternatives considered

- CSP via `meta` tag only: rejected — headers are stronger and verifiable in tests.
- `fetch` for profile/pack retrieval: rejected — would reintroduce network spy surface; offline-only kept.
- VM sandbox (`vm.runInNewContext`) for pattern evaluation: rejected — regex bounded length + timeout is cheaper and gets the guarantee without sandbox infra.

## Consequences

- Each EPIC's implementation task (TASK-0007..0021) must include a "Security" headed section referencing this ADR and the specific fixture it satisfies.
- Final integration task (TASK-0023) runs `tests/security/v020-*.test.ts` as part of the required green, and TASK-0024 audits VSIX and tarball contents for leak/size.

## Related requirements

REQ-V020-L-001..002 (L epic), plus GOV-001..007.

## References

- `docs/security/THREAT_MODEL.md` (T1–T15 baseline, plus T16–T20 delta in task TASK-0022)
- `docs/security/SECURITY_MODEL.md`
- `src/core/filesystem/engine.ts` (containment), `src/core/policy/{types,resolve}.ts`, `src/core/scanner/rules/*`, `src/core/reporting/serve.ts` (dashboard headers)
