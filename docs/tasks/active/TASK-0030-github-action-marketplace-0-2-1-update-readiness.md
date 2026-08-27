---
id: "TASK-0030"
title: "GitHub Action Marketplace 0.2.1 update readiness"
status: pending
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: null
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

- [ ] `action.yml` preserved (name AgentContextKit, node24, main dist/action/index.js)
- [ ] `dist/action/index.js` present/rebuilt for 0.2.1 state
- [ ] README/docs examples updated to `Cynrath/agent-context-kit@v0.2.1` with `command: scan`
- [ ] No mutable `v0` tag created
- [ ] If Marketplace listing can be updated via API, done + verified; otherwise exact UI instruction reported
- [ ] Never created second Action repo

## Risks

- actionlint not installed → fallback to `node -e "require('yaml').parse(fs.readFileSync('action.yml'))"` valid.
- Marketplace URL guessing → do not guess; only report verified link.

## Rollback plan

Revert commit: `git revert`.

## Completion notes

(placeholder) — include action.yml, dist size, README snippet diff, marketplace status (UPDATED / READY-MANUAL-UI).
