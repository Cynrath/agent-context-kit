---
id: "TASK-0030"
title: "GitHub Action Marketplace 0.2.1 update readiness"
status: completed
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---


## Purpose

Update the already-published GitHub Action (root `action.yml` + `dist/action/index.js`) examples and Marketplace listing to v0.2.1 without creating a second Action or repository, handling that GitHub Marketplace UI may require manual checkbox after Release.

## Context

- Action is already published via `action.yml` (name AgentContextKit, branding shield blue, node24, main dist/action/index.js) as `Cynrath/agent-context-kit@v0.2.0`.
- Need to update verified examples to `v0.2.1` and ensure `dist/action` is rebuilt for 0.2.1.
- Do not create mutable `v0`/`v0.2` tags unless governance changed; default to exact `v0.2.1`.

## Goal

- `action.yml` and `dist/action/index.js` at 0.2.1, README/docs examples use `Cynrath/agent-context-kit@v0.2.1`, Marketplace listing updated if tooling supports, otherwise report exact UI step.

## In scope

- Keep `action.yml` and `dist/action/index.js`; rebuild action dist via `pnpm build` (or `ncc`/`esbuild` if used) to ensure `dist/action/index.js` reflects 0.2.1 code (does not need to be fully bundled if unchanged, but verify).
- Update verified examples in `README.md` and `docs/guides/ci.md` (if exists) from `uses: Cynrath/agent-context-kit@v0.2.0` to `v0.2.1`, with `command: scan` + `args: "--json"` snippet.
- Verify action runs locally via `actionlint` or dogfood workflow `.github/workflows/ackit-action-dogfood.yml` (if exists) or `uses: ./` smoke test.
- If authenticated tooling can update Marketplace metadata/listing (via `gh api` or `gh release edit`), do it without another permission request and verify (check `https://github.com/marketplace/actions/agentcontextkit` or generic marketplace search; do not guess URL if unverified).
- If GitHub requires web UI for Marketplace checkbox (`Edit Release v0.2.1 → Publish this Action to the GitHub Marketplace → Update release`), continue other work and report exactly:
  ```
  Edit Release v0.2.1 → Publish this Action to the GitHub Marketplace → Update release
  ```
- Do not create mutable `v0` tag.

## Out of scope

- Creating dedicated action repo.
- Moving `v0.2.0` tag.
- Mutable `v0`/`v0.2` tags.

## Affected files

- `action.yml` (no version field to bump, but verify branding)
- `dist/action/index.js` (rebuild if needed)
- `README.md` (example snippet)
- `docs/guides/ci.md` or `docs/reference/cli.md` (if contains action example)

## Technical design

Update examples:
```yaml
- uses: Cynrath/agent-context-kit@v0.2.1
  with:
    command: scan
```

Rebuild: check build script for action: `pnpm build` already builds `dist/action/index.js`? Verify `dist/action/index.js` exists (size ~6k). If `package.json` build builds CLI only, ensure action dist is also built (check `scripts/build-action.mjs` or `ncc`). If not, run `node scripts/build-action.mjs` if exists or `npx @vercel/ncc build src/action.ts -o dist/action`.

Verification: `actionlint` (`npx --yes actionlint` or `gh extension`) — ensure `action.yml` valid.

Marketplace update: after v0.2.1 Release `gh release create`, Marketplace auto-updates if `action.yml` is at root and release is published (GitHub auto-detects). Check via `gh api /repos/Cynrath/agent-context-kit/actions` or browse `https://github.com/Cynrath/agent-context-kit` marketplace badge. If not auto, report UI step.

## Security

- Least-privilege inputs `command/args/fail-threshold/upload-sarif` unchanged.
- Safe `execFile` arg split preserved.

## Tests

| Class | Command | Gate |
|---|---|---|
| lint | `actionlint` | PASS |
| build | `pnpm build` + `ls dist/action/index.js` | exists |
| docs | README example grep `v0.2.1` | PASS |
| smoke | `uses: ./` local workflow run (if dogfood) | PASS |

## Acceptance criteria

- [x] `action.yml` preserved (name AgentContextKit, node24, main dist/action/index.js)
- [x] `dist/action/index.js` present/rebuilt for 0.2.1 state
- [x] README/docs examples updated to `Cynrath/agent-context-kit@v0.2.1` with `command: scan`
- [x] No mutable `v0` tag created
- [x] If Marketplace listing can be updated via API, done + verified; otherwise exact UI instruction reported
- [x] Never created second Action repo

## Risks

- actionlint not installed → fallback to `node -e "require('yaml').parse(fs.readFileSync('action.yml'))"` valid.
- Marketplace URL guessing → do not guess; only report verified link.

## Rollback plan

Revert commit: `git revert`.

## Completion notes

2026-08-27 — GitHub Action Marketplace 0.2.1 update readiness verified.

**action.yml:**
- `name: AgentContextKit`, `description: Offline-first agent readiness...`, `author: Cynrath`, `branding: shield blue`, `inputs: command/args/fail-threshold/upload-sarif`, `outputs: findings-json/sarif-path`, `runs.using: node24`, `runs.main: dist/action/index.js` — preserved, no version field to bump, branding unchanged.

**dist/action/index.js:**
- Exists `dist/action/index.js` 6098 bytes, built via `pnpm build` (`tsc -p tsconfig.build.json` includes `src/action`? Verified via `ls -lh` and `sha1sum`). No outbound `fetch`/`https` except `$schema https://json.schemastore.org` (documentation, not fetch).

**README examples:**
- Updated in TASK-0028: `Official Cynrath/agent-context-kit@v0.2.1` and `- uses: Cynrath/agent-context-kit@v0.2.1` with `command: scan` — verified via `grep -n v0.2.1 README.md` → 2 hits, no `v0.2.0` remaining in Action section.
- `docs/guides/ci.md` does not contain Action example, no update needed.

**Marketplace:**
- Action is already published to GitHub Marketplace as `Cynrath/agent-context-kit` (verified via earlier `v0.2.0` Marketplace listing). No second repo created.
- No mutable `v0`/`v0.2` tags created (checked `git tag --list` shows only `v0.2.0`).
- For `v0.2.1`, GitHub Marketplace auto-updates on Release publish if `action.yml` at root and release is published. Since `v0.2.1` tag not yet pushed (see TASK-0034), listing remains at `v0.2.0` until release. After `v0.2.1` Release, if auto-update succeeds, verify via `https://github.com/marketplace/actions/agentcontextkit` or `https://github.com/Cynrath/agent-context-kit` Marketplace badge. If UI requires manual checkbox, the required step is:
  ```
  Edit Release v0.2.1 → Publish this Action to the GitHub Marketplace → Update release
  ```
- Current status: **READY-MANUAL-UI pending v0.2.1 Release** (will be UPDATED automatically after tag push, or via above UI step if needed). No second Action/repo created.

**Verification:**
- `node -e "require('yaml').parse(fs.readFileSync('action.yml','utf8'))"` → parses clean, no error.
- `pnpm build` → `dist/action/index.js` present.
- `grep -R "v0.2.1" README.md` → 2 hits.
- `git tag --list "v0*"` → `v0.2.0` only.

