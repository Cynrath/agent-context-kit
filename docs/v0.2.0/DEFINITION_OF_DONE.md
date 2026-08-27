# AgentContextKit v0.2.0 — Definition of Done (Canonical)

This is the binding release gate for `v0.2.0`. A task is not complete, the package is not publishable, and the tag is not create-able unless every item below is satisfied. The final release task (TASK-0024) must checklist this file line-for-line before asking for user authorization.

## Product

- [ ] Every planned feature (epics A–N) is present, reachable from `ackit --help`, and deterministic/offline core per ADR-0003/0015. No TODO-core, disabled tests, weakened rules, or placeholder architecture.
- [ ] CLI is coherent: global options (`--root/--config/--json/--quiet/--no-color/--verbose/--debug/--strict`) work on every command; `--json` stdout pure JSON, diagnostics on stderr; `--help` contains no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` (contract test green).
- [ ] No public internal-ID leaks; legitimate `TASK-####` in `--depends-on` help remains documented (positive control).
- [ ] Config file `ackit.yml` schemaVersion accepts v0.2.0 additions (`readiness.weights`, `profile`, `policy.rulePacks`) but still validates v0.1.1 files with defaults.

## Quality — full local gate

Run at the candidate SHA (pre-tag) and record exit codes:

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm gen:schemas && git diff --exit-code -- schemas   # no drift
pnpm build
pnpm test                                              # includes unit/integration/contract/security/perf/vscode where applicable
pnpm smoke:cli
pnpm run smoke:package                                  # real tarball isolated consumer
node dist/cli/index.js config check
node dist/cli/index.js doctor
node dist/cli/index.js task doctor
node dist/cli/index.js skills validate
node dist/cli/index.js instructions
node dist/cli/index.js scan --ci
git diff --check
```

Each must exit 0. `task doctor` and `doctor` are mandatory. Schema drift must be 0 diff.

## Platforms

- [ ] CI matrix green (existing `.github/workflows/ci.yml`): verify `ubuntu/windows/macos × node22/24` (6 legs) + `self-scan` + `package-smoke` (3 legs) = **10/10 jobs success** on the exact candidate SHA (`head_sha == $(git rev-parse HEAD)` filter).
- [ ] Windows path handling verified: drive-letter, mixed separators, Unicode temp dirs, `fs` containment + dashboard bind.
- [ ] Linux/macOS verified via CI (POSIX symlink, `@vscode/test-electron` --headless where applicable).

## Consumers

Each is an isolated real-tarball or real-artifact smoke, not a source fallback. Record `tmpdir` and `exit code`.

- [ ] **npm tarball**: `pnpm pack` → install in fresh temp dir (`npm install $tarball`) → `--version` matches `0.2.0`, `--help` leak-free, scan/doctor/task/graph/pack/diagnostics round-trips.
- [ ] **SDK consumer**: ESM `import { scanRepository } from "@cynrath/agent-context-kit"` from tarball install → scan fixture returns findings, no `process.exit` trap.
- [ ] **MCP consumer**: `InMemoryTransport` (or stdio spawn `mcp serve`) handshake + `tools/list` (= 9 read-only) + `tools/call scan` → valid report.
- [ ] **GitHub Action consumer**: `uses: ./` with `command: scan` + `fail-threshold: low` runs locally (via `actionlint` + a minimal hosted job if not `act`). Produces annotations + job summary; `actionlint` passes; SARIF artifact validates 2.1.0.
- [ ] **Dashboard/watch smoke**: `ackit report serve` loopback bind (random free port, localhost-only) → HTML contains findings count; `scan --watch` graceful shutdown (`Ctrl+C` → exit 0). Dashboard API returns pure JSON, paginated.
- [ ] **Diagnostics/redaction smoke**: fixture secret repo (5 known secrets: AWS key, `ghp_`, private key block, connection string, PAT) → `ackit diagnostics bundle --out ./tmp.zip` produces deterministic manifest and all secrets appear as `[REDACTED]` (assert 5/5).
- [ ] **Rule-pack smoke**: fixture repo with 2 packs (one presence + one pattern rule) → `ackit scan --json` shows exactly 2 pack findings with stable fingerprints.
- [ ] **Provider-profile smoke**: `ackit pack --profile {codex,claude,copilot,gemini,generic} --json` each succeeds; `instructions --provider` respects profile file conventions (one fixture per provider asserted).
- [ ] **VSIX smoke**: `vsce package` → `ackit-0.2.0.vsix` size <2MB, `vsce ls` whitelist (extension/**, package.json, images/**, LICENSE, README, CHANGELOG slice only), activation smoke via `@vscode/test-electron` (Problems and "instructions for current file" view).

## Security

- [ ] `docs/security/THREAT_MODEL.md` updated with v0.2.0 delta T16–T20 and controls; `SECURITY_MODEL.md` notes localhost-only + redaction points.
- [ ] New surfaces reviewed: dashboard (XSS/binding/headers/path redaction), rule packs (traversal/ReDoS/size/no exec), action (SHA pins/permissions/injection), diagnostics (bundle redaction/zip-slip), SDK (no `process.exit`, no path leak), VS Code (no telemetry, activation boundary, VSIX audit).
- [ ] `tests/security/v020-*.test.ts` per surface green on ubuntu/windows/macos × node22/24 where applicable.
- [ ] `scripts/check-security-boundaries.mjs` green: forbids `child_process.exec(` (allow `execFile`), `eval(`, `Function(`, `require(userInput`, dynamic `fetch(` in `src/`; YAML depth 20 & size caps enforced.
- [ ] Redaction gates green: terminal/JSON/SARIF/HTML/API/bundle all `[REDACTED]` for the 5 known secrets.
- [ ] Package/VSIX auditing: `npm pack --dry-run` whitelist (dist/templates/schemas/README/CHANGELOG/LICENSE/package.json + dash assets if needed) and VSIX whitelist; tarball contains no AWS/GH/PAT-like plaintext (secrets scan).
- [ ] XSS gate: fixture `<script>` in finding/path renders escaped in HTML and API response.
- [ ] No telemetry in product code (network-spy test).
- [ ] Localhost-only guarantee: `report serve` non-loopback bind without `--allow-nonlocal` → exit 2 and test probes `0.0.0.0` + `::1` handling.
- [ ] Least-privilege action `permissions:` documented and asserted in contract test.
- [ ] No long-lived npm token (`NPM_TOKEN`/`NODE_AUTH_TOKEN`) or VS Code PAT in repo; `vsce publish` is a separate checkpoint.

## Performance

- [ ] Benchmark suite `benchmarks/` runs full 8-class fixtures deterministically (twice → byte-identical fixture set).
- [ ] `benchmarks/run.mjs --classes small --out /tmp/out` collects all 8 metrics (`coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio`).
- [ ] `benchmarks/thresholds.json` multipliers respected; `check-thresholds.mjs` passes against committed `benchmarks/baselines/*.json` (PR advisory job green + scheduled full artifact).
- [ ] Acceptable regression policy documented in `ADR-0022` (multipliers, not absolute, 10% tolerance, two-breaches rule).

## Documentation

- [ ] `README.md` rewritten/polite: badges, install (`npm/npx` 0.2.0 pin), quickstart, features snapshot (readiness, optimize profile, graph, packs, action, watch/dashboard, diagnostics, SDK, VS Code, perf), security/privacy offline note, versioning line (0.2.0), legacy .NET slice untouched.
- [ ] Guides: `getting-started`, `readiness`, `optimize`, `provider-profiles`, `instruction-graph`, `rule-packs`, `ci` (incl. Action recipes), `watch-dashboard`, `diagnostics`, `sdk`, `vscode`, `monorepo`, `troubleshooting`, `privacy/security` — each links to at least one tested fixture that `ackit scan --ci` without threshold (or `scan --json` valid).
- [ ] References: `cli`, `config`, `rules`, `exit-codes`, `mcp`, `schemas` updated; new schemas `readiness`, `diagnostics`, `profile`, `rule-pack`, `instruction-graph v2` listed.
- [ ] `docs/architecture/overview.md` reflects new subsystems (`readiness`, `profiles`, `rule-packs`, `dashboard`, `diagnostics`, `benchmarks`, `extensions/vscode`).
- [ ] `CHANGELOG.md` has real `[0.2.0] - 2026-09-xx` section (Added/Changed/Fixed/Security per Keep a Changelog, claims nothing about publication until tag exists).
- [ ] Examples under `examples/` maintained: at least one per major feature with `README.md` + `ackit` validity proof (fixture index `examples/README.md`).
- [ ] Dead-link gate (`pnpm link-check` or equivalent) green; `pnpm gen:schemas` no drift.

## Release — exact-SHA verification before tag push

The FINAL task (TASK-0024) must perform these read-only checks at the same HEAD, record outputs (SHA included), and STOP for explicit user authorization. Do not infer authorization.

- [ ] `git rev-parse HEAD == git rev-parse origin/master` (diverge → stop).
- [ ] Exact-SHA hosted CI run on `master` for that HEAD: `completed/success` **10/10 jobs**, `head_sha` filtered, zero `release.yml` jobs (tags-only).
- [ ] `.github/workflows/release.yml` is the exact trusted workflow (SHA-pinned Actions from `ci.yml`, `contents: write`+`id-token: write`, tags-only `v*.*.*`, per-tag concurrency, tag regex `^v[0-9]+\.[0-9]+\.[0-9]+$`, parity gates, OIDC publish, bounded registry verification). `pnpm gen:schemas` drift clean.
- [ ] OIDC/Trusted Publishing verified (`id-token: write` present; no `NPM_TOKEN`/`NODE_AUTH_TOKEN` secret refs anywhere; checked by grep gate). Legacy `.NET` line `1.0.0-rc.1` described as frozen (commit `258918b...`).
- [ ] **npm version `0.2.0` absent**: `npm view @cynrath/agent-context-kit@0.2.0 version` → `E404`.
- [ ] **Tag `v0.2.0` absent**: local `git tag --list v0.2.0` empty and `git ls-remote --tags origin refs/tags/v0.2.0` prints no line.
- [ ] **Explicit user authorization recorded** in TASK-0024 completion notes with the exact candidate SHA quoted (e.g., `Evet — açık yetki veriyorum` or equivalent English approval sentence + SHA).

Only after those pass:

- [ ] Annotated tag `v0.2.0` created on the exact candidate HEAD and pushed → `release.yml` run `publish via OIDC` green.
- [ ] Registry verify: versions includes `0.2.0`, `latest → 0.2.0`, `dist.shasum/dist.integrity` vs recorded `TARBALL_SHASUM` (content-identical ignoring npm normalization of `package.json`'s `packageManager`/`prepack`; if shasum differs due to that normalization, document content-identical SHA per relative path), provenance attestation present, `npx --yes @cynrath/agent-context-kit@0.2.0 --version` + `npx … --help` + feature battery green.
- [ ] GitHub Release `v0.2.0` created strictly after publish success with title `AgentContextKit v0.2.0` and notes copied from `CHANGELOG.md` `[0.2.0]` section, plus VSIX attachment.
- [ ] Local global update: `npm install -g @cynrath/agent-context-kit@0.2.0` or `npm update -g` → `ackit --version` `0.2.0` via npm global path, `.dotnet/tools/ackit.exe` absent.
- [ ] **VS Code Marketplace publication** has its own explicit checkpoint (`marketplace: yes`) if `vsce publish` is desired; CI does not publish without it. Do not imply marketplace publish authority.

## Final state gate

```text
V0.2.0 REQUIREMENTS: READY / NOT READY
V0.2.0 ADRS: READY / NOT READY
V0.2.0 TASK CHAIN: READY / NOT READY
TRACEABILITY: COMPLETE / INCOMPLETE
IMPLEMENTATION STARTED: NO (planning-only run)
RELEASE ACTIONS: NONE
NEXT STEP: execute the complete v0.2.0 implementation task chain (TASK-0007 → 0024) in dependency order
```

Do not publish, tag, or change `package.json` version in this planning run.
