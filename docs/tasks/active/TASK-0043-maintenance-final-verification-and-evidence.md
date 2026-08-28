---
id: "TASK-0043"
title: "maintenance: final verification and evidence"
status: pending
schemaVersion: 2
dependencies: ["TASK-0041", "TASK-0042"]
createdAt: "2026-08-28"
completedAt: null
---

## Purpose

Produce final zero-warning, fully green, protected-master evidence and close the maintenance hardening run with no release churn.

## Scope

- Run full local gate suite: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm gen:schemas`, `pnpm smoke:cli`, `pnpm run smoke:package`, `node scripts/check-offline-egress.mjs`, `node dist/cli/index.js config check|doctor|task doctor|skills validate|instructions|scan --ci`, `git diff --check`, plus VS Code extension gate (manifest contract, typecheck, lint, build, unit, Electron integration, vsce ls/package, icon, offline-egress audit)
- Verify MCP stdio determinism preserved; run 5× if infra touched
- Confirm final master SHA CI green (including ACKit Dogfood), lint 0/0, offline-egress PASS, extension PASS, package smoke PASS
- Verify `v0.2.2` tag `af739cf` still points to `35087e7`, new commits only on master, npm `0.2.2` unchanged, no new release
- Record evidence in task completion notes and commit

## Out of scope

- create v0.2.3 / tag move / publish / marketplace
- new features / architecture changes
- broad ignores

## Current evidence

- Baseline lint 49 warnings captured; cleanup commit pending
- Ruleset 17913688 missing status checks — hardening pending
- Latest CI green SHA `35755a7` has 12 checks PASS; future lint-cleanup SHA will need fresh CI green
- v0.2.2 frozen: tag `af739cf` → `35087e7`, GitHub Release `v0.2.2`, npm `0.2.2`

## Acceptance criteria

- [ ] `pnpm lint`: 0 errors / 0 warnings
- [ ] `pnpm format:check`, `typecheck`, `build`, `test`, `gen:schemas`, `smoke:cli`, `smoke:package` PASS
- [ ] `check-offline-egress.mjs` PASS; CLI checks PASS; `scan --ci` PASS
- [ ] Extension gate PASS (manifest 0.2.2, build, vsce, icon, offline audit)
- [ ] Final master SHA CI green (verify matrix 6 + self-scan + 3 package-smoke + extension + Dogfood) with run IDs recorded
- [ ] Master protection ACTIVE, force-push BLOCKED, deletion BLOCKED, required checks correct (read-back verified)
- [ ] `git diff --check` clean
- [ ] `v0.2.2` tag UNCHANGED, npm 0.2.2 UNCHANGED, no new release, commits stacked on master as: v0.2.2 → evidence → TASK-0040 → lint cleanup → protection evidence
- [ ] Task evidence contains baseline/final warnings, final SHA, CI/Dogfood run IDs, ruleset ID/enforcement/required checks/force/deletion, offline/MCP/extension results

## Test steps

1. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm build && pnpm test && pnpm gen:schemas && pnpm smoke:cli && pnpm run smoke:package`
2. `node scripts/check-offline-egress.mjs && node dist/cli/index.js config check && node dist/cli/index.js doctor && node dist/cli/index.js task doctor && node dist/cli/index.js skills validate && node dist/cli/index.js instructions && node dist/cli/index.js scan --ci && git diff --check`
3. Extension gate steps as in `ci.yml` extension job
4. `git push origin master` (fast-forward only) + poll `gh run list` + `gh api .../commits/<SHA>/check-runs`
5. `gh api repos/.../rulesets/<id>` read-back
6. `git rev-list -n1 v0.2.2` vs `35087e7` + `npm view @cynrath/agent-context-kit version`

## Risks

- CI flake could delay evidence → re-run only affected job, do not relax required checks
- Ruleset misconfiguration could block pushes → verify bypass/branch up-to-date compatibility before enforcing

## Rollback plan

Evidence commit revert is independent; protection rollback via ruleset API revert; lint commit revert as in TASK-0041.

## Completion notes

(pending)
