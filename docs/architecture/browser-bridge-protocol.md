# Browser Bridge Protocol — ACKit Browser Companion v0.3

Date: 2026-08-29 · Status: Draft (TASK-0045) · Reference: ADR-0025, ADR-0026, `docs/security/THREAT_MODEL_BROWSER_COMPANION.md`

## 1. Purpose

Define the narrow, read-only localhost HTTP boundary between the ACKit CLI/SDK and the MV3 extension. The bridge is the **only** channel by which the extension obtains repository-side data; the extension never touches the filesystem, never accepts filesystem paths from the webpage, and never runs shell/git commands.

## 2. Transport

- **Process**: `ackit browser start [--port <n>] [--host 127.0.0.1] [--ttl <ms>] [--extension-id <id>] [--root <path>]` spawns a Node `http.Server`.
- **Bind**: default host `127.0.0.1` (loopback). `0.0.0.0` refused unless `--allow-nonlocal` is present (and then logs a warning; CWS review expects loopback-only). `localhost`, `127.0.0.1`, `::1` treated as loopback for the `Host` header check.
- **Port**: `0` (random free) by default; actual port printed on stdout and written to `chrome.storage.session` after the user connects. The extension learns the port via manual user paste or via `ackit browser status --json`.
- **Lifetime**: server lives as long as the CLI process; closing stdout/CTRL-C or `ackit browser stop` or `POST /v1/stop` closes the listener and revokes the session token. No daemonisation.
- **Protocol**: plain HTTP (no TLS) on loopback only; no `https`, no Unix socket (Windows compatibility).

## 3. Authentication & session

- **Token generation**: `crypto.randomBytes(32).toString('base64url')` (43 chars, 256 bits). Generated once at `start`, held in bridge memory (`string | null`), never written to disk.
- **Distribution**: printed once to the terminal where `ackit browser start` was run:
  ```
  ACKit Browser Bridge running at http://127.0.0.1:58732
  Token: <base64url>
  Tell the extension to Connect (paste token) or run: ackit browser status --json
  ```
  The user copies it into the Side Panel's Connect field, which stores it in `chrome.storage.session` (session scope, cleared on browser close and on Emergency Disconnect). The CLI never logs the token elsewhere.
- **Transmission**: every request MUST carry `Authorization: Bearer <token>` (case-sensitive, no `?token=` query). Missing/invalid → `401 Unauthorized` with `WWW-Authenticate: Bearer`.
- **Revocation**: `POST /v1/stop` (see §7) atomically clears the in-memory token and sets `revoked=true`; subsequent requests → `401`. `ackit browser stop` is the same call from the local shell. Emergency Disconnect in the extension clears `chrome.storage.session` + aborts fetches + calls `POST /v1/stop` if reachable.
- **TTL / rotation**: default TTL 12h (43200000 ms). After expiry the bridge returns `401` with `X-ACKit-Bridge-Expired: 1` and refuses until restarted. `--ttl 0` means no expiry (dev only). Rotation requires restart (no refresh endpoint in v0.3).
- **Rate limiting**: token bucket per token: 60 req/min, burst 10. Excess → `429 Too Many Requests` with `Retry-After: 1`. Tested in `tests/security/browser-bridge-rate-limit.test.ts`.

## 4. Host / Origin validation (DNS rebinding defense)

All defenses are checked **in this order** before auth, so auth failure does not mask a rebinding attempt.

1. **Host header**: must be exactly `127.0.0.1:<port>` or `localhost:<port>` or `[::1]:<port>` where `<port>` equals the bound port. Case-insensitive host, exact port. Any other `Host` (e.g. `evil.com`, `127.0.0.1:other`, `attacker.com:58732`) → `403 Forbidden` with `text/plain` body `forbidden: bad Host` and no `Access-Control-Allow-Origin`. Empty `Host` → `403`.
2. **Origin header**: must be absent (same-origin fetch from same loopback is allowed for `curl`/`ackit browser status`) **or** `chrome-extension://<id>` where `<id>` equals the pinned extension id. After the first successfully authenticated request the bridge pins that `Origin` value for the session; later requests with a different `Origin` → `403`. `Origin: null` or `Origin: https://...` from a website → `403`. In dev, `--extension-id <id>` pre-pins the value so the first request can be validated.
3. **No cookie auth**: bridge never reads `Cookie`, ignores `credentials: include` semantics; auth is header only, so CSRF via `<img src>` cannot pass.

## 5. CORS

- Request method `OPTIONS` (preflight) is handled at `/*` before routing: it must carry `Origin: chrome-extension://<id>` (pinned) and a valid `Authorization` header (the browser will send `Access-Control-Request-Headers: authorization`). If not → `403`.
- On success: `Access-Control-Allow-Origin: <pinned origin>` (echo, not `*`), `Access-Control-Allow-Methods: GET, POST`, `Access-Control-Allow-Headers: Authorization, Content-Type`, `Access-Control-Max-Age: 600`, `Vary: Origin`.
- On actual `GET /v1/*` success: same `Access-Control-Allow-Origin` echoed, plus security headers listed in §6. No `Access-Control-Allow-Credentials`.
- Non-extension dev tools (`curl`) with no `Origin` bypass CORS and return the JSON directly (still requires `Authorization`).

## 6. Security headers (every response)

```
Content-Security-Policy: default-src 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cache-Control: no-store
Content-Type: application/json; charset=utf-8   (JSON endpoints)
```

`Cache-Control: no-store` ensures secrets/task content are not cached by the browser.

## 7. API surface (v0.3, read-only)

All routes are under `/v1/`. Any unknown route → `404` JSON `{ code:"NOT_FOUND", message:"..." }`. Any non-GET except `/v1/stop` → `405` with `Allow: GET`.

### 7.1 `GET /v1/status` — liveness + version

Request: `Authorization: Bearer <token>`, `Host` + `Origin` checks as above.

Response `200`:
```json
{
  "ok": true,
  "version": "0.2.2",
  "engineVersion": "0.2.2",
  "root": "O:\\projeler\\agent-context-kit",
  "canonicalRoot": "O:\\projeler\\agent-context-kit",
  "uptimeMs": 12345,
  "ttlMs": 43200000,
  "revoked": false
}
```

Notes: `root` and `canonicalRoot` are server-side only; they are not echoed for arbitrary user-supplied paths (no path param). `version` comes from `getPackageIdentity().version`.

### 7.2 `GET /v1/repository` — repo identity

```json
{
  "root": "O:\\projeler\\agent-context-kit",
  "canonicalRoot": "O:\\projeler\\agent-context-kit",
  "configDigest": "sha256:...",
  "workspaces": [{ "name":"...", "root":"..." }]
}
```

Derived from `resolveRepositoryRoot` + `workspaces` detector. No absolute secrets.

### 7.3 `GET /v1/task/active` — active task

- Reads `TaskStore` for the resolved root.
- Returns the first `status: active` task else the oldest `pending` task else `null`.

```json
{
  "task": {
    "id": "TASK-0044",
    "title": "Browser Companion v0.3 — architecture decision & threat model",
    "status": "completed",
    "dependencies": [],
    "bodyPreview": "…first 800 chars…"
  } | null
}
```

`bodyPreview` is truncated to 800 chars server-side to respect the 512KB cap.

### 7.4 `GET /v1/instructions/effective?for=<path>&provider=<id>`

- `for` is repo-relative, optional, defaults to `"."`; validated by `normalizeRelativePath → join canonicalRoot → realpath → isInsideRoot` (same gate as scanner). Traversal (`..`) → `400`.
- `provider` optional, one of `codex|claude|gemini|copilot|generic`.

Response:
```json
{
  "graph": { "nodes": [...redacted...], "diagnostics": [] },
  "effective": { "stack": [...], "provider": "claude" }
}
```

### 7.5 `GET /v1/context?profile=<name>&maxTokens=<n>`

- Calls `buildContextPack(root, { maxTokens: clamp(maxTokens, 1, 80000) || 40000, profile })`.
- `profile` validated against `ProfileSchema`, unknown → `400`.
- Response JSON capped at 512KB (pack truncated by engine; if still large, `pack.truncated = true`).

```json
{
  "pack": {
    "markdown": "…truncated…",
    "manifest": [{ "path":"AGENTS.md","tokens":123 }],
    "budget": { "maxTokens": 40000, "usedTokens": 38210 }
  }
}
```

No file content beyond the pack's budget; secrets already redacted at pack construction.

### 7.6 `GET /v1/readiness` — readiness score

```json
{ "score": { "overall": 88, "categories": [...], "deductions": [...] } }
```

### 7.7 `GET /v1/evidence?limit=100&offset=0` — findings evidence

- Paginates `scanRepository` findings (deterministic sort already applied). `limit` clamped 1..100, `offset` >=0.
- Each finding's `evidence` is already redacted at construction; bridge re-runs `<local-path>` scrub as defense in depth.

### 7.8 `POST /v1/stop` — revoke & close

Requires same `Authorization` + `Host`/`Origin` checks. Body ignored (optional `{}`). Action: set `revoked=true`, clear token, respond `200 { ok:true, revoked:true }`, then `setTimeout(() => server.close(), 100)` so the response flushes before close. Subsequent requests → `401`.

### 7.9 `GET /v1/health` — unauthenticated liveness (optional, not privileged)

- No `Authorization` required, still requires correct `Host` (but not `Origin` pin). Returns `{ ok:true, revoked:false }`. Used by `ackit browser status` to probe liveness before prompting for token. Must never return task/pack/secrets.

## 8. Errors

All errors are JSON with `code` and `message` (no stack):
```json
{ "code": "UNAUTHORIZED", "message": "missing or invalid Authorization header" }
```
Codes: `BAD_HOST`, `BAD_ORIGIN`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `BAD_REQUEST`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `EXPIRED`.

## 9. Redaction & size limits

- Every JSON serialization passes through `redactForBridge(object)`:
  - `AKIA[0-9A-Z]{16}` → `[REDACTED]`
  - `ghp_[0-9a-zA-Z]{36}` → `[REDACTED]`
  - `-----BEGIN PRIVATE KEY-----...` → `[REDACTED]`
  - `C:\\Users\\...` / `C:\U...` and `/home/...` → `<local-path>`
- Max serialized response 512KB. If `JSON.stringify` exceeds, the handler returns `413` with `code: PAYLOAD_TOO_LARGE` instead of truncating mid-JSON.
- Bridge never emits absolute paths outside `canonicalRoot`; any repo-relative path is POSIX-normalized.
- `prefers-constrained CLIs run acyclicTokenParent` — no `eval`, no `exec`.

## 10. Non-goals in v0.3

- No `POST` that writes repository state.
- No websocket/SSE — simple `GET` polling from the extension with debounce (extension side).
- No multi-session/token-list — one token per server lifetime (restart to rotate).
- No remote `https` bridge — loopback only.

## 11. Client contract (extension side)

- Extension stores token in `chrome.storage.session` (`ackit:browser:token`) and `host:port` in `chrome.storage.local` (`ackit:browser:endpoint`).
- Every fetch uses `signal` from an `AbortController` that Emergency Disconnect aborts.
- Fetch wrapper validates `Content-Type` is `application/json`, `Content-Length` guard before `response.json()`, and aborts on oversize.
- No `fetch` to any host other than `http://127.0.0.1:<port>` (enforced by CSP `connect-src http://127.0.0.1:*` in extension manifest).
- `Emergency Disconnect` → `controller.abort()`, `chrome.storage.session.clear()`, `alarms.clearAll()`, `adapter.disconnect/restore`, set `disabledSites[host]=true`, show Reconnect button, call `POST /v1/stop` best-effort.

## 12. CLI surface

```
ackit browser start [--port <n>] [--host 127.0.0.1] [--ttl <ms>] [--extension-id <id>] [--root <path>] [--json]
ackit browser status [--json]
ackit browser stop [--json]   // alias: ackit bridge stop
ackit bridge               // alias to browser
```

- `start` writes to stdout the URL + token once, stays alive until Ctrl+C. `--json` prints `{ url, port, host, ttlMs, extensionId }` plus token on stderr (so stdout JSON stays machine-parseable).
- `status` probes `GET /v1/health` and, with token from `ACKIT_BROWSER_TOKEN` env or user paste, `GET /v1/status`. Exit codes follow ADR-0007 (0 ok, 2 usage/config, 3 environment).
- `stop` reads endpoint from `status` or `--port` and sends `POST /v1/stop`.

## 13. Conformance tests (CI, no MCP needed)

- `tests/security/browser-bridge-host.test.ts` — Host header exact-port enforcement, missing Host →403.
- `tests/security/browser-bridge-origin.test.ts` — Origin pinning, missing/invalid Origin →403, preflight.
- `tests/security/browser-bridge-auth.test.ts` — token required, bearer parsing, revocation.
- `tests/security/browser-bridge-cors.test.ts` — headers exact, no wildcard.
- `tests/security/browser-bridge-payload.test.ts` — 512KB cap, rate limit 429, redaction.
- `tests/unit/browser-bridge/routes.test.ts` — deterministic responses for each /v1/* handler via injectable fake SDK.

## 14. MCP verification (when Chrome DevTools MCP is available)

- Start bridge (`node dist/cli/index.js browser start --port 0 &`) then launch isolated Chrome with the unpacked `extensions/browser/` via `mcp__chrome-devtools__*` `install_extension` / `list_extensions`, open `https://chatgpt.com`, `https://claude.ai`, `https://gemini.google.com`, `https://github.com/Cynrath/agent-context-kit`, verify Side Panel opens, Connect with token, `/v1/status` live, and network panel shows only `127.0.0.1` bridge requests plus provider fetches.

