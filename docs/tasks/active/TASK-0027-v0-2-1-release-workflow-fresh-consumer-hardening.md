---
id: "TASK-0027"
title: "v0.2.1 release workflow fresh-consumer hardening"
status: pending
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: null
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

- [ ] `release.yml` tag-only, per-tag concurrency, SHA-pinned, OIDC, no NPM_TOKEN preserved
- [ ] Fresh isolated consumer added: mktemp, unique npm_config_cache, npm install prefix, ackit --version/help, retries, no global mutation
- [ ] npx remains secondary after fresh install
- [ ] Summary version-neutral
- [ ] Contract tests PASS
- [ ] lint/test/diff green

## Risks

- npm_config_cache must be exported within same run block; trap handles cleanup.

## Rollback plan

Revert `release.yml` via `git revert`.

## Completion notes

(placeholder) — fill with release.yml diff + contract output + local simulation log.
