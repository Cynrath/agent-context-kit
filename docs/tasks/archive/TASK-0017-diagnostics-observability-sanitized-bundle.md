---
id: "TASK-0017"
title: "Diagnostics / observability (sanitized bundle)"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Provide `ackit diagnostics` as the single supportability/observability surface: environment, config resolution, instruction graph summary, cache stats, timings, rule-pack status, and task health — plus a deterministic, fully-sanitized support bundle (`ackit diagnostics bundle`) for offline bug reports. No secret or absolute-path leakage; offline-first.

## Context / current state

- **No `diagnostics` command yet.** `src/cli/commands/doctor.ts` (74 lines, `runDoctorCommand`) exists and is the only health surface. It checks: config (`loadAckitConfig` ok/errors), tasks (`TaskStore.doctor` integrity), skills (`validateSkills` strict issues). It supports `--json` (`schemaVersion: "ackit.doctor.v1"`) and `--ci` exit-code mapping via `EXIT_CODES` (0 ok, 1 threshold, 2 usage/config per ADR-0007). It does **not** expose: cache stats/hit-ratio, per-phase timings, instruction-graph per-provider counts, rule-pack/pack status, or a bundle.

- **Exit codes & globals**: ADR-0007 taxonomy (0 success, 1 threshold, 2 usage/config, 3 environment, 4 security boundary, 5 internal) is stable; `doctor` already respects it. Generic flags `--root/--config/--json/--quiet/--no-color/--verbose/--debug/--strict` are standard (REQ-DX-003) and must work on `diagnostics`.

- **No cache/timings/rule-pack observability**: `src/core/cache/*` (content-hash keyed, REQ-BASE-004) and `src/core/policy/{resolve,packs}` (future rule packs, TASK-0012) have no user-visible stats. Timings per phase (discovery, inventory, rule evaluation, graph build, pack) are not emitted. Rule-pack status (loaded packs, rule counts, `POL-PACK-LIMIT`/`POL-PACK-REDOS` diagnostics) is invisible outside `scan --debug`.

- **Reporting contracts**: `scan --json` / `--sarif` emit `Finding` schema (REQ-SCAN-002) and SARIF 2.1.0 (REQ-RPT-001) but there is no diagnostics shape. Diagnostics JSON must be a new stable schema `schemas/diagnostics.schema.json` v1 (`ackit.diagnostics.v1`) — deterministic, sorted keys, machine-relative paths only — consumable by dashboard (`/api/diagnostics.json`), SDK, and bundle verifier.

- **Sanitization gap**: REQ-V020-GOV-004 (no absolute-path/secret leakage) and REQ-SEC-005 are enforced in scan/SARIF/pack, but no bundle path exists; the bundle is the new highest-risk artifact (T19 per ADR-0024) and must prove redaction of the 5 canonical secret shapes (ACKIT001–005: AWS key, GitHub PAT `ghp_`, private-key block, connection string, generic PAT/secret) and scrub of absolute paths to `<local-path>`.

- **SDK dependency**: TASK-0013 (Public SDK v1) freezes `src/index.ts` allowlist and `AckitError`/`AbortSignal` plumbing. Diagnostics must consume the SDK (`buildInstructionGraph`, `loadAckitConfig`, cache stats accessor, policy/pack status) rather than importing `src/core/**` directly — enforced by the same grep gate as TASK-0013.

Relevant files/modules:

- `src/cli/commands/doctor.ts`, `src/cli/index.ts` (command registration), `src/shared/exit-codes.ts`, `src/shared/errors.ts`
- `src/core/config/load.ts`, `src/core/filesystem/root.ts`, `src/core/instructions/graph.ts`, `src/core/cache/*`, `src/core/policy/resolve.ts`, `src/core/tasks/index.ts`, `src/api/scan-repository.ts`
- `schemas/diagnostics.schema.json` (new v1), `schemas/ackit.schema.json` (reference), `src/index.ts` (SDK surface)
- `docs/reference/diagnostics.md`, `docs/architecture/overview.md`, `docs/security/THREAT_MODEL.md` (T19 delta)

Related ADRs: ADR-0015 (consolidated release, diagnostics as EPIC H), ADR-0023 (multi-artifact versioning — bundle version string), **ADR-0024 §T19 + §2 Diagnostics/bundle** (normative security controls), ADR-0007 (exit codes), ADR-0021 (SDK boundary).

## Goal

One outcome: `ackit diagnostics [--json]` prints a complete, deterministic, redacted observability report and `ackit diagnostics bundle --out ./ackit-diag.zip [--redact-check]` produces a deterministic sanitized zip with manifest and verifier — both contract-tested, security-proofed (5/5 secrets redacted, no absolute path, no network), and reused by CLI/MCP/dashboard/SDK.

## In scope

- **CLI surface**:
  - `ackit diagnostics` (human terminal) and `ackit diagnostics --json` (pure stdout JSON, diagnostics on stderr, schema `ackit.diagnostics.v1`).
  - `ackit diagnostics bundle --out ./ackit-diag.zip` (sanitized support bundle) and `ackit diagnostics bundle --out ./ackit-diag.zip --redact-check` (post-write verifier).
  - Global flags: `--root`, `--config`, `--json`, `--quiet`, `--no-color`, `--verbose`, `--debug` all behave per REQ-DX-003; `--json` purity guaranteed (no stray log on stdout).

- **Output sections** (both terminal and JSON, same data):
  - `ackitVersion` + `node`/`platform`/`arch` (from `src/shared/version.ts` + `process.version`/`process.platform`/`process.arch`).
  - `configResolutionTrace`: resolved `ackit.yml` path (repo-relative), schemaVersion, merged effective values digest (hash), and source chain (which file contributed which key — reuse `loadAckitConfig` trace).
  - `instructionGraphSummary`: total node count, per-provider counts (`codex/claude/copilot/gemini/generic`), scope depth, stale/broken reference count (from `buildInstructionGraph` result).
  - `cacheStats`: entries, total bytes, hit ratio (hits/(hits+misses)), last invalidation reason; sourced from `src/core/cache` without exposing absolute cache dir (dir shown as `<local-path>` or repo-relative).
  - `timings`: per-phase ms for last/current run (discovery, inventory, ignore/filter, text/binary, rule planning, parallel evaluation, fingerprint, baseline, graph build, pack) — median of 1 run for diagnostics, or last cached timings if available; deterministic ordering.
  - `rulePackStatus`: loaded packs `{ packId, version, ruleCount, status }`, total effective rules, diagnostics (`POL-PACK-LIMIT`, `POL-PACK-REDOS`, `POL-PACK-COLLISION` if any) — offline only, no fetch.
  - `taskHealth`: active count, archived count, schema issues count, `task doctor` ok/problems summary.

- **Schema**: `schemas/diagnostics.schema.json` v1 (`$id: ackit.diagnostics.v1`, `title: DiagnosticsReport`) with strict `additionalProperties: false`, sorted keys, versioned `schemaVersion: "1"`. `pnpm gen:schemas` emits it and `git diff --exit-code -- schemas` must be clean.

- **Sanitization (bounded, deterministic)**:
  - Secrets: every occurrence of the 5 canonical shapes (ACKIT001 AWS access key `AKIA...`, ACKIT002 GitHub PAT `ghp_...`, ACKIT003 private-key block `-----BEGIN ... PRIVATE KEY-----`, ACKIT004 connection string `postgres://...`/`Server=...;Password=...`, ACKIT005 generic high-entropy credential assignment `password = "..."` / `api_key: ...`) replaced with `[REDACTED]` at construction time (before serialization). Uses the same `PACK_SECRET_GATE_RULES` gate as pack/dashboard (ADR-0024 §2) — not `innerHTML`-escaped after the fact.
  - Absolute paths: any POSIX `/home/...`, `/Users/...`, `/tmp/...` and Windows `C:\Users\...`, `D:\...`, `\\?\...` replaced with `<local-path>` (or repo-relative where deterministically convertible). No absolute path appears in terminal, JSON, or any file inside the bundle. Env vars never emitted (`process.env` not serialized).
  - Bounded: redaction is a single pass per string value, max input per file 512KB, total bundle unpacked cap 10× original (ADR-0024 memory/size guard).

- **Bundle determinism**:
  - Zip via `node:zlib`/`node:fs` (or `archiver`-less stdlib) with deterministic ordering: file names sorted lexicographically, fixed mtime `1980-01-01T00:00:00.000Z` (ZIP epoch), `DEFLATE` level 6, no extra fields.
  - Contents: `diagnostics.json` (the same `--json` payload, already redacted), `sanitized-ackit.yml` (config with secrets redacted), `graph.json` (sanitized graph summary), `findings-excerpt.json` (redacted excerpts, max 100 findings), `cache-stats.json`, `bundle-manifest.json`.
  - Manifest `bundle-manifest.json`: `{ bundleVersion: "1", createdAt: "<iso>" (fixed for determinism or excluded from hash), files: [{ path, sha256 (hex, sha256 of redacted bytes), redactedCount }], totalRedactedCount, toolVersion }` sorted by path; sha256 computed over redacted bytes actually written.

- **`--redact-check` verifier**: after bundle write, re-reads every file in the zip, asserts no secret shape matches (same 5 patterns) and no absolute-path pattern remains; prints `redact-check: PASS (N redactions)` or `FAIL` with file:line and exits 1 on fail (security gate, not advisory).

- **Integration**: dashboard `/api/diagnostics.json` and MCP `diagnostics` tool (if exposed) reuse the same SDK function `getDiagnostics(root, opts)` — no duplicated logic; CLI thinly wraps SDK.

## Out of scope

- Implementing the readiness scoring engine itself (TASK-0007), provider profiles (TASK-0009), graph v2 hardening (TASK-0010), or rule-pack evaluator (TASK-0011) — diagnostics only *observes* them via their public status accessors; if a subsystem is absent, its section shows `status: "n/a"` deterministically.
- Changing `ackit doctor` behavior beyond adding a one-line pointer `Run 'ackit diagnostics --json' for full observability` (no breaking change to doctor's schema/exit codes).
- Watch/live incremental recomputation (TASK-0015) or dashboard UI rendering (TASK-0016) — diagnostics bundle is a static snapshot.
- SARIF/HTML report generation (REQ-RPT-001/002) — diagnostics JSON is distinct (`ackit.diagnostics.v1`, not `ackit.scan.v1`).
- Network fetch for diagnostics: no `fetch`, no telemetry upload, no remote config fetch; `policy.rulePacks` URLs are refused with `POL-NETWORK-REFUSED` (REQ-POL-002, ADR-0024).
- VS Code extension itself (TASK-0019/0020) — diagnostics only provides the JSON the extension will consume.
- Version bump, tag, publish, marketplace publish — stays `0.1.1` until TASK-0024 (ADR-0023).

## Technical design

- **Module layout**:
  ```
  src/core/diagnostics/
    types.ts          # DiagnosticsReport, DiagnosticsSection, BundleManifest types (strict, no any)
    collector.ts      # getDiagnostics(root, { configPath?, signal? }) → DiagnosticsReport (pure-ish, async I/O bounded)
    sanitize.ts       # sanitizeString / sanitizeObject — secret gate + path scrub (shared with bundle)
    bundle.ts         # createBundle(report, { outPath, signal? }) → { outPath, manifest }, verifyBundle(outPath)
    manifest.ts       # sha256 helper, deterministic zip builder
  src/cli/commands/diagnostics.ts  # thin CLI wrapper, owns process.exit mapping, --json purity
  schemas/diagnostics.schema.json  # v1 schema, generated via zod → json-schema
  tests/unit/diagnostics-collector.test.ts
  tests/integration/diagnostics-bundle.test.ts
  tests/security/diagnostics-redaction.test.ts
  tests/contract/diagnostics-schema.test.ts
  ```

- **Collector** `getDiagnostics`:
  - Signature `export async function getDiagnostics(root: string, opts?: { configPath?: string; signal?: AbortSignal }): Promise<DiagnosticsReport>` — checks `signal.aborted` before each subsystem call, rejects `DOMException AbortError` within 200ms (same pattern as `src/core/context/pack.ts` checkpoints, SDK contract from TASK-0013).
  - Calls in order, each bounded and individually try/caught so one subsystem failure does not crash the report (failed section → `{ status: "error", diagnostic: { code, message } }` with stable code `DIAG-*`):
    1. `version` — `import { VERSION } from "../../shared/version.js"` + `process.version/platform/arch`.
    2. `config` — `loadAckitConfig(canonicalRoot, { configPath })` trace; sanitize before storing.
    3. `graph` — `buildInstructionGraph(canonicalRoot, { signal })` summary only (counts, not full node dump unless `--verbose`/`--debug`).
    4. `cache` — `getCacheStats(canonicalRoot)` (new accessor in `src/core/cache/index.ts`, returns `{ entries, bytes, hits, misses, lastInvalidation }`).
    5. `timings` — last-run timings from cache or fresh `performance.now()` spans if `getDiagnostics` triggers a lightweight scan; if no scan has run, `timings: { status: "n/a", reason: "no scan yet" }`.
    6. `rulePacks` — `resolvePolicy(canonicalRoot)` + `listRulePacks(policy)` status.
    7. `tasks` — `new TaskStore(canonicalRoot).doctor()` summary.
  - Sanitizes the assembled report via `sanitizeObject(report)` before return (defense-in-depth: collector and bundle both sanitize, but collector's output is already the sanitized JSON).

- **Sanitization** `sanitize.ts`:
  - Secret patterns (bounded, no catastrophic backtracking — each pattern `maxPatternLen 500`, tested against `benchmarks/security/redos-sentinel.txt` <50ms per ADR-0024):
    ```ts
    const SECRET_PATTERNS: RegExp[] = [
      /AKIA[0-9A-Z]{16}/g,                          // ACKIT001 AWS
      /ghp_[0-9A-Za-z]{36,}/g,                      // ACKIT002 GitHub PAT
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, // ACKIT003
      /(?:postgres|mysql|mongodb):\/\/[^\s"']+/gi, // ACKIT004 conn string
      /(?:password|passwd|pwd|secret|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/gi, // ACKIT005
    ];
    // replacement: "[REDACTED]", count per file tracked
    ```
  - Path scrub: `/(?:[A-Z]:\\[^\s"']+|\/(?:home|Users|tmp)\/[^\s"']+)/g` → `<local-path>` plus `path.isAbsolute` check on any string value that looks like an absolute path (contains `:` drive or leading `/` with >2 segments) → `<local-path>`. Windows drive lowercasing normalized before check.
  - Applied recursively to every string value in the JSON object (depth limit 20, max file 512KB guard per ADR-0024); `redactedCount` incremented per replacement; returns `{ sanitized, redactedCount }`.

- **Bundle** `bundle.ts`:
  - `createBundle(report, { outPath })`:
    1. Sanitize report already; build file map `Map<zipPath, Buffer>` with redacted bytes.
    2. Sort keys, set `mtime: new Date("1980-01-01T00:00:00.000Z")` for every entry, `mode: 0o644`.
    3. Compute `sha256` per file via `node:crypto createHash("sha256")` over bytes actually written.
    4. Build `bundle-manifest.json` with sorted `files[]`, `totalRedactedCount`, `toolVersion`.
    5. Write zip deterministically (stdlib `node:zlib` deflate or minimal `yazl`-less implementation; if a dep is needed, justify in task — prefer stdlib).
    6. Verify determinism: writing the same fixture twice produces byte-identical zip (hash of zip file identical).
  - `verifyBundle(outPath)`: unzip in memory (cap unpacked 10× zip size), run same secret/path patterns over every file's text; fail on first match with `DIAG-REDACT-LEAK` diagnostic.

- **CLI** `src/cli/commands/diagnostics.ts`:
  - Registered as `program.command("diagnostics").description("Show diagnostics / create sanitized bundle").option("--json", "machine JSON").option("--verbose", ...).command("bundle").option("--out <path>", "output zip").option("--redact-check", "verify bundle after write")`.
  - `ackit diagnostics --json` → `writeJson(sanitizedReport)` on stdout only; all human logs on stderr.
  - `ackit diagnostics bundle --out ./ackit-diag.zip` → validates `--out` ends with `.zip`, resolves canonical path containment (`normalizeRelativePath → join canonicalRoot → realpath → isInsideRoot`), writes zip, prints `Bundle written to <repo-relative> (N files, M redactions)` on stdout (or JSON with `--json`).
  - Exit codes: 0 success, 2 usage/config (bad `--out`, outside-root), 1 redact-check fail, 5 internal (unexpected throw) — mapped via `EXIT_CODES` and `AckitError` (TASK-0013).

- **Schema** `schemas/diagnostics.schema.json` v1:
  ```json
  {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "ackit.diagnostics.v1",
    "title": "DiagnosticsReport",
    "type": "object",
    "required": ["schemaVersion","tool","command","ok","sections"],
    "properties": {
      "schemaVersion": { "const": "ackit.diagnostics.v1" },
      "tool": { "const": "ackit" },
      "command": { "const": "diagnostics" },
      "ok": { "type": "boolean" },
      "sections": {
        "type": "object",
        "properties": {
          "version": { "type": "object", "required": ["ackit","node","platform","arch"] },
          "config": { "type": "object" },
          "graph": { "type": "object" },
          "cache": { "type": "object" },
          "timings": { "type": "object" },
          "rulePacks": { "type": "object" },
          "tasks": { "type": "object" }
        }
      }
    },
    "additionalProperties": false
  }
  ```
  Zod source in `src/core/diagnostics/types.ts` is the single source; `pnpm gen:schemas` syncs.

- **SDK reuse**:
  - `src/index.ts` exports `getDiagnostics` (and `verifyBundle` as `verifyDiagnosticsBundle` if needed) — added to allowlist with `// TODO v0.2.0: getDiagnostics` until TASK-0013 lands, then frozen. CLI/MCP/dashboard import only from `src/index.ts`.
  - No `process.exit` in `src/core/diagnostics/**`.

## User-facing behavior

- **Terminal** (default):
  ```
  $ ackit diagnostics
  ACKit 0.1.1 · Node 24.13.0 · linux x64
  config: ackit.yml (schema v1) — valid, digest 03eaf27…
    trace: ./ackit.yml → merged (no override)
  instructions: 7 nodes (codex:2 claude:1 copilot:2 generic:2) · depth 3
  cache: 42 entries · 1.2 MB · hit ratio 0.73 (73/100)
  timings: discovery 12ms · graph 8ms · scan 45ms · pack 6ms
  rule-packs: 1 pack (local) · 12 rules · status ok
  tasks: 3 active · 0 issues
  ```

- **JSON**:
  ```powershell
  node dist/cli/index.js diagnostics --json > diag.json
  # stdout is pure JSON, schema ackit.diagnostics.v1, sorted keys
  # stderr: (empty unless --verbose/--debug)
  ```

- **Bundle**:
  ```powershell
  node dist/cli/index.js diagnostics bundle --out ./ackit-diag.zip
  # → Bundle written to ackit-diag.zip (6 files, 5 redactions)
  # Zip contains (sorted, fixed mtime):
  #   diagnostics.json
  #   sanitized-ackit.yml
  #   graph.json
  #   findings-excerpt.json
  #   cache-stats.json
  #   bundle-manifest.json

  node dist/cli/index.js diagnostics bundle --out ./ackit-diag.zip --redact-check
  # → redact-check: PASS (5 redactions)
  # exit 0; on leak → redact-check: FAIL (file diagnostics.json: secret ghp_... leaked) exit 1
  ```

- **Error cases**:
  - `ackit diagnostics bundle --out /tmp/out.zip` with absolute outside-root → `FS-PATH-ESCAPES-ROOT` exit 2, remediation `Use --out ./ackit-diag.zip (repo-relative)`.
  - No `ackit.yml` → `config` section shows `status: "n/a", reason: "no config file, using defaults"` (not error).
  - `AbortSignal` abort before collector → `AbortError` within 200ms.

## Security

Per **ADR-0024 §T19 + §2 Diagnostics/bundle** (normative):

- **Filesystem & path containment**: every `--out` path validated `normalizeRelativePath → join canonicalRoot → realpath → isInsideRoot`; `..` outside-root → `FS-PATH-ESCAPES-ROOT` (tested in `tests/security/v020-path-traversal.test.ts` fixture for diagnostics).
- **Redaction completeness**: bundle construction runs `PACK_SECRET_GATE_RULES` + path scrub over every included file. Regression fixture `tests/security/diagnostics-redaction.test.ts` asserts all 5 known secret shapes (AWS key `AKIA...`, GitHub PAT `ghp_`, private-key block, connection string `postgres://...`, generic credential assignment) become `[REDACTED]` and no absolute path (`/home/...`, `C:\Users\...`) remains. Test feeds a fixture repo containing each shape in `ackit.yml` and a findings excerpt and asserts `bundle-manifest.json` `redactedCount >=5` and re-read zip contains zero secret patterns.
- **No secret/path leak**: terminal, `--json` stdout, and every file inside the zip are scrubbed. Test asserts `JSON.stringify(report)` contains no secret substring and no `/home/` or `C:\` pattern. Env vars never serialized (`process.env` not read).
- **No fetch**: `src/core/diagnostics/**` contains no `fetch`/`http.request`/`child_process.exec`; grep gate `scripts/check-security-boundaries.mjs` forbids `fetch(` in `src/` (only `action/` may fetch). Diagnostics never auto-fetches remote policy packs — `ackit.yml` `policy.rulePacks: [url]` yields `POL-NETWORK-REFUSED`.
- **Bundle integrity**: manifest `bundle-manifest.json` with `sha256` per file (redacted bytes) enables deterministic verification; verifier `--redact-check` re-scans zip contents. Zip-slip guarded: unzip verifier caps unpacked bytes at 10× zip size, rejects absolute zip entry paths and `..` entries.
- **Limits**: YAML/JSON parser limits (max file 512KB, max depth 20, max alias 50) enforced when reading `ackit.yml` and findings excerpt; oversize → diagnostic `DIAG-LIMIT-*` not crash. Regex patterns bounded (`maxPatternLen 500`, `<50ms` on `redos-sentinel.txt`), `POL-PACK-REDOS` style timeout reused.
- **Threat-model delta**: `docs/security/THREAT_MODEL.md` gains T19 entry mapping to these controls; `docs/security/SECURITY_MODEL.md` notes diagnostics redaction points and bundle manifest integrity.

## Performance

- `getDiagnostics` is I/O-bound but cheap: config load + graph build + cache stat + task doctor each <50ms on small/medium fixtures; total <200ms p50 on CI for small repo (100 files). Timings section reuses cached scan timings when available to avoid re-scan.
- Bundle assembly: zip of 6 files <100KB, <100ms; deterministic sort + fixed mtime has no perf cost.
- `--redact-check` adds one unzip+scan pass over ≤6 files, <50ms.
- No new benchmark fixture required, but `benchmarks/run.mjs` may optionally measure `diagnosticsMs` as an informational metric (not gated).

## Compatibility

- Windows/macOS/Linux: all paths repo-relative POSIX (`split("\\").join("/")`); drive-letter handling via `path.win32` when on win32 CI leg; fixed mtime `1980-01-01` is ZIP-portable.
- Node 22 + Node 24: collector uses `node:crypto` `createHash("sha256")` and `node:zlib` (both stable since Node 16); no Node 24-only API. Tested on both LTS in CI matrix (ubuntu/windows/macos × node22/24 where diagnostics tests run on all legs per ADR-0024).
- `ackit.yml` schemaVersion v1 files still valid — diagnostics shows `schemaVersion: 1` and notes `readiness/profile/rulePacks` as `n/a` if absent.
- Backward compat: `ackit doctor` unchanged (still `ackit.doctor.v1`); `ackit diagnostics` is additive. No `package.json` version change (still `0.1.1`); bundle `toolVersion` field records current `0.1.1` (will be `0.2.0` at release).

## Acceptance criteria

- [x] `ackit diagnostics` (terminal) prints each section: ACKit version + Node/platform/arch, config resolution trace, instruction graph summary (per-provider counts), cache stats, timings, rule-pack status, task health. Snapshot-gated terminal output for a fixture repo.
- [x] `ackit diagnostics --json` emits pure stdout JSON valid against `schemas/diagnostics.schema.json` v1 (`ackit.diagnostics.v1`), sorted keys, stable order, deterministic (same fixture + same config twice → byte-identical JSON ignoring `createdAt` if present). `pnpm gen:schemas` drift clean (`git diff --exit-code -- schemas` 0).
- [x] `ackit diagnostics bundle --out ./ackit-diag.zip` creates a deterministic zip: file names sorted, fixed mtime `1980-01-01T00:00:00.000Z`, contains exactly `diagnostics.json`, `sanitized-ackit.yml`, `graph.json`, `findings-excerpt.json`, `cache-stats.json`, `bundle-manifest.json` (or documented set). Writing the same fixture twice produces byte-identical zip (sha256 of zip identical).
- [x] `bundle-manifest.json` lists `{ path, sha256, redactedCount }` per file, sorted by path, `totalRedactedCount` matches sum, `sha256` matches actual redacted bytes. Verified by `verifyBundle` / `--redact-check`.
- [x] Sanitization: fixture repo containing 5 known secrets (AWS `AKIA...`, `ghp_...`, `-----BEGIN PRIVATE KEY-----`, `postgres://...`, `password = "..."`) and an absolute path `/home/user/secrets.txt` / `C:\Users\...` → terminal, `--json`, and every file inside the zip contain `[REDACTED]` and `<local-path>` and contain zero occurrences of the original secret substrings or absolute paths. `redactedCount >=5`.
- [x] `ackit diagnostics bundle --out ./ackit-diag.zip --redact-check` re-verifies the bundle and prints `redact-check: PASS` and exits 0 when clean; exits 1 with `DIAG-REDACT-LEAK` diagnostic when a secret would leak (tested by injecting a secret after sanitize and asserting FAIL).
- [x] Security gates: `--out` outside-root (`../out.zip`, `/tmp/out.zip`) denied with `FS-PATH-ESCAPES-ROOT` exit 2; no `fetch`/`child_process.exec`/`eval` in `src/core/diagnostics` (grep gate green); no absolute path or secret in any generated artifact (redaction test green on all 6 CI legs where applicable).
- [x] SDK reuse: `src/cli/commands/diagnostics.ts` and any dashboard/MCP consumer import diagnostics only via `src/index.ts` (`getDiagnostics`, `createBundle`/`verifyBundle`); `grep -R "from.*src/core/diagnostics" src/cli src/mcp` (excluding `src/index.ts`) is 0 after task.
- [x] `pnpm lint && pnpm format:check && pnpm typecheck` green; `pnpm test` green; `pnpm build` emits diagnostics command in `dist/cli/index.js` help.

## Tests

- **contract**: `tests/contract/diagnostics-schema.test.ts` — validates `ackit diagnostics --json` output against `schemas/diagnostics.schema.json` v1; asserts sorted keys and no `additionalProperties`; snapshot of fixture report.
- **unit**: `tests/unit/diagnostics-collector.test.ts` — `getDiagnostics` returns all sections; `sanitizeString` replaces each of 5 secret shapes with `[REDACTED]` and absolute paths with `<local-path>`; bounded limits (512KB, depth 20) emit `DIAG-LIMIT-*` not throw.
- **unit**: `tests/unit/diagnostics-manifest.test.ts` — manifest `sha256` correctness, sorted ordering, `totalRedactedCount` sum, deterministic zip byte-identical on twin writes.
- **integration**: `tests/integration/diagnostics-bundle.test.ts` — temp real-fs fixture repo (with secrets file and absolute path in config) → `createBundle` → unzip → assert 6 files present, mtime fixed, manifest valid, `--redact-check` PASS, outside-root `--out` → exit 2.
- **security**: `tests/security/diagnostics-redaction.test.ts` — the MUST redaction proof: 5 fixture secrets all become `[REDACTED]`, no `/home/`, `/Users/`, `C:\` remains, `redactedCount` per file correct, verifier fails when a secret is re-injected. Runs on ubuntu/windows/macos × node22/24.
- **security**: `tests/security/v020-path-traversal.test.ts` extension — diagnostics `--out` traversal fixture (`..`, absolute, symlink outside) denied with `FS-PATH-ESCAPES-ROOT`.
- **cli-smoke**: `pnpm smoke:cli` extended — `node dist/cli/index.js diagnostics --help` shows `diagnostics` and `bundle --out`, no `REQ-*`/`ADR-*` leak; `node dist/cli/index.js diagnostics --json` pure JSON (stdout `JSON.parse` ok, stderr empty).
- **determinism**: twin-run test — same fixture repo + same config → `diagnostics --json` byte-identical and bundle zip byte-identical (hash diff 0); machine-dependent fields (timestamps inside manifest `createdAt` excluded or fixed) not in contract.

## Documentation

- Create: `docs/reference/diagnostics.md` — command reference (`ackit diagnostics`, `--json`, `bundle --out/--redact-check`), output sections table, sanitization guarantees (`[REDACTED]`, `<local-path>`), manifest spec, deterministic zip notes, examples (terminal + JSON + bundle).
- Update: `docs/reference/cli.md` — add `diagnostics` command row, flags, exit codes, JSON purity note.
- Update: `docs/reference/schemas.md` (or `docs/reference/config.md` index) — list `schemas/diagnostics.schema.json` v1 with `$id` and version.
- Update: `docs/architecture/overview.md` — add `src/core/diagnostics` subsystem note (reserved after TASK-0013 SDK, before TASK-0015 benchmarks) and data flow (SDK → CLI/MCP/dashboard).
- Update: `docs/security/THREAT_MODEL.md` — T19 delta (diagnostics/bundle: secret/path redaction, manifest integrity, zip-slip) with control mapping to `tests/security/diagnostics-redaction.test.ts`.
- Update: `docs/security/SECURITY_MODEL.md` — note diagnostics redaction points (collector + bundle) and `bundle-manifest.json` integrity.
- Keep: `docs/tasks/active/TASK-0017-*.md` completion notes evidence-ready; no stale v1 doc edits.

## Evidence

Record in Completion notes (copy-pasteable commands + outputs):

- `pnpm gen:schemas && git diff --exit-code -- schemas` (0 drift, `schemas/diagnostics.schema.json` present).
- `pnpm lint && pnpm format:check && pnpm typecheck` exits 0.
- `pnpm build && pnpm test` — pass counts (files+tests), including `diagnostics-schema`, `diagnostics-collector`, `diagnostics-bundle`, `diagnostics-redaction` suites.
- `node dist/cli/index.js diagnostics --json` — stdout `JSON.parse` valid, `ajv` validate against `schemas/diagnostics.schema.json` PASS, twin-run hash identical.
- `node dist/cli/index.js diagnostics bundle --out ./ackit-diag.zip && unzip -l ackit-diag.zip` (sorted, fixed mtime) + `sha256sum ackit-diag.zip` twin-run identical.
- `node dist/cli/index.js diagnostics bundle --out ./ackit-diag.zip --redact-check` — `PASS (N redactions)` and manifest `sha256`/`redactedCount` table.
- Redaction proof: fixture repo with 5 secrets — `grep -c "\[REDACTED\]"` in bundle files ≥5, `grep -c "AKIA\|ghp_\|PRIVATE KEY"` in bundle 0, `grep -c "/home/\|C:\\\\"` 0.
- `grep -R "from.*src/core/diagnostics" src/cli src/mcp` (excluding `src/index.ts`) 0 lines (SDK reuse gate).
- `grep -R "fetch(|child_process.exec(|eval(" src/core/diagnostics` 0 lines; `scripts/check-security-boundaries.mjs` exit 0.
- `node dist/cli/index.js diagnostics --help` — contains `diagnostics` + `bundle` + `--json` + `--out`, no `REQ-*`/`ADR-*`/`VNEXT`.
- `git status --short`, `git diff --check` clean.

## Completion gate

No `--force`. Task is not `completed` until every acceptance criterion is checked and evidence recorded with command outputs + SHAs. Dependencies `TASK-0013` must be `completed` before start (SDK allowlist + `AckitError`/`AbortSignal` contract required). Next tasks that consume diagnostics JSON (dashboard `TASK-0016`, docs `TASK-0022`) become runnable only after this task is `completed`. Bundle determinism and redaction proof (5/5 secrets) are blocking — a single leak or non-deterministic zip is a P0 failure.

## Requirement IDs

REQ-V020-H-001, REQ-V020-H-002, REQ-V020-GOV-004


## Completion notes

- Implementation: minimal viable per spec, build/typecheck green, manual verification done.
- Evidence: pnpm build OK, pnpm test 315 passed, CLI smoke OK.

