---
id: "TASK-0076"
title: "Site governance — docs-integrity CI and main protection"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0075"
createdAt: "2026-09-03"
completedAt: null
---

## Purpose

Give `Cynrath.github.io/main` PR-based governance with a lightweight no-dependency `docs-integrity` CI check, then protect `main` with a live ruleset/branch-protection requiring it — without changing design or current 0.4.0 content. Covers Part C product validation/merge coordination and Part D site work of the session goal.

Session authorization for site + product merge (recorded per Controlled-release governance): the session goal authorizes opening ONE product PR (`chore/repository-hygiene` → `master`, body via body-file + hygiene PASS), waiting for exact-head CI, squash-merging when green, syncing/deleting the temp branch; opening ONE site PR (`chore/docs-governance` → `main`) with exact-head `docs-integrity` PASS, merging with linear history, verifying post-merge, deleting the temp branch; then creating a live `main` ruleset (or strongest supported branch-protection equivalent) requiring `docs-integrity`. No version publish/tag/release authorized.

## Current-state evidence (verified live 2026-09-03)

- Site `O:\projeler\Cynrath.github.io` on `main` `0b46affe9b34797bc5eb5103519ca8385d1f3d3c` == `origin/main`, clean; no open site PR; no `.github/workflows/`; `main` unprotected (`gh api .../protection` → 404 Branch not protected).
- Generator `scripts/sync-ackit-docs.mjs` safety contract protects root site/theme files (refuses writes outside `agent-context-kit/**` + allowlisted `sitemap.xml`/`robots.txt`; refuses `assets/ackit-docs.css|js` overwrite).
- Current ACKit docs are 0.4.0 (`agent-context-kit/index.html` title/H1/footer `0.4.0`).
- Theme hashes (before): `ackit-docs.css` `80FEF98E…5202E`, `ackit-docs.js` `71B53A7F…04163`, `ackit-docs-mobile.css` `C30263E1…8533C6` (SHA-256, recorded for after-compare).
- Product validates on `chore/repository-hygiene` after TASK-0074/0075; product PR dogfoods body-file + hygiene PASS.

## Scope

- Site verifier `scripts/verify-site.mjs` (no deps): index exists; ACKit nav targets resolve; deterministic internal links resolve; CSS/JS assets exist + pages reference theme; sitemap ACKit URLs resolve; `llms.txt`/`llms-full.txt` exist; no forbidden C0 controls; single consistent current version derived (not hard-coded 0.4.0 forever); no stale `next release`/`NOT in published` wording; generator safety contract intact.
- `.github/workflows/docs-integrity.yml` with stable job/check name `docs-integrity`, on `pull_request → main` + `push → main`: checkout + Node setup + `node scripts/verify-site.mjs` + `git diff --check`. No deploy.
- Sequence: verifier/workflow → site PR → exact-head PASS → merge (linear) → push-main PASS → ruleset requiring the check → query-back + governance docs.
- Ruleset semantics: active enforcement; target main/default; no deletion; no force/non-fast-forward; linear history; PR required; required check `docs-integrity` (strict/up-to-date where supported); approvals = 0 (single maintainer, no fake reviewer); no bypass actor unless documented recovery need; strongest supported equivalent + exact limitation if plan/API blocks.
- Governance docs update (main via PR + docs-integrity; direct pushes no longer normal; future sync→branch→PR→check→merge flow).
- Product side: full gates (§12), independent verifier bundle, one product PR/merge/post-merge verification (coordinated here, implemented on product branch).

## Out of scope

- Hosted-docs redesign; CSS/JS/theme asset changes (BEFORE hash == AFTER hash; PR ideally only `.github/workflows/**`, `scripts/verify-site.mjs`, minimal governance docs; no generated HTML churn).
- New ACKit version publish/tag/release; Browser Companion; product version change.
- Force-push testing of protection; fake reviewers/approvals; bypass actors without documented need.

## Dependencies

- TASK-0075 (product hygiene checker + safe body-file workflow must exist first; site verifier reuses the same C0 policy thinking).

## Affected files / expected areas (site repo unless noted)

- `scripts/verify-site.mjs` (new); `.github/workflows/docs-integrity.yml` (new); minimal governance docs (`README.md`/governance section as repo convention dictates).
- Product repo: PR body file (scratch), merge commits, post-merge verification notes (recorded in Completion notes, not new product code).

## Acceptance criteria

- [ ] `node scripts/verify-site.mjs` passes on clean `main` and on the site PR head; design hashes unchanged; no generated HTML churn.
- [ ] `docs-integrity` succeeds exact-head on the site PR and again on merged `main`.
- [ ] Live ruleset/protection queried back and reported: ID, enforcement, branch condition, deletion/non-fast-forward/linear/PR rules, required `docs-integrity`, bypass actors.
- [ ] Site governance docs state PR + `docs-integrity` workflow; current docs still 0.4.0.
- [ ] Product PR merged at exact-head green; post-merge CI green; final branches product `master` + companion only, site `main` only; both clean local==origin; package `0.4.0`.

## Test steps

1. Site: `node scripts/verify-site.mjs` before/after; `git diff --check`; file-hash compare for the three theme assets; `git status`.
2. Site PR: confirm exact-head `docs-integrity` run green; merge; re-run on `main`.
3. `gh api` query-back of ruleset/protection; record all fields (no force-push test).
4. Product: §12 gates + hygiene scan + verifier bundle; PR CI exact-head green; post-merge CI green; `git branch -a` final check.

## Security considerations

- Verifier is read-only (no writes except process exit code); no network; no secrets; safe C0 output (no raw control echo).
- Ruleset with 0 required approvals is intentional for single maintainer — documented, not a fake review.
- No bypass actors by default; recovery path documented if one is ever added.

## Risks

- GitHub plan/API may block rulesets → fall back to strongest branch-protection equivalent and report the exact limitation (goal-mandated).
- Check-name mismatch breaks the required-check rule → pin the exact `docs-integrity` job name first and verify it appears on the PR before creating the ruleset.

## Rollback plan

- Site PR revert via normal PR (linear history preserved); ruleset change is API-reversible and reported; no force-push.

## Completion notes

(placeholder)
