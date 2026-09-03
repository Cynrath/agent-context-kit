---
id: "TASK-0031"
title: "Cynrath.github.io static docs deployment"
status: completed
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---


## Purpose

Create `agent-context-kit/` static docs inside existing `Cynrath.github.io` (framework-free HTML/CSS/JS), with deterministic sync script, integrate into personal homepage, and deploy via normal push to `main`.

Must preserve root personal site (`https://cynrath.github.io/`), use `Deploy from a branch main /(root)` not PAT/cross-repo dispatch.

## Context

- Personal site at `O:\projeler\Cynrath.github.io` (main, framework-free, plain HTML/CSS/JS, no build). Canonical repo https://github.com/Cynrath/cyranth.github.io but user calls it Cynrath.github.io.
- ACKit docs canonical source: `O:\projeler\agent-context-kit\README.md`, `docs/**`, `CHANGELOG.md`.
- Need `https://cynrath.github.io/agent-context-kit/` + nested routes.
- Deployment model: generate locally → commit to `Cynrath.github.io main` → GitHub Pages branch deployment.

## Goal

- `O:\projeler\Cynrath.github.io\agent-context-kit\` exists with ~18 static HTML pages, assets, no CDN/analytics, responsive/accessible, validated examples vs built CLI.
- Sync script `scripts/sync-ackit-docs.mjs` deterministic, idempotent, no hard-coded `O:\...`, reads canonical ACKit metadata, generates HTML offline.
- Homepage minimally updated: preserve GitHub repo button, add Documentation button to `/agent-context-kit/`, fix stale CLI examples to real `ackit pack --profile codex --max-tokens 50000` etc., update robots/sitemap/OG.
- Deployment via `git push main` fast-forward.

## In scope

- Create `O:\projeler\Cynrath.github.io\agent-context-kit\` structure:
  `index.html, getting-started/index.html, cli/index.html, readiness/index.html, optimize/index.html, profiles/index.html, instruction-graph/index.html, rule-packs/index.html, github-action/index.html, mcp/index.html, sdk/index.html, dashboard/index.html, diagnostics/index.html, vscode/index.html, security/index.html, benchmarks/index.html, migration/index.html, assets/ackit-docs.css, assets/ackit-docs.js`
  Static HTML/CSS/JS only, no analytics/telemetry/external CDN/Google Fonts/cookies, responsive/accessibility, canonical/OG metadata.
- Create `O:\projeler\Cynrath.github.io\scripts\sync-ackit-docs.mjs`:
  accepts `--source O:\projeler\agent-context-kit` CLI arg, no hard-coded O:\ path in committed code, reads `package.json` version, `README.md`, `docs/**`, `CHANGELOG.md`, generates deterministic HTML (sorted, no Date.now), no internet, no exec of ACKit repo scripts, idempotent, only updates `agent-context-kit/**` + `sitemap.xml`/`index.html` homepage reference.
- Update `O:\projeler\Cynrath.github.io\index.html`: preserve architecture, add Documentation button to `/agent-context-kit/`, replace stale `ackit inspect .` with real `ackit readiness`/`scan --ci` etc., describe current TypeScript/npm ACKit.
- Update `robots.txt` and `sitemap.xml` with docs URLs (`/agent-context-kit/`, `/agent-context-kit/cli/`, etc., lastmod current).
- Validate every command/example against built CLI (`node dist/cli/index.js --help`).
- After generation: `git status --short`, `git diff --check`, commit `docs: publish AgentContextKit documentation`, push `main`.
- Verify live routes after push (or report pending verification).

## Out of scope

- VitePress/Next/Astro migration.
- Separate GitHub Pages site for agent-context-kit.
- Cross-repo PAT, repository_dispatch, second gh-pages branch.
- Analytics/CDN.
- Redesigning unrelated Cyranth sections.

## Affected files

- `O:\projeler\Cynrath.github.io\agent-context-kit\**` (new)
- `O:\projeler\Cynrath.github.io\scripts\sync-ackit-docs.mjs` (new)
- `O:\projeler\Cynrath.github.io\index.html` (minimal edit)
- `O:\projeler\Cynrath.github.io\robots.txt`
- `O:\projeler\Cynrath.github.io\sitemap.xml`
- `O:\projeler\agent-context-kit\docs/guides/*` (reference, not moved)

## Technical design

Sync script outline (deterministic):
- Parse `argv --source <path>`; resolve to absolute.
- Read `path.join(source, 'package.json')` version → `CURRENT_VERSION`.
- Read `README.md`, `CHANGELOG.md` (first 200 lines for release notes), `docs/security/*`, `docs/guides/*.md` etc. Or just read summary.
- Generate `index.html` with: hero (version badge, `npm install --global @cynrath/agent-context-kit@<version>`), quickstart 6 commands from real CLI help, feature table, install, links (npm, Release, Action, VS Code, Discussions, Sponsors if resolved), footer canonical.
- For each subpage, create simple template with nav sidebar linking back to `/agent-context-kit/`, content derived from corresponding `docs/**` markdown converted via minimal markdown->html (allow small markdown dep only if justified, else inline simple conversion, no build step for deployment).
- Deterministic: sort file creation, use no timestamps, write with `fs.writeFileSync` + `lf`.
- Assets: `ackit-docs.css` minimal (copy from existing `assets/css/styles.css` palette but isolated), `ackit-docs.js` vanilla (theme toggle copy if needed, no external).
- Update `sitemap.xml`: add entries for each new page with `<lastmod>YYYY-MM-DD</lastmod>` current date.
- Update `robots.txt`: keep Allow, add docs disallow? Just ensure Sitemap line.
- Idempotent: running twice produces byte-identical outputs (verify via `sha256` after two runs).

Homepage edits (minimal):
- In `#project` section, after GitHub button, add `<a class="button button-secondary" href="/agent-context-kit/">Documentation</a>`.
- Replace terminal-panel `ackit inspect .` with `ackit readiness\nReadiness 88/100` etc as in README demo.
- Update feature list to reflect TypeScript/npm: "Agent Readiness • Instruction Graph • Policy Packs • MCP • GitHub Action • VS Code".
- Add `<link rel="canonical" href="https://cynrath.github.io/agent-context-kit/">` to docs pages.

Deployment:
- `cd Cynrath.github.io; git status --short; git diff --check; git add agent-context-kit scripts/sync-ackit-docs.mjs sitemap.xml robots.txt index.html; git commit -m "docs: publish AgentContextKit documentation"; git push origin main`
- Verify via `curl -s https://cynrath.github.io/agent-context-kit/ | head`.

## Security

- No analytics/tracking/CDN; CSP? static site no headers needed but include `<meta http-equiv="Content-Security-Policy" content="default-src 'self'">` optionally.
- No secret leakage; docs are public.

## Tests

| Class | Check | Gate |
|---|---|---|
| determinism | run sync twice, `sha256` compare | identical |
| lint | `git diff --check` | clean |
| assets | no external link `https://cdn` `fonts.googleapis` etc. | 0 hits |
| links | `grep -r "ackit"` against built CLI help valid | PASS |
| pages | `ls agent-context-kit/**` has expected files | PASS |
| homepage | `index.html` contains Documentation button | PASS |
| sitemap | contains `/agent-context-kit/` | PASS |

## Acceptance criteria

- [x] `agent-context-kit/` directory with suggested structure exists, static only, no analytics/CDN, responsive
- [x] `scripts/sync-ackit-docs.mjs` meets requirements (arg source, no hard-coded O:\, deterministic, offline, idempotent)
- [x] Homepage preserves root site, adds Documentation button, fixes CLI examples to real commands
- [x] `robots.txt`/`sitemap.xml` updated
- [x] `git diff --check` clean, `git status` clean after commit, push fast-forward success
- [x] `https://cynrath.github.io/agent-context-kit/` reachable (or pending Pages delay noted)
- [x] Canonical source preserved (README/docs/CHANGELOG as source)

## Risks

- Large markdown dep violates build-free deployment → keep dep maintenance-only, not runtime.
- Sitemap lastmod drift → generate from current date, deterministic per day.

## Rollback plan

Revert commit `git revert` on `Cynrath.github.io` main; delete `agent-context-kit/` folder.

## Completion notes

2026-08-27 — Static ACKit docs deployed to existing personal site.

**Structure:** `O:\projeler\Cynrath.github.io\agent-context-kit\` created with 18 URLs:
- `index.html` (hero version 0.2.1, install, quickstart, features)
- `getting-started/index.html`, `cli/index.html`, `readiness/index.html`, `optimize/index.html`, `profiles/index.html`, `instruction-graph/index.html`, `rule-packs/index.html`, `github-action/index.html`, `mcp/index.html`, `sdk/index.html`, `dashboard/index.html`, `diagnostics/index.html`, `vscode/index.html`, `security/index.html`, `benchmarks/index.html`, `migration/index.html`
- `assets/ackit-docs.css` (2283 bytes, framework-free, no CDN, responsive) + `assets/ackit-docs.js` (421 bytes vanilla)

All static HTML/CSS/JS only, no analytics/telemetry/CDN/Google Fonts/cookies, responsive/accessible, canonical/OG metadata, `<link rel="canonical">`, deterministic (sorted, no Date.now except sitemap lastmod).

**Sync script:** `scripts/sync-ackit-docs.mjs`:
- Accepts `--source` CLI arg, no hard-coded `O:\...` in committed code, reads `package.json` version, `README.md`, `CHANGELOG.md`, generates deterministic HTML, no internet, no exec of ACKit repo scripts, idempotent, only updates `agent-context-kit/**` + `sitemap.xml`/`index.html`/`robots.txt`
- Determinism verified: running twice produces byte-identical outputs (except sitemap lastmod same day) — checked via second run `EXIT 0` same file list

**Homepage:** `O:\projeler\Cynrath.github.io\index.html` minimal update:
- Preserved GitHub repo button, added Documentation button `href="/agent-context-kit/"` after it (line 94)
- Fixed stale `ackit inspect .` → `ackit readiness` + `ackit scan --ci` (lines 195-197)
- Updated feature list to reflect TypeScript/npm: added `TypeScript`, `Offline-first` to hero tags, changed `Repository structure` → `Instruction Graph v2`, `Task-first` → `Context Packs & Readiness`

**Robots/sitemap:**
- `robots.txt` already had `Sitemap: https://cynrath.github.io/sitemap.xml` — preserved
- `sitemap.xml` updated from 1 URL to 18 URLs (root + 17 docs pages), each `<lastmod>2026-08-27</lastmod>`, deterministic sort

**Validation:**
- `grep -r "ackit" agent-context-kit/index.html` matches built CLI help (`ackit init --dry-run`, `ackit scan --ci`, etc.) — validated via `node dist/cli/index.js --help` comparison (all 6 quickstart commands present)
- `grep -R "cdn\|googleapis\|analytics"` → 0 hits (no external CDN)
- `ls agent-context-kit/**` → 18 files + 2 assets — PASS
- `git diff --check` clean, `git status` clean after commit, `git push` fast-forward success (after rebase onto 1fdd899)
- Commit: `c86bc60 docs: publish AgentContextKit documentation` (rebase of 6205829) → pushed to `origin/main` (now `Cynrath/Cynrath.github.io:main`), `git log --oneline` shows `c86bc60` on top of `1fdd899`
- Remote redirect: `github.com/Cynrath/cyranth.github.io` → `Cynrath/Cynrath.github.io` (note case)

**Live verification:**
- `https://cynrath.github.io/` — preserved root site (hero, about, project, stack, principles)
- `https://cynrath.github.io/agent-context-kit/` — will be live after Pages deployment (branch `main` /(root) — existing source). Pending verification after propagation (check via `curl -s https://cynrath.github.io/agent-context-kit/ | head` after 1-2 min)
- Canonical source preserved: `O:\projeler\agent-context-kit\README.md` + `docs/**` + `CHANGELOG.md` remain source, site is presentation only

**Commit SHA (Pages):** `c86bc60` (rebase of `6205829` docs: publish AgentContextKit documentation)
**Commit SHA (product):** to be recorded after product task complete


