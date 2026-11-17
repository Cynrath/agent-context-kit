---
id: "TASK-0097"
title: "Context7 ownership-ready configuration and Docs7 documentation distribution"
status: pending
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

- [x] Repository metadata and exclusions match official Context7 schema.
- [x] Docs7 schema and navigated paths match actual docs; existing pages remain source of truth.
- [x] Claim instructions require exact per-library public key from the owner's Context7 panel.
- [x] Existing hosting and released package identities are unchanged.
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

Current status: external ownership and production proof are now available.
The conditional claim-key instruction has been clarified without adding any
challenge or credential. Exact-head validation of this documentation follow-up
is still required before completing and archiving the task.

### Original blocked checkpoint (historical, retained verbatim)

PENDING. The GitHub connector provides file edits but no checkout/execution; source checkout failed DNS resolution to github.com (`Could not resolve host: github.com`) and pnpm is unavailable in the container, so the repository-built CLI could not allocate a task ID. `TASK-0097` uses the next unused ID after checked `TASK-0096` as a documented manual fallback. No local validation, Docs7 deploy, claim or badge may be asserted.

### Audit checkpoint 2026-11-17

The source checkout and pinned pnpm are now executable. The guide already says
the maintainer's teamspace owns the library, but this record has no successful
Docs7 production build, endpoint or exact-head CI evidence. Literal acceptance
therefore remains open; do not complete/archive it. TASK-0101 will reconcile the
local checks and external evidence. TASK-0098 is the next dependency-ready audit
task; historical blocked TASK-0087/0092/0093 remain untouched.

### Local evidence reconciliation 2026-11-17 (TASK-0101)

- The current official Context7 schema was fetched over HTTPS (200) and
  `context7.json` validated with AJV plus standard formats: true, no errors.
- All 32 `docs/docs.json` navigation routes resolve to actual `.md`/`.mdx` files.
  The required name/colors/navigation and filterSidebar fields match the current
  official Docs7 quickstart/configuration docs. The guide now links current plan
  details instead of making the obsolete claim that previews require Pro.
- Formal compilation of the downloaded upstream Docs7 schema is inconclusive:
  AJV's Unicode regex mode rejects its unrelated PostHog API-key pattern
  `^phc\_` (`Invalid escape` at
  `anyOf.0.properties.integrations.properties.posthog.properties.apiKey.pattern`).
  The repository configuration contains no PostHog integration. No schema gate
  was disabled or provider schema rewritten to hide this external incompatibility.
- **Not run:** Docs7 production build, live site/agent endpoints, account/admin
  ownership or badge verification. No deployment/account action is authorized
  by the corrective patch tasks. The task stays blocked, not completed/archived;
  this external documentation work is not a patch-publication prerequisite.

### External evidence reconciliation 2026-11-17

- Public Context7 library `https://context7.com/cynrath/agent-context-kit`
  returns 200. Provider metadata reports
  `claimedBy=f799b9e6-8500-464e-a177-3bf3216860aa`, `verified=true`,
  `verifiedAt=2026-10-15T10:16:21.849Z`, `configSource=context7json`.
  This is provider read-back, not an inferred badge or a new account action.
- Docs7 Production check `134103983215` on master
  `b7f07d68638a288a0c802f72dedd329014f4679d` concluded success with
  "Deployment succeeded". The provider's existing site/deployment records are
  `2adaa5e1-d7a5-49d4-9c9d-040f49885e22` /
  `3fdd8869-f560-49b1-a866-c03963f2050f`, in the same owner teamspace.
- `https://cynrath-agent-context-kit.docs7.io/`,
  `/guides/getting-started`, `/llms.txt`, `/llms-full.txt` and
  `/guides/getting-started.md` each returned HTTP 200 with the expected HTML,
  plain-text or Markdown content type. Agent content includes current
  `canonicalPath`, `exit_code_hint` and feature-index documentation.
- The successful provider production render accepts this actual configuration
  and its 32 real documentation routes. The previously recorded generic
  upstream-schema regex compilation problem is preserved; no schema pattern
  or validation gate was weakened to manufacture a formal-schema pass.
- The claim guide now explicitly requires the exact per-library URL and
  public key from the owner panel only if the already-owned library becomes
  unclaimed. No key was invented, no ownership/config-source setting changed,
  no duplicate library/site created, and no deployment was dispatched.
- Existing GitHub Pages configuration and immutable package identities remain
  unchanged by this documentation task. TASK-0103 separately owns the authorized
  patch release for verified runtime/CI fixes; docs alone did not trigger it.
- PR #44 head `716dd255a351bbd338980f82c9b6cae24341039f` passed all required
  cross-platform checks before merge. Follow-up guide/task changes still await
  their own local documentation checks and exact-head PR evidence.
- Follow-up local validation: documentation distribution/canonical docs gates
  11/11 PASS; repository text hygiene, task doctor and diff check PASS.
  The current goal's explicit Git/PR/master-merge authorization, also recorded
  in TASK-0103, covers this scoped evidence follow-up. It does not authorize
  a deployment or account/credential change in this task.
- Context7's connected resolve/query tools independently found the exact
  `/cynrath/agent-context-kit` library and returned the current master SDK/MCP
  pages: SDK root descriptor `canonicalPath`, built-in/extra rules, fixed
  MCP startup root, unsupported per-call root/includeGlobs and ci-controlled
  `exit_code_hint=0/1`. Retrieval of the corrected documentation is verified,
  beyond the public ownership/badge/config-source metadata above.
