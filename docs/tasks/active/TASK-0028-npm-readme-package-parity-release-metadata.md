---
id: "TASK-0028"
title: "npm README/package parity + release metadata"
status: pending
schemaVersion: 2
dependencies: ["TASK-0026"]
createdAt: "2026-08-27"
completedAt: null
---


## Purpose

Ensure npm displays the polished GitHub master README for v0.2.1, with byte-for-byte parity, correct package metadata, and automated parity test.

## Context

- GitHub master README was beautified for v0.2.0 (responsive tables, badges). npm 0.2.0 already shows it, but we must guarantee parity for 0.2.1 with version badge updates and automated check.
- `package.json` files field must include README.md, CHANGELOG.md, LICENSE; no secrets/local paths/benchmark clones in tarball.

## Goal

- `README.md` canonical polished design preserved, factual version links 0.2.0→0.2.1 updated, npm pack tarball README equals repo-root README (normalized-EOL or byte-for-byte), SHA-256 recorded, failing release readiness if differ.

## In scope

- Preserve root `package.json` inclusion of `README.md`.
- Update `README.md` badges/links: `img.shields.io/npm/v/@cynrath/agent-context-kit?label=npm%20v0.2.0` → `v0.2.1`, release badge `release/v0.2.0` → `v0.2.1`, install examples `npx --yes @cynrath/agent-context-kit@0.2.0` → `0.2.1`, `--version` comment `0.2.0` → `0.2.1`, GitHub Action `Cynrath/agent-context-kit@v0.2.0` → `v0.2.1`, VS Code note `0.2.0` → `0.2.1` where factual.
- Keep design/table structure, not replace manually improved layout.
- Before tag: `npm pack --json` → inspect/extract tarball → compare `package/README.md` to repo-root `README.md` → require equality (or normalized EOL), record SHA-256 for both, fail if differ.
- Add automated test `tests/contract/readme-parity.test.ts` (or `tests/contract/package-readme-parity.test.ts`) that runs `npm pack --dry-run` or extracts and compares.
- After publish: verify npm metadata/readme is new v0.2.1 content (`npm view --json` readme).
- Audit tarball: no secrets, no local absolute paths (`O:\`, `/home/`, `C:\`), no benchmark clones, no temp artifacts.

## Out of scope

- Mutating immutable npm 0.2.0.
- Redesigning README from scratch (only factual updates).

## Affected files

- `README.md`
- `package.json` (version bump handled in TASK-0034, but parity verified here)
- `tests/contract/readme-parity.test.ts` (new)
- `scripts/check-readme-parity.mjs` (optional helper)

## Technical design

Update badges:
- `https://img.shields.io/npm/v/@cynrath/agent-context-kit?label=npm%20v0.2.0` → `v0.2.1`
- `https://img.shields.io/badge/release-v0.2.0` → `v0.2.1`
- `npm install --global @cynrath/agent-context-kit@0.2.0` → `0.2.1` (two places: Install and Changelog reference)
- `npx --yes @cynrath/agent-context-kit@0.2.0` → `0.2.1` (three places)
- `ackit --version  # 0.2.0` → `0.2.1`
- `Cynrath/agent-context-kit@v0.2.0` → `v0.2.1` (GitHub Action section)
- `docs/reference` etc unchanged.

Parity script: `node scripts/check-readme-parity.mjs` does:
- `pnpm pack --pack-destination /tmp/parity --json` parse, find `.tgz`
- `tar -tzf` list contains `package/README.md`
- extract to temp, `sha256` both files, `diff -u --strip-trailing-cr` or `cmp`, fail if differ, print SHAs.

Test: run parity logic in Vitest, skip if npm pack fails, assert equality.

## Security

- No secret in README; verify tarball audit with secrets scan.

## Tests

| Class | Command | Gate |
|---|---|---|
| parity | `node scripts/check-readme-parity.mjs` | exit 0, SHAs logged |
| contract | `pnpm test tests/contract/readme-parity.test.ts` | PASS |
| tariff audit | `npm pack --dry-run` whitelist, no secrets | PASS |
| install | `npm view` after publish readme check | manual after TASK-0034 |

## Acceptance criteria

- [ ] Root `package.json` files includes `README.md` (verified)
- [ ] README preserved design, version badges/links 0.2.0→0.2.1 only factual facts updated
- [ ] `npm pack` tarball `package/README.md` equals repo-root `README.md` (SHA-256 recorded, equal)
- [ ] Parity test exists and PASS
- [ ] Tarball audit clean (no secrets, no absolute paths)
- [ ] After publish, npm metadata readme is v0.2.1 (checked in TASK-0034)

## Risks

- EOL normalization Windows vs Unix → allow normalized-EOL equality.
- Forgot to update `action.yml` version mirror → handled in other tasks.

## Rollback plan

Revert README changes via `git revert`; parity fails would block release anyway.

## Completion notes

(placeholder) — include SHA-256 both files + parity script output + tarball list.
