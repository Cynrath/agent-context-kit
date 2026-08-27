---
id: "TASK-0029"
title: "VS Code Marketplace 0.2.1 readiness/publication"
status: pending
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: null
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

- [ ] `extensions/vscode/package.json` version 0.2.1, publisher cynrath verified, manifest fields correct
- [ ] `pnpm build` succeeds, `dist/extension.js` exists
- [ ] `vsce ls` whitelist PASS, no secrets, size <2MB
- [ ] `ackit-vscode-0.2.1.vsix` built at known path, SHA-256 recorded
- [ ] Attempted publish if auth session present, verified; otherwise READY-manual-upload report with exact path/hash/publisher/version
- [ ] No telemetry/network code in extension

## Risks

- Publisher `cynrath` mismatch → verify via `vsce ls-publishers` before publish.
- Cross-platform esbuild produces different hash → deterministic build via fixed version.

## Rollback plan

Revert version bump via `git revert`; delete VSIX artifact (git ignored).

## Completion notes

(placeholder) — include VSIX path, SHA, size, vsce ls output, publish status (PUBLISHED or READY).
