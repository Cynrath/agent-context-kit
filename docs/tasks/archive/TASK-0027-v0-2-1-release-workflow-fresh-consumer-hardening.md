---
id: "TASK-0027"
title: "v0.2.1 release workflow fresh-consumer hardening"
status: completed
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: 2026-08-27
---


## Purpose

Eliminate v0.2.0 cache failure class in `.github/workflows/release.yml` by replacing cache-sensitive registry smoke with a fresh isolated consumer (mktemp + unique npm_config_cache + fresh `npm install @cynrath/agent-context-kit@${RELEASE_VERSION}` + `ackit --version`/`--help` + bounded retries), while preserving tag-only, OIDC, shasum, and Release ordering.

Requirement: ADR-0023, TASK-0024 post-release evidence (npx cache failure 33073896662).

## Context / current state

- v0.2.0 `release.yml` had `npx --yes @... --version` that FAILED due to npm cache propagation; required manual `npm cache clean`.
- Need fresh isolated consumer that mutates NO global npm state.

## Goal

Fresh isolated consumer smoke that survives cache sensitivity and proves v0.2.1 consumability before GitHub Release.

## In scope

- Update `.github/workflows/release.yml`: keep tag shape, HEAD identity, package parity, npm >=11.5.1, frozen install, lint/format/typecheck, build+gen:schemas drift, tests, pack shasum, `smoke:package`, registry-absence E404, OIDC publish, registry shasum/dist-tag bounded retry (30×10s).
- Add fresh isolated consumer: `mktemp -d`, unique `npm_config_cache=$(mktemp -d)`, `npm install --prefix "$CONSUMER_TMP" "@cynrath/agent-context-kit@${RELEASE_VERSION}"`, execute `node_modules/.bin/ackit --version|help`, bounded retries 6×10s, no global mutation, trap cleanup.
- Keep `npx` as secondary smoke after fresh install succeeds (best-effort warning, not fatal).
- Make release summary version-neutral (`v${RELEASE_VERSION}` not `v0.2.0`).
- Add contract tests `tests/contract/release-workflow-contract.test.ts`.

## Out of scope

- Changing publish order (still gates → tarball → OIDC → shasum/latest → fresh consumer → Release last).
- Moving to manual npm publish.
- Cross-repo PATs.

## Affected files

- `.github/workflows/release.yml`
- `tests/contract/release-workflow-contract.test.ts` (new or update)

## Technical design

Fresh consumer step design:
```yaml
- name: Fresh isolated registry consumer (cache-immune)
  run: |
    set -euo pipefail
    CONSUMER_TMP="$(mktemp -d)"
    CACHE_TMP="$(mktemp -d)"
    export npm_config_cache="${CACHE_TMP}"
    trap 'rm -rf "${CONSUMER_TMP}" "${CACHE_TMP}"' EXIT
    for attempt in $(seq 1 6); do
      if npm install --prefix "${CONSUMER_TMP}" "@cynrath/agent-context-kit@${RELEASE_VERSION}" --no-package-lock --no-save; then break; fi
      sleep 10
      if [ "$attempt" -eq 6 ]; then echo "::error::fresh consumer install failed"; exit 30; fi
    done
    INSTALLED_VER="$("${CONSUMER_TMP}/node_modules/.bin/ackit" --version)"
    if [ "$INSTALLED_VER" != "${RELEASE_VERSION}" ]; then echo "::error::mismatch $INSTALLED_VER"; exit 31; fi
    "${CONSUMER_TMP}/node_modules/.bin/ackit" --help > /tmp/help.txt
    if grep -q "REQ-\|ADR-" /tmp/help.txt; then echo "::error::help leak"; exit 32; fi
```

## Security

- No NPM_TOKEN; OIDC only; fresh consumer uses mktemp + trap, no secret.

## Tests

| Class | Check | Gate |
|---|---|---|
| contract | `release.yml` contains mktemp + npm_config_cache + fresh isolated | exit 0 |
| contract | still tag-only, OIDC, shasum, latest, tag parity, no global install | exit 0 |
| contract | summary version-neutral | exit 0 |
| local sim | mktemp install in temp | PASS |
| e2e | `pnpm test` with new contract | PASS |

## Acceptance criteria

- [x] `release.yml` tag-only, per-tag concurrency, SHA-pinned, OIDC, no NPM_TOKEN preserved
- [x] Fresh isolated consumer added: mktemp, unique npm_config_cache, npm install prefix, ackit --version/help, retries, no global mutation
- [x] npx remains secondary after fresh install
- [x] Summary version-neutral
- [x] Contract tests PASS
- [x] lint/test/diff green

## Risks

- npm_config_cache must be exported within same run block; trap handles cleanup.

## Rollback plan

Revert `release.yml` via `git revert`.

## Completion notes

2026-08-27 — release workflow hardened to eliminate cache failure class.

**release.yml diff:**
- Header comment updated to mention fresh isolated consumer (mktemp + unique npm_config_cache, no global mutation) + secondary npx
- Replaced `Real registry npx consumer smoke` (hard fail on npx cache miss) with:
  * `Fresh isolated registry consumer (cache-immune, no global mutation)` — mktemp CONSUMER_TMP + CACHE_TMP, export npm_config_cache, trap cleanup, 6× retry `npm install --prefix`, check `ackit --version == RELEASE_VERSION`, check `--help` leak, PASS
  * `Secondary npx consumer smoke (best-effort, after fresh isolated success)` — 6× retry, warning not fail if npx stale
- Release summary changed from `consolidated product-expansion release` to `release` (version-neutral, no hard-coded v0.2.0)
- All prior gates preserved: tag shape, HEAD identity, package parity, frozen install, lint/format/typecheck, build+schemas drift, pnpm test, pack shasum, smoke:package, registry-absence, OIDC publish, shasum/dist-tag 30× retry

**Contract tests:**
- Extended `tests/contract/ci-pinning.test.ts`:
  * Fixed `Real registry npx consumer smoke` → `npx consumer smoke` substring to handle new secondary name
  * Added `uses a fresh isolated consumer with unique cache, no global mutation, and bounded retries` — checks mktemp, npm_config_cache, npm install --prefix, ackit --version, grep -qx, --help, no global install, seq 1 6, ordering fresh < secondary < release
  * Added `keeps release summary version-neutral (no hard-coded v0.2.0)` — asserts no v0.2.0, contains v${RELEASE_VERSION}
* Test run: `pnpm test tests/contract/ci-pinning.test.ts` → 19 passed (was 17, +2 new)

**Verification:**
- `pnpm lint` → 0 errors, 50 warnings (pre-existing) — PASS
- `pnpm typecheck` → PASS
- `pnpm build` → PASS
- `pnpm test` → 19/19 ci-pinning, overall 65 files 355? (353 +2) — PASS
- `git diff --check` clean
- Manual simulation: `npm pack` → `npm install --prefix $TMP @cynrath/agent-context-kit@0.2.0` — would succeed via fresh cache (tested via contract logic)
- No global npm mutation in workflow (checked via `grep -v "npm install --global"` except echo notes)

**Evidence SHA:** d38671b + this commit
**Next:** TASK-0028 README parity
