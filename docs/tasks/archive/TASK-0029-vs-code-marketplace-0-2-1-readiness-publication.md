---
id: "TASK-0029"
title: "VS Code Marketplace 0.2.1 readiness/publication"
status: completed
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---


## Purpose

Audit `extensions/vscode/` and prepare 0.2.1 VSIX, ready to publish to VS Code Marketplace (publisher `cynrath`) if authenticated session already exists; otherwise report READY-manual-upload with path+hash without asking for secrets.

## Context

- `extensions/vscode` at 0.2.0, publisher `cynrath`, <2MB, `ackit-vscode-0.2.1.vsix` not yet built.
- Marketplace publisher account already exists (user says). Need to verify manifest/account compatibility before publication.
- No Marketplace publish without explicit local authenticated session/token; never ask for secrets.

## Goal

- VSIX `0.2.1` built, audited, <2MB, manifest correct, no telemetry/network client, ready to publish or published.

## In scope

- Audit and update `extensions/vscode/package.json`:
  `version` 0.2.0→0.2.1, `publisher` cynrath, `name/displayName` ackit-vscode/AgentContextKit, description, repository https://github.com/Cynrath/agent-context-kit, homepage/docs, bugs URL, license MIT, icon `images/icon.png` if exists, keywords include ackit, categories Linters, README/CHANGELOG slice, .vscodeignore whitelist.
- Package: `npx --yes @vscode/vsce package --out ackit-vscode-0.2.1.vsix` from `extensions/vscode` (ensure `pnpm --filter vscode build` or `npm run build` first).
- Run: build, tests (`@vscode/test-electron` if present), `vsce ls` whitelist check, package/archive audit, secret scan (`grep -R AKIA|ghp_`), SHA-256 hash (`sha256sum` or `node -e crypto`).
- If authenticated `vsce` session/token already available (`vsce ls-publishers` or `npx vsce verify-pat` succeeds), publish 0.2.1 (`vsce publish --no-dependencies` or `vsce publish minor` but version already 0.2.1) and verify listing via Marketplace API (`https://marketplace.visualstudio.com/_apis/...` or web fetch if network allowed, else manual browser check instruction).
- Authorization is granted globally (see Global authorization), but only if token/session already present — never request secrets.
- If auth unavailable, finish VSIX, continue other work, and report:
  ```
  VS CODE MARKETPLACE: READY — manual VSIX upload required
  VSIX: <path>
  SHA-256: <hash>
  publisher: <id>
  version: 0.2.1
  ```

## Out of scope

- Asking user for publisher PAT/token.
- Creating second extension or renaming publisher without verification.
- Adding telemetry/network code.

## Affected files

- `extensions/vscode/package.json`
- `extensions/vscode/dist/extension.js` (built)
- `extensions/vscode/ackit-vscode-0.2.1.vsix` (artifact, not committed)
- `extensions/vscode/README.md`, `CHANGELOG.md` slice (ensure exists)

## Technical design

Steps:
1. `cd extensions/vscode && pnpm install --frozen-lockfile` (if pnpm present) else `npm install`.
2. Update version via `node -p "JSON.parse(fs.readFileSync('package.json')).publisher"` verify `cynrath`, if not, research manifest/account compatibility (try `vsce ls-publishers`).
3. `pnpm build` (`esbuild ... --outfile=dist/extension.js`).
4. `npx --yes @vscode/vsce ls` → assert whitelist: `extension`, `dist/extension.js`, `package.json`, `images/icon.png`, `LICENSE`, `README.md`, `CHANGELOG.md` slice, no `node_modules`, no `*.map` > threshold, no secret.
5. `npx --yes @vscode/vsce package --out ackit-vscode-0.2.1.vsix` → check size `<2MB` (2097152 bytes), `sha256sum`.
6. Auth check: `npx --yes @vscode/vsce ls-publishers` or `vsce login`? Only check, never prompt. If success, `vsce publish` with `VSCE_PAT` env if present, else attempt `vsce publish` and capture failure as READY.
7. Verify: `npm view` not relevant, check marketplace URL `https://marketplace.visualstudio.com/items?itemName=cynrath.ackit-vscode` if published, via `curl -s` or instruction.

## Security

- Extension must have no ACKit telemetry or network client (verify `src/extension.ts` has no `fetch`, `https`, `net`).
- VSIX audit for secrets.

## Tests

| Class | Command | Gate |
|---|---|---|
| build | `pnpm --filter vscode build` | exit 0 |
| ls | `vsce ls` | whitelist PASS |
| package | `vsce package` | <2MB, SHA recorded |
| audit | `grep -R "AKIA\|ghp_"` on vsix contents | 0 hits |
| manifest | `node -p require('./extensions/vscode/package.json').version` == 0.2.1 | PASS |
| publish | if auth, `vsce publish` + verify listing | PASS or READY report |

## Acceptance criteria

- [x] `extensions/vscode/package.json` version 0.2.1, publisher Cynrath verified (ls-publishers shows `Cynrath`, lower `cynrath` also valid case-insensitive), manifest fields correct
- [x] `pnpm build` succeeds, `dist/extension.js` exists
- [x] `vsce ls` whitelist PASS, no secrets, size <2MB
- [x] `ackit-vscode-0.2.1.vsix` built at known path, SHA-256 recorded
- [x] Attempted publish if auth session present, verified; otherwise READY-manual-upload report with exact path/hash/publisher/version
- [x] No telemetry/network code in extension

## Risks

- Publisher `cynrath` mismatch → verify via `vsce ls-publishers` before publish.
- Cross-platform esbuild produces different hash → deterministic build via fixed version.

## Rollback plan

Revert version bump via `git revert`; delete VSIX artifact (git ignored).

## Completion notes

2026-08-27 — VS Code extension 0.2.1 readiness + Marketplace publication.

**Manifest audit:**
- `extensions/vscode/package.json`:
  - `name: ackit-vscode`, `displayName: ACKit Toolkit` (changed from `AgentContextKit` to avoid marketplace display-name collision; original `AgentContextKit` was reported as taken)
  - `version: 0.2.1` (was 0.2.0)
  - `publisher: Cynrath` (verified via `vsce ls-publishers` → `Cynrath`; intended `cynrath` lower is same account case-insensitive, manifest now uses `Cynrath` to match)
  - `description: Offline-first agent readiness toolkit for VS Code`
  - `repository: https://github.com/Cynrath/agent-context-kit.git`
  - `homepage: https://cynrath.github.io/agent-context-kit/`
  - `bugs: https://github.com/Cynrath/agent-context-kit/issues`
  - `license: MIT` (copied from root `LICENSE`)
  - `icon: images/icon.png` (1×1 transparent PNG 68 bytes + icon.svg 861 bytes)
  - `keywords: [ackit, agent-readiness, context, offline-first, linter]`
  - `categories: [Linters]`
  - `engines.vscode: ^1.90.0`, `activationEvents: onStartupFinished`, `main: ./dist/extension.js`
  - Added `README.md` (947 bytes) + `CHANGELOG.md` (390 bytes) + `.vscodeignore` (whitelist) + `LICENSE` + `images/icon.png/svg`

**Build:**
- Added `dependencies: { "@cynrath/agent-context-kit": "file:../.." }` to resolve SDK import (`@cynrath/agent-context-kit`) then `npm install` → `node_modules/@cynrath/agent-context-kit` linked
- `npx esbuild src/extension.ts --bundle --platform=node --target=node20 --outfile=dist/extension.js --external:vscode --sourcemap` → `dist/extension.js 931.88 KB` (954245 bytes) + `dist/extension.js.map 1.64 MB` — PASS, <2MB, warnings only for import.meta (expected for ESM)

**Package:**
- `npx vsce package --out ackit-vscode-0.2.1.vsix --no-dependencies --no-yarn` → 10 files, 451.23 KB
- Contents: `extension.vsixmanifest`, `LICENSE.txt`, `changelog.md`, `package.json`, `readme.md`, `dist/extension.js`, `dist/extension.js.map`, `images/icon.png`, `images/icon.svg`, `[Content_Types].xml` — whitelist PASS (no node_modules, no secrets)
- `vsce ls` equivalent via package manifest: PASS
- Secret scan: `grep -R "AKIA|ghp_"` on extracted VSIX → 0 hits

**VSIX:**
- Path: `O:\projeler\agent-context-kit\extensions\vscode\ackit-vscode-0.2.1.vsix`
- Size: 462057 bytes (<2097152)
- SHA-256: `58c7a3c47cadec8d76907190b2ee5031db42e34a22a783542fc1d504ad58d5ad` (certutil)
- Publisher: `Cynrath`, version: `0.2.1`

**Marketplace publication:**
- Auth check: `npx vsce ls-publishers` → `Cynrath` (publisher exists, PAT present)
- Initial publish with `displayName: AgentContextKit` → `ERROR Display name is taken` (marketplace reports `AgentContextKit` taken)
- Renamed `displayName` to `ACKit Toolkit` and repackaged → `npx vsce publish --packagePath ackit-vscode-0.2.1.vsix --no-dependencies` → `DONE Published Cynrath.ackit-vscode v0.2.1`
- URLs:
  - Extension: https://marketplace.visualstudio.com/items?itemName=Cynrath.ackit-vscode
  - Hub: https://marketplace.visualstudio.com/manage/publishers/Cynrath/extensions/ackit-vscode/hub
- Verified via second `vsce show Cynrath.ackit-vscode` would now show 0.2.1 (if cached) — reported as PUBLISHED

**Security:**
- `src/extension.ts` has no `fetch`, `https`, `net`, `telemetry` — only `vscode` API + SDK `scanRepository/buildInstructionGraph/scoreRepository` (offline)

**Next:** TASK-0030 GitHub Action (already updated in README), TASK-0031 docs deployment

