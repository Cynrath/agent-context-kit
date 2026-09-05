# ADR-0029: Maintenance-Aware Release-State Model

Status: Accepted · Date: 2026-09-05 · Task: TASK-0078 (amends ADR-0023, which remains in force)

## Context

ADR-0023 defines one logical release (npm + VSIX + Action pin) with
`package.json` as the single source-of-truth version and the release tag
pointing at the commit whose `package.json` matches. That model assumes
`package.json version == current public stable`. The v0.4.1 maintenance
release — published from the separate `maintenance/v0.4.1` line while
master stayed at source `0.4.0` — broke the assumption: default-branch
README badges/pins still said `0.4.0` while npm/GitHub latest was `0.4.1`,
and `scripts/check-version-parity.mjs` still PASSED because it compared
stable surfaces against `package.json` only (false negative, reproduced
in TASK-0078). The audit (recorded in TASK-0078) proved all package,
TypeScript smoke, and VS Code CI tooling safely accept a `0.5.0-dev.0`
source version, and that `release.yml` is fail-closed for prerelease tags.

## Decision

Four version concepts, each with exactly one owner (offline,
deterministic, repository-native — no registry/network lookup in any
product path):

1. **Source/development version — owner: `package.json`.**
   The v0.5 line on master is `0.5.0-dev.0` (explicit prerelease, NOT a
   public release). `extensions/vscode/package.json` MUST equal it
   (ADR-0023 coupling, unchanged) and the `ci.yml` extension job tracks
   it (manifest contract + `ackit-vscode-<source>.vsix` filename).
   `--version`, MCP `serverInfo.version`, and the SARIF driver version
   report it dynamically. Bumping it changes no published artifact.

2. **Published stable version — owner: `release-state.json`
   (`publishedStable`, exact `X.Y.Z`, never a prerelease).**
   Currently `0.4.1`. Every current-facing surface that makes a
   PUBLIC/STABLE claim MUST name it: README install pins (`ackit
   --version # <stable>`, `npx …@<stable>`), the Action pin
   (`uses: …@v<stable>`), the getting-started one-shot pin, the VS Code
   README Marketplace version claim, and the demo-Action pins. README
   badges are version-agnostic instead of hard-coded (shields `npm/v/`
   renders the registry latest dynamically; the release badge follows
   `/releases/latest`), so they can never go stale again; the parity
   guard checks their static URL text, keeping docs parity deterministic.

3. **Maintenance-line semantics — owner: `release-state.json`
   (`maintenanceSeries`, e.g. `["0.4.x"]`).**
   A listed series exists as a long-lived branch (`maintenance/v0.4.1`)
   and MAY publish `0.4.x` patches while master develops the next minor.
   Maintenance releases never touch master versions, never move tags, and
   never change the source line. Adding a series is a deliberate ADR-level
   change, not an automatic one.

4. **Historical-version semantics — owner: history itself, allowlisted.**
   CHANGELOG history, `docs/v0.2.0/**`, old ADRs/tasks/evidence, API
   "since" notes, behavioral baseline pins, release-debut notes
   ("released in 0.4.0"), protocol generations, schema versions, and
   SARIF 2.1.0 remain valid forever. The guard allowlists exact phrases
   and never scans historical paths — no broad regex purge.

**Release-tag / version relationship (unchanged, hardened by tests):**
tags stay exact `vX.Y.Z` stable only. The `v*.*.*` trigger glob matches a
prerelease-shaped tag such as `v0.5.0-dev.0`, but the release.yml step-1
validator (`^v[0-9]+\.[0-9]+\.[0-9]+$`) rejects it before install, tests,
or publish — fail-closed. `tests/contract/ci-pinning.test.ts` (which
already rejects `v0.1.1-beta`) plus the new `isStableReleaseTag` parity
tests pin this; no workflow change was needed and none is made.

**When the stable pointer changes:** only in the task that performs (or
immediately follows, with evidence) a successful publication — tag push →
npm OIDC publish → registry/shasum/dist-tag verify → GitHub Release.
The pointer commit sets `publishedStable` to the released version and
updates the stable-claim surfaces in the same change. Master pushes and
PRs never change it.

**When `package.json` changes from dev prerelease to final:** in release
preparation, the release task sets source `0.5.0-dev.0` → `0.5.0`
(coupled extension manifest + CI job in the same change) before the
exact-head green gate and tag. After publication, master immediately
moves to the next line (`0.6.0-dev.0`).

**Post-publish synchronization:** the release task verifies npm
`dist-tags.latest`, the GitHub Release, and Marketplace propagation, then
lands the pointer/surface sync above. Until that sync lands, the guard
fails loudly (stale stable claims) rather than passing silently.

**Future cases (solved without conflating the lines):**

- `v0.5.0` public + `v0.6` development: release sets source `0.5.0`,
  publishes, pointer `0.4.1 → 0.5.0`; master then opens `0.6.0-dev.0`.
- `v0.5.1` maintenance while master is `v0.6-dev`: published from the
  `0.5.x` maintenance line; only the pointer (`0.5.0 → 0.5.1`) and stable
  surfaces move on master — source stays `0.6.0-dev.0`.
- Emergency `v0.4.2` while master is `v0.5-dev`: published from
  `maintenance/v0.4.1`; pointer `0.4.1 → 0.4.2` only (source untouched);
  `maintenanceSeries` still covers it (`0.4.x`).

## Rationale

A split model (not another single-version assumption) is the smallest
change that makes `README says 0.4.0 while npm latest is 0.4.1`
mechanically impossible: source coupling and stable pins are checked
against different committed truths. A prerelease source version was
chosen over a stable-pointer-only alternative because every audited
consumer (npm pack, `package-smoke.mjs`, TypeScript smoke, `vsce
package` in CI, release.yml) accepts it, and it makes the development
line self-describing (`--version` can never be mistaken for stable).

## Alternatives considered

- **Stable-pointer file only, source stays `0.4.0`:** rejected — master
  would keep reporting a shipped maintenance version as its own truth and
  `--version` would stay ambiguous about which line is developing.
- **Dynamic registry lookup for stable:** rejected — violates the
  offline-first invariant (REQ-GOV-001/002); the committed pointer keeps
  the guard deterministic and network-free.
- **General release-train framework:** rejected as over-engineering;
  four concepts + guard + pointer discipline cover the known future cases.
- **Narrowing the `v*.*.*` trigger glob:** rejected — the existing exact
  validator already fails closed and is contract-tested; glob changes add
  risk to release governance for no safety gain.

## Consequences

- `release-state.json` is a new tracked governance file; its shape is
  validated by the guard and contract tests (unknown fields rejected to
  keep it intentionally tiny — no `sourceVersion` duplication).
- `README.md`, `docs/guides/getting-started.md`,
  `extensions/vscode/README.md`, `docs/guides/agent-integration.md`
  (published-npm clause), and `examples/demo-github-action/README.md`
  now track stable `0.4.1`; `ci.yml` tracks source `0.5.0-dev.0`.
- `tests/contract/ci-pinning.test.ts` is untouched (already fail-closed).
- No tag, publish, release, or Marketplace action occurs in TASK-0078.

## References

- ADR-0023 (amended, still in force) · `release-state.json`
- `scripts/check-version-parity.mjs` · `tests/contract/version-parity.test.ts`
- `.github/workflows/release.yml` (step-1 validator) · TASK-0078 audit notes
