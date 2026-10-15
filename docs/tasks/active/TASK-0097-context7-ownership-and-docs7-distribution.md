---
id: "TASK-0097"
title: "Context7 ownership-ready configuration and Docs7 documentation distribution"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-10-15"
completedAt: null
---

## Purpose

Expose the maintained ACKit documentation to Context7 and prepare Docs7 hosting on the existing public GitHub repository, without changing the offline-first ACKit runtime or replacing existing docs hosting.

## Scope

- Add a documented `context7.json` in the repository root with library metadata and curated indexing scope; never invent a Context7 claim public key.
- Add `docs/docs.json`, `docs/index.mdx` and a guide for claiming, verifying, connecting Docs7, refreshing and checking the library.
- Preserve current GitHub Pages and immutable published versions.
- Add discoverability links for maintainers and a changelog Unreleased entry, if appropriate.
- Plan a separate patch release only after repo gates, actual Context7 ownership verification and Docs7 production build proof; no tags, publishing or deployments in this task.

## Out of scope

- ACKit CLI/API/runtime, MCP behavior, schemas or offline-first semantics.
- Publishing to npm, VS Code Marketplace, GitHub Releases or modifying tags.
- Context7 credentials, account authorization or automatic verification badge claims.
- Replacing existing GitHub Pages hosting.

## Affected files

- `context7.json` (new)
- `docs/docs.json` and `docs/index.mdx` (new)
- `docs/guides/context7-docs7.md` (new)
- `README.md` and `CHANGELOG.md` (limited links and notes only)

## Acceptance criteria

- [ ] Repository metadata and exclusions match official Context7 schema.
- [ ] Docs7 schema and navigated paths match actual docs; existing pages remain source of truth.
- [ ] Claim instructions require exact per-library public key from the owner's Context7 panel.
- [ ] Existing hosting and released package identities are unchanged.
- [ ] Validated by repository checks, PR CI and Docs7 production build; external verification clearly recorded.
- [ ] Release decision follows repository release governance and only occurs after complete evidence.

## Test steps

1. Validate `context7.json` and `docs/docs.json` JSON syntax and referenced documentation routes.
2. Run text hygiene, `git diff --check`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`, smokes, ACKit doctor/task doctor/scan.
3. Require exact-head PR CI green before merge.
4. Owner copies `public_key` from the Context7 Claim Library dialog, commits it to the default branch, claims the library and requests verification.
5. Owner connects Docs7 Free to `master` / `docs`; inspect production build and agent-readable endpoints.
6. Only then assess if a patch release is warranted.

## Security considerations

- The `public_key` is a public ownership challenge, not a Context7 API token. Do not place API tokens or secrets in Git.
- No network integration added to runtime. Avoid scraping stale task/history docs into agent recommendations.
- Docs7 hosting is opt-in; connecting GitHub requires the owner's explicit account action.

## Risks

- Context7 ownership cannot be claimed without the user-specific, dashboard-issued key.
- Docs7 build results are external and are not proved by static config validation.
- Docs-only release churn conflicts with maintenance-mode principles; decide only after evidence.

## Rollback plan

Revert the documentation/configuration PR; keep historical tags/releases untouched.

## Completion notes

PENDING. The GitHub connector provides file edits but no checkout/execution; source checkout failed DNS resolution to github.com (`Could not resolve host: github.com`) and pnpm is unavailable in the container, so the repository-built CLI could not allocate a task ID. `TASK-0097` uses the next unused ID after checked `TASK-0096` as a documented manual fallback. No local validation, Docs7 deploy, claim or badge may be asserted.
