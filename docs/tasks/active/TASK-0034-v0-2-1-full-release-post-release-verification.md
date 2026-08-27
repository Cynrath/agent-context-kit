---
id: "TASK-0034"
title: "v0.2.1 full release + post-release verification"
status: pending
schemaVersion: 2
dependencies: ["TASK-0027", "TASK-0028", "TASK-0029", "TASK-0030", "TASK-0031", "TASK-0032", "TASK-0033"]
createdAt: "2026-08-27"
completedAt: null
---


## Purpose

Execute v0.2.1 full release + post-release verification including version bumps, CHANGELOG, README, hosted docs, quality gate, annotated tag, OIDC npm publish, GitHub Release, global update, docs re-sync, and final audit. This task depends on all prior tasks green.

## Context

- Prior tasks 0026-0033 must be completed and CI-green, working tree clean, HEAD == origin/master, exact-SHA CI green, npm 0.2.1 absent, tag absent, Release absent, Trusted Publishing active.
- Authorization is already granted globally (Global authorization section) — do not ask again.
- Order mandated: gates → exact tarball → OIDC publish → registry verify → fresh consumer → npx secondary → GitHub Release last.

## Goal

- `v0.2.1` released, npm latest 0.2.1, tarball shasum/integrity/provenance verified, fresh consumer PASS, GitHub Release exists, global ackit 0.2.1, hosted docs re-synced, final dual-repo audit PASS.

## In scope

- Prepare v0.2.1:
  `package.json` 0.2.0→0.2.1, `pnpm-lock.yaml` via `pnpm install`, `CHANGELOG.md` add `[0.2.1] - 2026-08-27` (or current date) with Fixed/Changed/Security per hardening (offline gate, release workflow fresh consumer, README parity, docs deployment, sponsors, benchmark safety), `README.md` badges/links 0.2.0→0.2.1 (if not done in TASK-0028), `extensions/vscode/package.json` 0.2.0→0.2.1, `action.yml` examples (if not done), hosted docs current version.
- Audit tarball: `npm pack --json` → extract → compare README parity SHA-256, no secrets, no absolute paths, no clones, no temp artifacts.
- Full quality gate at candidate SHA:
  `pnpm install --frozen-lockfile, pnpm lint, pnpm format:check, pnpm typecheck, pnpm gen:schemas, pnpm build, pnpm test, pnpm smoke:cli, pnpm run smoke:package, node dist/cli/index.js config check, doctor, task doctor, skills validate, instructions, scan --ci, git diff --check` plus offline-egress contract, runtime deny-egress, remote-git prohibition, release workflow contract, fresh isolated consumer sim, npm README parity, GitHub Action dogfood, VS Code build/test/package/audit, docs generator determinism, Cynrath.github.io link/assets, benchmark safety, tarball audit.
- Push normal implementation commits and verify exact-SHA CI (10/10 or matrix legs) green via `gh run list --branch master`.
- When gates green, create annotated `v0.2.1` on exact verified source SHA (`git tag -a v0.2.1 -m "AgentContextKit v0.2.1" <sha>`) and push only that tag (`git push origin v0.2.1`).
- Do NOT run manual npm publish in parallel; let tag-triggered OIDC workflow publish.
- Verify after publish:
  `npm view @cynrath/agent-context-kit@0.2.1 version == 0.2.1`, `dist-tags.latest == 0.2.1`, `dist.shasum/integrity`, provenance.
  Fresh temp-cache/temp-consumer install + `ackit --version|help` PASS, tarball README parity.
  `npx --yes @cynrath/agent-context-kit@0.2.1 --version` secondary.
  GitHub Release `v0.2.1` via `gh release view` (body == CHANGELOG section + header).
- Update local global: `npm install --global @cynrath/agent-context-kit@0.2.1`, verify `Get-Command ackit -All` / `where.exe ackit` npm global, no legacy .dotnet.
- Re-sync hosted docs after release: `node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit` in Pages repo, commit/push main, verify live routes.
- Marketplace updates after release: VS Code if auth publish, Action update if tooling supports.
- Final dual-repo audit:
  agent-context-kit: master clean, origin/master exact, task doctor green, v0.2.1 tag correct, npm latest 0.2.1, GitHub Release correct, README current, parity PASS, FUNDING current, topics exactly 20, website correct.
  Cynrath.github.io: main clean, origin/main exact, root homepage works, /agent-context-kit/ works, nested docs, sitemap, robots, no analytics.
  Offline-first: static egress PASS, runtime deny PASS, dashboard loopback PASS, rule-pack remote fetch REFUSED, MCP stdio only, VS Code egress NONE.

## Out of scope

- Move/delete prior tags v0.1.x/v0.2.0.
- Force-push, rebase, workflow dispatch, deployments.

## Affected files

- `package.json`
- `CHANGELOG.md`
- `README.md`
- `extensions/vscode/package.json`
- `action.yml` (if needed)
- `.github/workflows/*` already hardened
- `docs/tasks/active/TASK-0034*` (this file)

## Technical design

Prepare:
- `node -e "let p=require('./package.json');p.version='0.2.1';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"` then `pnpm install --frozen-lockfile`? Actually `pnpm install` will update lockfile? Need `pnpm install` without --frozen if version changed then `pnpm install` again --frozen will pass.
- Similar for vscode: `node -e "..."` `extensions/vscode/package.json` version.
- Edit CHANGELOG: prepend `## [0.2.1] - 2026-08-27` with content: `maintenance sync` etc. Keep Keep-a-Changelog format.
- Edit README badges/examples via script or manual.

Quality gate: run all commands sequentially, capture output, ensure `git status --short` empty except intended changes, `git diff --check` clean.

Tag: `git tag -a v0.2.1 <sha> -m "AgentContextKit v0.2.1"` then `git push origin v0.2.1` — uses `origin` (https now, but push via gh auth? ensure `git remote -v` is https, push will use stored credential via `gh auth setup-git`? If fails, report manual push command.)

Publish verification: poll `npm view` 30×10s, check shasum via `npm view @cynrath/agent-context-kit@0.2.1 dist.shasum --json`.

Global update: `npm install --global @cynrath/agent-context-kit@0.2.1` then `ackit --version` + `where.exe ackit`.

Docs re-sync: `cd Cynrath.github.io && node ./scripts/sync-ackit-docs.mjs --source O:\projeler\agent-context-kit && git add . && git commit -m "docs: sync AgentContextKit v0.2.1" && git push`.

## Security

- Offline-first unchanged.
- No secrets, no force-push.

## Tests

As per quality gate list (see In scope) — all must be green.

## Acceptance criteria

- [ ] Preparatory commits pushed, CI green at exact SHA, npm 0.2.1 absent verified, tag absent verified
- [ ] Annotated `v0.2.1` created on exact SHA, pushed, triggers release workflow
- [ ] OIDC npm publish success, registry `version=0.2.1`, `latest=0.2.1`, shasum/integrity/provenance verified
- [ ] Fresh isolated consumer PASS, npx secondary PASS
- [ ] GitHub Release `v0.2.1` created last, body == CHANGELOG, title correct, not draft
- [ ] Global ackit 0.2.1 via npm global, no legacy .dotnet
- [ ] Hosted docs re-synced after release, live verification
- [ ] Final dual-repo audit checklist all PASS
- [ ] Report generated per Section 29 template

## Risks

- Registry propagation delay → bounded retries.
- npx cache failure → fresh consumer still proves; do not republish.
- If publish succeeds but Release fails → do not republish, repair Release only.
- Working tree not clean → stop.

## Rollback plan

- If publish succeeded, never republish; fix Release manually.
- Tag immutable once pushed; never move.

## Completion notes

(placeholder) — will contain: final SHAs, CI run IDs, tag object/source SHA, npm shasum/integrity/provenance, Release URL, VSIX SHA, Marketplace URLs, verification logs.
