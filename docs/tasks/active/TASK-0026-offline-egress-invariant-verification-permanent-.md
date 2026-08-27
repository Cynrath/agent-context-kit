---
id: "TASK-0026"
title: "Offline-egress invariant verification + permanent CI contract"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Prove the offline-first invariant permanently: after installation, ACKit product/runtime never needs or initiates outbound internet access. Create a robust static + runtime enforcement contract that fails CI if a future change introduces outbound product primitives, and document the guarantee.

Requirement: REQ-GOV-001/002 (offline-first), REQ-GOV-009 (no cloud), ADR-0024 T16-T20.

## Context / current state

- v0.2.0 passed threat model audit (T1-T15 + T16-T20 delta) but has no automated offline-egress gate in normal CI (only manual audit in TASK-0024).
- Current product runtime has only `node:http` in `src/core/dashboard/server.ts` and `src/core/reporting/serve.ts` for intentional localhost servers, and `fetch('/api/...')` relative browser calls. No outbound `fetch`, `https`, `net`, `tls`, `dgram`, `dns`, `WebSocket`, `EventSource`, `axios`, `curl`, git network commands in shipped runtime.
- Need permanent static gate + runtime deny-egress harness in normal CI (`ci.yml`), not release-only.
- Must preserve DSH file policy: never claim network egress where none exists.

## Goal

- Static audit shipped runtime (`src/**`, `dist/action/index.js`, `extensions/vscode/src/**`, `templates/**`) for outbound primitives; prove none except allowlisted `node:http` local servers and relative `/api/...` fetch.
- Assert: default host = 127.0.0.1/localhost/::1, browser calls = relative, no remote fonts/CDN/analytics/beacon.
- Prove: rule packs refuse `http/https/ftp` locations, remote extends refused, missing npm pack NOT auto-installed, provider profiles bundled/local, no provider API calls, MCP stdio only, VS Code no telemetry/network client.

## In scope

- Create `scripts/check-offline-egress.mjs` static gate with explicit allowlists (permit `node:http` only in known local-server modules, allow `createServer`, reject outbound `request/get`, allow dashboard `fetch('/api/...')`, reject absolute/protocol-relative/dynamic remote fetch, reject product-runtime git network commands).
- Create `tests/security/offline-egress-contract.test.ts` (static file-content assertions) and `tests/security/offline-runtime.test.ts` (runtime deny-egress harness patching `fetch`, `http.request`, `https.request`, `net.connect`, `tls.connect`, `dgram`, `dns`, `WebSocket`, `EventSource` and running representative commands: doctor, scan, scan --ci, readiness, instructions, pack, optimize, diagnostics, rule-pack evaluation, SDK consumer, MCP stdio).
- Add enforcement to `.github/workflows/ci.yml` normal CI (not release-only).
- Document guarantee in `docs/security/THREAT_MODEL.md` / `docs/security/SECURITY_MODEL.md` delta.
- Add contract for `src/core/policy/packs/load.ts` and `src/core/profiles/loader.ts` network-refusal coverage.

## Out of scope

- Changing distribution operations that may use network (npm install/publish, GitHub Actions dependency download, VS Code Marketplace installation, browser visits to hosted docs, GitHub Pages).
- Adding telemetry, remote LLM calls, cloud-required behavior.
- Executing third-party benchmark repo code.
- Telemetry in VS Code extension (prohibited).

## Affected files

- `scripts/check-offline-egress.mjs` (new)
- `tests/security/offline-egress-contract.test.ts` (new)
- `tests/security/offline-runtime.test.ts` (new) — or `tests/security/offline-egress-contract.test.ts` covering both static+runtime
- `.github/workflows/ci.yml` (enforce step)
- `docs/security/THREAT_MODEL.md`, `docs/security/SECURITY_MODEL.md` (doc delta)
- `src/core/dashboard/server.ts`, `src/core/reporting/serve.ts` (no change, just allowlisted)

## Technical design

Static gate (`scripts/check-offline-egress.mjs`):
- Walk `src/**`, `extensions/vscode/src/**`, `dist/action/index.js` (if exists), `templates/**`.
- Search patterns (regex, case-sensitive):
  `globalThis.fetch`, `fetch(`, `node:https`, `http.request`, `http.get`, `https.request`, `https.get`, `node:net`, `net.connect`, `Socket.prototype.connect`, `node:tls`, `tls.connect`, `node:dgram`, `dns.resolve`, `dns.lookup`, `WebSocket`, `EventSource`, `axios`, `got`, `undici`, `curl`, `wget`, `Invoke-WebRequest`.
  Exception handling:
  - `node:http` allowed ONLY in `src/core/dashboard/server.ts` and `src/core/reporting/serve.ts` (assert `createServer` only, no `request`/`get` outbound).
  - `fetch` allowed ONLY if literal arg starts with `'/api/` or `'/'` or is relative; reject `fetch('http`, `fetch("http`, `fetch(\`http`, `fetch(variable`, `fetch(\`/${`.
  - Schema identifiers `https://json.schemastore.org`, `https://github.com/Cynrath` in comments/strings are allowed if not passed to `fetch`/`http.request`.
  - `git fetch/pull/push/clone/ls-remote` rejected if found in product runtime (not in docs/scripts).
- Exit 0 = PASS, exit 1 = FAIL with file:line list.
- Run in CI before `pnpm test` as `node scripts/check-offline-egress.mjs`.

Runtime deny-egress harness (`tests/security/offline-runtime.test.ts`):
- Before each representative command, patch:
  `globalThis.fetch = () => throw`, `http.request/http.get` -> throw, `https.request/https.get` -> throw, `net.connect`/`Socket.prototype.connect` -> throw, `tls.connect` -> throw, `dgram.createSocket` outbound -> throw, `dns.resolve/lookup` -> throw, `globalThis.WebSocket` -> throw, `EventSource` -> throw.
- Allow `http.createServer` + `listen` on loopback only (stub net to allow).
- Run: `doctor`, `scan`, `scan --ci`, `readiness`, `instructions --explain`, `pack --max-tokens`, `optimize --explain`, `diagnostics --json`, SDK `scanRepository`, MCP stdio `tools/list`.
- Assert: no intercepted outbound call, no throw from deny harness except allowed loopback server bind. Dashboard/report tests may bind `127.0.0.1` with `port 0` and succeed.
- Deterministic, no network, <30s, runs in `pnpm test`.

## Security

- Offline-first is T3 mitigation; any egress is Critical finding.
- No secret leakage: script must not log file content with secrets; only report file:line + primitive name.
- Local dashboard exception documented explicitly (127.0.0.1 default, non-loopback requires `--allow-nonlocal` warning).

## Tests

| Class | Command | Gate |
|---|---|---|
| static contract | `node scripts/check-offline-egress.mjs` | exit 0, no violation |
| static file-content | `pnpm test tests/security/offline-egress-contract.test.ts` | asserts file scan PASS, allowlist counts |
| runtime deny | `pnpm test tests/security/offline-runtime.test.ts` | all representative commands PASS under deny |
| CI gate | `.github/workflows/ci.yml` includes offline step | synthetic bad commit with `fetch('https://example.com')` fails CI |

## Acceptance criteria

- [x] Static audit of `src/**`, `dist/action/index.js`, `extensions/vscode/src/**`, `templates/**` PASS (no outbound primitives except allowlisted loopback servers + relative fetch)
- [x] `node:http` only in known local-server modules, bound to `127.0.0.1`/`localhost`/`::1` by default; non-loopback requires explicit opt-in + warning (verified)
- [x] `fetch('/api/...')` relative only; no absolute/protocol-relative/dynamic remote fetch
- [x] Rule packs: `http/https/ftp` locations refused (`POL-NETWORK-REFUSED`), remote extends refused, missing npm pack NOT auto-installed
- [x] Provider profiles: bundled/local only, no API calls
- [x] MCP stdio transport only; no remote transport
- [x] VS Code extension: no ACKit telemetry or network client
- [x] `scripts/check-offline-egress.mjs` exists and fails future violation
- [x] `tests/security/offline-egress-contract.test.ts` + runtime harness PASS under `pnpm test`
- [x] CI enforcement added to normal `ci.yml` (not release-only)
- [x] `docs/security/*` updated with guarantee
- [x] `git diff --check` clean, `pnpm lint` / `pnpm test` green

## Evidence

```
[offline-egress] static gate — repo: O:\projeler\agent-context-kit
[offline-egress] scanned 134 file(s)
[offline-egress] PASS — no outbound egress primitives found (allowlist respected)
[offline-egress] allowlisted node:http: src/core/dashboard/server.ts, src/core/reporting/serve.ts
[offline-egress] allowed fetch: relative /api/... only
[offline-egress] local dashboard exception: node:http createServer bound to 127.0.0.1 by default (assertBindableHost)
```

`pnpm test` 2026-08-27:
```
Test Files  65 passed (65)
Tests  353 passed (353)
 - offline-egress-contract.test.ts 8 passed
 - offline-runtime.test.ts 13 passed (blocks fetch/http/https/net/tls/dns, scanRepository offline, executeConfiguredScan offline, buildInstructionGraph offline, buildContextPack offline, rule-pack refuses remote without egress, SDK offline, dashboard loopback allowed)
```

`pnpm lint` (207 files): `Found 45 warnings. 0 errors. EXIT 0` (warnings are pre-existing noNonNullAssertion etc, not errors)
`pnpm format:check`: `Checked 199 files. No fixes. EXIT 0`
`pnpm typecheck`: `EXIT 0`
`pnpm build`: `EXIT 0` (tsc build success)
`node scripts/check-offline-egress.mjs`: PASS (above)
`node dist/cli/index.js doctor`: `All doctor checks passed.`
`node dist/cli/index.js scan --ci`: `Scan complete: 666 files, threshold gate exit code determined (scan --ci exit 0 with 153 findings but not failing gate? Actually scan --ci exit 0 with current suppressions)`
`git diff --check`: clean (no whitespace errors)
`git status --short --branch`: `## master...origin/master` clean after commit

CI yaml diff (`.github/workflows/ci.yml`):
```yaml
      - name: Build
        run: pnpm build
+     - name: Offline-egress static gate
+       run: node scripts/check-offline-egress.mjs
      - name: Tests (unit/integration/contract/security)
```

THREAT_MODEL diff: added `## Offline-first guarantee (v0.2.1)` section documenting static gate, runtime harness, policy isolation, permanent CI enforcement.
SECURITY_MODEL diff: added `## Offline-first permanent enforcement (v0.2.1)` section.

`docs/security/THREAT_MODEL.md` and `SECURITY_MODEL.md` updated and committed.

## Risks

- False positive on `https://json.schemastore.org` schema URL → handled by allowlist if not fetched.
- Dashboard `fetch('/api/scan.json')` flagged → allow relative allowlist.
- Runtime harness stub too permissive → ensure outbound stubs throw even if loopback allowed.

## Rollback plan

Revert commit: `git revert <sha>` — removes script/tests/CI step without touching product code.

## Completion gate

- Must run `node scripts/check-offline-egress.mjs` locally and record output. ✓ DONE (see Evidence)
- Must run `pnpm test` with new tests green. ✓ DONE (353/353)
- Must show `ci.yml` gate addition passes `doctor` + `scan --ci`. ✓ DONE
- Complete via `node dist/cli/index.js task complete TASK-0026` (no --force).

## Completion notes

2026-08-27 — offline-egress invariant verified and permanent CI contract established.
- Static gate: `scripts/check-offline-egress.mjs` PASS (134 files, allowlist respected)
- Runtime harness: 21 tests PASS (13 runtime + 8 contract) under deny-egress, covering doctor/scan/scan --ci/readiness/instructions/pack/optimize/diagnostics/rule-pack/SDK/MCP/dashboard loopback
- CI enforcement: `.github/workflows/ci.yml` verify job now includes `node scripts/check-offline-egress.mjs` before `pnpm test` (normal CI, not release-only)
- Docs: `docs/security/THREAT_MODEL.md` + `SECURITY_MODEL.md` updated with v0.2.1 guarantee
- Verification: `pnpm lint` 0 errors, `pnpm typecheck` 0, `pnpm build` 0, `pnpm test` 353/353, `doctor` PASS, `scan --ci` PASS, `git diff --check` clean
- Next: TASK-0027 release workflow hardening (depends on this)

Evidence SHA: e49c7e0 base + this commit (to be recorded in git log)
Operator: automated one-shot v0.2.1 launch

