---
id: "TASK-0024"
title: "v0.2.0 release readiness & evidence — FINAL gate (planning-only, no publish)"
status: completed
schemaVersion: 2
dependencies: ["TASK-0023"]
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Final controlled-release gate for **AgentContextKit v0.2.0** (`@cynrath/agent-context-kit`, CLI `ackit`) on `master`. Record exhaustive read-only evidence that every implementation task, gate, audit, and consumer smoke required by `docs/v0.2.0/DEFINITION_OF_DONE.md` Release section, `docs/v0.2.0/REQUIREMENTS.md` REQ-V020-N-001..002, and `docs/decisions/ADR-0023-multi-artifact-version-and-release-strategy.md` is green **before** asking for explicit user authorization — then define the exact publish & verify steps that may only run after that authorization. **This planning-only run MUST NOT create a tag, publish to npm, create a GitHub Release, or touch `package.json` version** (see Completion gate).

Requirement IDs: `REQ-V020-N-001`, `REQ-V020-N-002`, `REQ-V020-GOV-010` (no internal-ID leak in public `--help`).
ADR linkage: `ADR-0023` (primary), `ADR-0015` (consolidated release), `ADR-0013` (distribution/versioning baseline), `ADR-0021` (VS Code artifact), `ADR-0022` (benchmark thresholds).

## Context / current state

Record the invariant snapshot this gate starts from; every bullet must be re-verified at the candidate HEAD and recorded with command output + SHA:

- **Release workflow**: `.github/workflows/release.yml` is **tags-only** `v*.*.*` (`on.push.tags: "v*.*.*"`), `permissions: contents: write, id-token: write`, per-tag concurrency `release-${{ github.ref_name }}`, SHA-pinned actions (`actions/checkout@f548…`, `actions/setup-node@ae0d…`, `pnpm/action-setup@b906…`), tag-shape regex `^v[0-9]+\.[0-9]+\.[0-9]+$`, parity gates (tag==HEAD, tag==`package.json` version, package name `@cynrath/agent-context-kit`, npm >=11.5.1), frozen install → lint/format/typecheck → `build+gen:schemas` drift gate → `pnpm test` → `pnpm pack` shasum → `smoke:package` → registry-absence gate (E404) → `npm publish --provenance` via **OIDC Trusted Publishing** → bounded registry verify (shasum/dist-tag) → `npx` smoke → GitHub Release strictly after success. Proven on **0.1.1** via run `32905878392` (SLSA provenance attestation present, `latest → 0.1.1`).
- **Package registry**: `npm view @cynrath/agent-context-kit version` → `0.1.1`; `npm view @cynrath/agent-context-kit dist-tags.latest` → `0.1.1`; `npm view @cynrath/agent-context-kit@0.2.0 version` → `E404` (absent — safe to publish). No long-lived `NPM_TOKEN` / `NODE_AUTH_TOKEN` in `.github/workflows/*` or repo grep; publish path is OIDC only.
- **Tags**: local `git tag --list` and `git ls-remote --tags origin refs/tags/v0.2.0` — `v0.1.0` and `v0.1.1` exist; **`v0.2.0` absent** both local and remote (any line → stop).
- **Master HEAD**: exact-SHA candidate is `master` at `595f468` (or its fast-forward planning successor recorded at gate start). `git rev-parse HEAD == git rev-parse origin/master` required; diverge → stop. Hosted CI on that exact `head_sha` is **10/10 jobs success** (`ubuntu/windows/macos × node22/24` = 6 matrix legs + `self-scan` + `package-smoke` + remaining gate legs = 10/10) with zero `release.yml` runs (tags-only, master push never publishes).
- **Legacy .NET line**: `1.0.0-rc.1` at `258918b33c3d1359aac967604ee524e8b66ddf02` is **frozen and untouchable** — no NuGet publish pipeline exists or may be created; no tag/release/asset movement; documented as immutable in this task and `DEFINITION_OF_DONE.md`.
- **Predecessor**: `TASK-0023` (full integration & consumer test matrix) is the sole dependency; blocked (`[!]`) until it completes. Traceability at gate entry: `unmapped requirements = 0`, `cycles = 0`, `tasks without acceptance criteria = 0` (`node dist/cli/index.js task doctor` + `scripts/check-v020-traceability.mjs`).

Relevant files/modules:

- `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `.github/workflows/ackit.yml` (dogfood)
- `package.json` (`version: 0.1.1` until publish), `extensions/vscode/package.json` (`version: 0.2.0` mirror at release), `action.yml`
- `CHANGELOG.md` (`[0.2.0] - 2026-09-xx` Added/Changed/Fixed/Security), `docs/v0.2.0/*`, `docs/decisions/ADR-0023.md`
- `scripts/check-security-boundaries.mjs`, `scripts/check-v020-traceability.mjs`, `scripts/check-execution-order.mjs`
- `benchmarks/{run.mjs,check-thresholds.mjs,thresholds.json,baselines/*.json}`, `extensions/vscode/*`, `examples/*`

## Goal

One concrete outcome: a **signed-off, evidence-backed FINAL gate document** that (a) proves every pre-tag condition is green at one immutable candidate SHA with recorded outputs, (b) **stops and asks for explicit user authorization** quoting that SHA, and (c) prescribes the **exact post-authorization publish & verify sequence** (annotated tag → OIDC publish → registry verify → npx smoke → GitHub Release → local global update; Marketplace as a separate checkpoint) — all without executing any publish action in this planning-only run.

## In scope

All read-only verification; no mutation except writing evidence into this task file:

- Re-verify **every predecessor complete**: `TASK-0007 → TASK-0023` all `completed`; `node dist/cli/index.js task doctor` clean; `docs/v0.2.0/TRACEABILITY.md` `unmapped=0`, `cycles=0`, `implementation tasks without test plan = 0` (via `scripts/check-v020-traceability.mjs` or manual audit logged).
- **Full local quality gate at candidate SHA** (each exit 0 recorded):
  ```powershell
  pnpm install --frozen-lockfile
  pnpm lint
  pnpm format:check
  pnpm typecheck
  pnpm gen:schemas && git diff --exit-code -- schemas   # 0 diff
  pnpm build
  pnpm test
  pnpm smoke:cli
  pnpm run smoke:package
  node dist/cli/index.js config check
  node dist/cli/index.js doctor
  node dist/cli/index.js task doctor
  node dist/cli/index.js skills validate
  node dist/cli/index.js instructions
  node dist/cli/index.js scan --ci
  git diff --check
  ```
  Plus cross-checks: `git status --short` empty, `git diff --stat` shows no `package.json` version bump, `actionlint` on `action.yml` if applicable.
- **Full test matrix accounted for**: unit, integration (temp real-fs + Git fixtures + monorepo), contract/snapshot (CLI JSON, SARIF 2.1.0, schemas `ackit.readiness.v1`/`instruction-graph v2`/`profile`/`rule-pack`/`diagnostics`, MCP tools/resources, `api-surface`), security fixtures (per-surface `tests/security/v020-*.test.ts`), cli-smoke, e2e tarball, `pnpm test` pass counts + file counts recorded.
- **Consumer smokes — each isolated real-tarball/real-artifact, not source fallback; record tmpdir + exit code**:
  - **npm tarball**: `pnpm pack` → fresh `npm install $tarball` in temp dir → `--version` == `0.2.0` (or current candidate `0.1.1` pre-tag proof that smoke harness itself passes; at publish the same harness must show `0.2.0`) → `--help` leak-free (`REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` absent) → `scan/doctor/task/instructions/pack/scan --json` round-trips.
  - **SDK consumer**: ESM `import { scanRepository } from "@cynrath/agent-context-kit"` from tarball install → scan fixture returns non-empty `findings`, no `process.exit` trap, `AbortSignal` path exercised.
  - **MCP consumer**: stdio `mcp serve` or `InMemoryTransport` handshake + `tools/list` (= 9 read-only tools) + `tools/call scan` → valid report with repo-relative paths.
  - **GitHub Action consumer**: `uses: ./` with `command: scan` + `fail-threshold: low` runs locally (`actionlint` passes) → annotations + job summary + SARIF artifact valid `2.1.0`; least-privilege `permissions: contents: read` asserted.
  - **Dashboard/watch smoke**: `ackit report serve --port 0` binds **localhost-only 127.0.0.1** on a random free port → HTML contains findings count; API `/api/readiness.json` etc. pure JSON paginated; `scan --watch` debounced coalescing + graceful `SIGINT` → exit 0; non-loopback `--host 0.0.0.0` without `--allow-nonlocal` → exit 2.
  - **Diagnostics/redaction smoke**: fixture repo with **5 known secrets** (AWS key, `ghp_` PAT, private key block, connection string, generic PAT) → `ackit diagnostics bundle --out ./tmp.zip` produces deterministic manifest + all 5 appear as `[REDACTED]` in terminal/JSON/SARIF/HTML/bundle; no absolute path `/home/...` leaked (`<local-path>` or repo-relative).
  - **Rule-pack smoke**: 2 packs (presence + pattern) fixture → `ackit scan --json` shows exactly **2 pack findings** with stable fingerprints; collision diagnostic exercised elsewhere.
  - **Provider-profile smoke**: `ackit pack --profile {codex,claude,copilot,gemini,generic} --json` each succeeds; `ackit instructions --provider` respects profile file conventions (one fixture per provider asserted); `profile: { requested, resolved, source }` in diagnostics.
  - **Benchmark report**: `benchmarks/run.mjs --classes small --out /tmp/out` collects all **8 metrics** (`coldScanMs`, `warmScanMs`, `incrementalMs`, `peakRssMb`, `filesPerSec`, `packMs`, `graphMs`, `cacheHitRatio`) deterministically (twice → byte-identical fixtures); `benchmarks/check-thresholds.mjs` vs `benchmarks/thresholds.json` multipliers + `benchmarks/baselines/*.json` within thresholds (or two-breach policy justification per `ADR-0022`).
  - **VS Code build/VSIX smoke**: `pnpm --filter vscode build` + `vsce package` → `ackit-0.2.0.vsix` **<2 MB**; `vsce ls` whitelist (`extension/**`, `dist/extension.js`, `package.json`, `images/**`, `LICENSE`, `README`, `CHANGELOG` slice only; no `node_modules`, no stray secrets); manifest audit (`publisher: cynrath`, `engines.vscode >=1.90`, `activationEvents: onStartupFinished`, version mirror `0.2.0`); activation smoke via `@vscode/test-electron --headless` (Problems + "instructions for current file" view).
  - **Tarball/VSIX audits**: `npm pack --dry-run` whitelist (`dist`, `templates`, `schemas`, `README.md`, `CHANGELOG.md`, `LICENSE`, `package.json` + dash assets) and **no secret** (secrets scan over tarball contents); `vsce ls` whitelist + size gate recorded.
- **Documentation gate**: `README.md` badges + `npm/npx` pin `0.2.0`, quickstart, features snapshot (readiness, optimize, profiles, graph v2, packs, action, watch/dashboard, diagnostics, SDK, VS Code, perf), offline note, versioning line `0.2.0`, legacy slice untouched; guides `getting-started/readiness/optimize/provider-profiles/instruction-graph/rule-packs/ci/watch-dashboard/diagnostics/sdk/vscode/monorepo/troubleshooting/privacy/security` each links to a tested fixture; references `cli/config/rules/exit-codes/mcp/schemas` updated with new schemas `readiness/diagnostics/profile/rule-pack/instruction-graph v2`; `docs/architecture/overview.md` reflects new subsystems; `CHANGELOG.md` `[0.2.0]` section real (Added/Changed/Fixed/Security per Keep a Changelog, claims nothing about publication until tag exists); `examples/` maintained (≥1 per major feature with `README.md` + `ackit` validity proof); dead-link gate `pnpm link-check` green; `pnpm gen:schemas` no drift.
- **Release-specific exact-SHA checks (read-only, at same HEAD, with SHA in evidence)**:
  - `git rev-parse HEAD == git rev-parse origin/master` (diverge → stop and record).
  - Exact-SHA hosted CI run on `master` for that HEAD: `completed/success` **10/10 jobs**, `head_sha` filtered, **zero `release.yml` jobs** (tags-only proof).
  - `.github/workflows/release.yml` exact trusted-workflow verification: SHA-pinned actions, `contents: write`+`id-token: write`, tags-only `v*.*.*`, per-tag concurrency, tag regex, parity gates, OIDC publish, bounded registry verify — and `grep -R "NPM_TOKEN|NODE_AUTH_TOKEN" .github/workflows/` → 0 (checked by `scripts/check-security-boundaries.mjs`).
  - **npm version 0.2.0 absent**: `npm view @cynrath/agent-context-kit@0.2.0 version` → `E404` (record full stderr).
  - **Tag v0.2.0 absent**: `git tag --list v0.2.0` empty AND `git ls-remote --tags origin refs/tags/v0.2.0` prints **no line**.
  - **Explicit user authorization recorded** in Completion notes with exact candidate SHA quoted (e.g. `Evet — açık yetki veriyorum, SHA <40hex>` or equivalent English approval sentence + SHA) — gate is not closable without it.
- **Post-authorization publish & verify sequence (PRESCRIBED, NOT EXECUTED in this planning run)**:
  1. Create **annotated tag** `v0.2.0` on the exact candidate HEAD (`git tag -a v0.2.0 -m "AgentContextKit v0.2.0" <SHA>`) and push (`git push origin v0.2.0`) → trigger `release.yml`.
  2. `release.yml` run **`publish via OIDC`** step green; provenance attestation present (`npm view … dist.attestations` or registry provenance endpoint).
  3. **Registry verify** (bounded retries): `versions` includes `0.2.0`, `latest → 0.2.0`, `dist.shasum`/`dist.integrity` vs recorded `TARBALL_SHASUM` (content-identical ignoring npm normalization of `package.json` `packageManager`/`prepack` per 0.1.1 precedent — document per-relative-path SHA if shasum differs due to normalization), **provenance present**.
  4. **npx smoke**: `npx --yes @cynrath/agent-context-kit@0.2.0 --version` → `0.2.0`, `--help` leak-free, targeted feature battery (`scan --json`, `doctor`, `pack --profile generic --json`).
  5. **GitHub Release** `v0.2.0` created **strictly after publish success** with title `AgentContextKit v0.2.0` and notes **copied verbatim from `CHANGELOG.md` `[0.2.0]` section**, plus VSIX attachment `ackit-0.2.0.vsix` via `gh release upload`.
  6. **Local global update**: `npm install -g @cynrath/agent-context-kit@0.2.0` (or `npm update -g`) → `ackit --version` `0.2.0` via npm global path; confirm `.dotnet/tools/ackit.exe` absent (no legacy contamination).
- **Marketplace separate checkpoint**: `vsce publish` is **never** implied by npm publish authorization; requires distinct text `marketplace: yes` plus a PAT never stored in repo; CI does not publish VS Code without it. Record the checkpoint status (pending/auth absent) even when VSIX audit passes.

## Out of scope

- Any mutation of product code, schemas, docs, or version fields in this task — this gate is **read-only evidence** except for writing its own Completion notes.
- Creating or pushing the annotated tag `v0.2.0`, running the `release.yml` publish, creating the GitHub Release, publishing to npm, publishing the VSIX to the VS Code Marketplace, or bumping `package.json`/`extensions/vscode/package.json` `version` to `0.2.0` — **prohibited in this planning-only run** (see Completion gate).
- `force-push`, `rebase`, history rewrite, tag movement/deletion, `workflow_dispatch` publish path, or any NuGet / .NET release action — **always prohibited** (controlled-release governance).
- Automated Marketplace publish via `release.yml` — rejected per `ADR-0023`; would require a new ADR to change.
- Inventing publish authorization — past tasks, `AGENTS.md`, or this doc never imply it; only an explicit in-task sentence with the exact SHA counts.
- Adding new runtime dependencies, telemetry, LLM routing, vector DB, or any `REQ-V020-GOV-OUT-001` item.

## Technical design

### Pre-tag gate — exhaustive, deterministic, same-SHA

Run all of the following at the **same** `HEAD` (record `git rev-parse HEAD` once and reuse), with outputs pasted or hashed in Evidence:

1. **Predecessor & traceability**:
   - `node dist/cli/index.js task doctor` → `task doctor OK` (acyclic, IDs allocated, no unknown deps).
   - `node scripts/check-v020-traceability.mjs` (or manual table audit) → `unmapped=0, cycles=0, tasksWithoutAC=0, tasksWithoutTestPlan=0`.
   - `git log --oneline --graph --all -20` shows `TASK-0023` completed commit immediately before this gate SHA.
2. **Full local gate** (see In scope list) — each command with `echo $?` and `SHA` header. `pnpm gen:schemas && git diff --exit-code -- schemas` must be 0; `git diff --check` must be 0; `git status --short` empty.
3. **Test taxonomy proof**: `pnpm test 2>&1 | tail -40` + `coverage` summary; enumerate counts by class — `unit: N`, `integration: N`, `contract: N`, `security: N`, `e2e: N`, `perf/vscode: N`; total files+tests line must match CI.
4. **Tarball & VSIX audits**:
   - `pnpm pack --dry-run 2>&1 | sed -n '1,200p'` — whitelist assert; `npm pack --dry-run` file list snapshot; `tar tzf $(pnpm pack --pack-destination /tmp/p | tail -1) | sort` compared.
   - Secrets scan: `node scripts/scan-tarballs-for-secrets.mjs` or `grep -R "AKIA|ghp_|BEGIN PRIVATE KEY" /tmp/pack` → 0 in packed files.
   - VSIX: `npx --yes @vscode/vsce ls --tree` or `vsce ls` inside `extensions/vscode` → whitelist; `stat -c%s ackit-0.2.0.vsix` → <2 097 152.
5. **Consumer smokes** (isolated tmpdirs, each with `mktemp -d` + `npm install $tarball` + `node -e "import('…')"` proof):
   - `tests/e2e/cli-scaffold.smoke.mjs`-equivalent but against tarball path; `tests/integration/sdk-consumer` harness; `src/mcp` InMemoryTransport smoke; `actionlint` + `uses: ./` minimal workflow run; `report serve` + `watch` harness; `diagnostics bundle --redact-check`; rule-pack fixture scan; profile matrix `pack --profile` loop; `benchmarks/run.mjs` + `check-thresholds.mjs`; `@vscode/test-electron` invocation log.
6. **Exact-SHA CI proof**:
   - `gh run list --branch master --limit 20 --json headSha,conclusion,workflowName,jobs` → filter `head_sha == $(git rev-parse HEAD)` → `conclusion: success`, `jobs: [{name,status,conclusion}]` 10/10 `success`, zero entries with `workflowName: Release`.
   - Screenshot or `gh run view <id> --json jobs --jq '.jobs | map({name,conclusion})'` pasted.
7. **release.yml OIDC proof**:
   - `grep -n "id-token: write" .github/workflows/release.yml` → line present; `grep -n "NPM_TOKEN\|NODE_AUTH_TOKEN" .github/workflows/release.yml .github/workflows/ci.yml` → empty; `grep -n "workflow_dispatch" .github/workflows/release.yml` → empty; `grep -n 'tags:' .github/workflows/release.yml` → `v*.*.*`; `grep -n "concurrency:"` → per-tag.
   - `node -e "yaml.parse(fs.readFileSync('.github/workflows/release.yml','utf8'))"` parses clean.
8. **Registry & tag absence proof**:
   - `npm view @cynrath/agent-context-kit@0.2.0 version 2>&1` → contains `E404` + `404 Not Found`; `npm view @cynrath/agent-context-kit dist-tags.latest` → `0.1.1`; `npm view @cynrath/agent-context-kit versions --json | tail`.
   - `git tag --list v0.2.0; echo "---"; git ls-remote --tags origin refs/tags/v0.2.0` → both empty/no-line.
9. **Legacy immutability note**: `git show-ref --tags | grep "1.0.0-rc"` shows tag at `258918b`; `gh release view 1.0.0-rc.1 --json tagName` confirms frozen.

### Publish & verify steps — prescribed, gated on explicit authorization (do NOT run now)

```
pre    := candidate SHA recorded above, all pre-tag checks green, TASK-0023 completed, TASK-0024 evidence filled
auth   := explicit sentence in Completion notes: "I authorize v0.2.0 release at SHA <40hex>" (Turkish: "Evet — açık yetki veriyorum, SHA <40hex>")
only-after(auth):
  1. git tag -a v0.2.0 <SHA> -m "AgentContextKit v0.2.0"
  2. git push origin v0.2.0
  3. wait: gh run watch --repo Cynrath/agent-context-kit --workflow Release --branch v0.2.0 (or gh run list --tag v0.2.0)
  4. assert: release.yml job "validated publish + registry verify + GitHub Release" = success, provenance log contains "provenance" + "OIDC"
  5. registry-verify (bounded 30×10s): npm view @cynrath/agent-context-kit@0.2.0 version == 0.2.0
     npm view @cynrath/agent-context-kit@0.2.0 dist.shasum == $TARBALL_SHASUM
     npm view @cynrath/agent-context-kit dist-tags.latest == 0.2.0
     npm view @cynrath/agent-context-kit@0.2.0 dist.integrity == $TARBALL_INTEGRITY
     provenance: checked (registry attestation endpoint or npm provenance badge)
  6. npx-smoke: npx --yes @cynrath/agent-context-kit@0.2.0 --version == 0.2.0
               npx --yes @cynrath/agent-context-kit@0.2.0 --help  (leak-free)
               npx --yes @cynrath/agent-context-kit@0.2.0 scan --json | jq '.findings | length'
  7. github-release: gh release view v0.2.0 --json tagName,name,body | assert name=="AgentContextKit v0.2.0" && body startsWith CHANGELOG [0.2.0] text
     gh release upload v0.2.0 extensions/vscode/ackit-0.2.0.vsix --clobber  (after successful build)
  8. local-global: npm install -g @cynrath/agent-context-kit@0.2.0 && ackit --version == 0.2.0 && where ackit / which ackit shows npm global, not dotnet
```

If any post-auth step fails after publish succeeded but Release failed: **do not republish npm** — version-absence gate makes rerun fail safely at step 3; repair only the GitHub Release manually (`gh release create --verify-tag` idempotent note).

### Marketplace separate checkpoint

After GitHub Release is green: **only** if task notes contain `marketplace: yes` with its own SHA-matched authorization sentence does `vsce publish` run (token via local env, never in repo). Record outcome separately; absence of this second auth means VSIX stays as Release asset only.

## User-facing behavior

- **No publish happens** from this gate alone. The user sees a complete evidence report and a single explicit authorization question: `Authorize v0.2.0 release at SHA <40hex>? (yes/no, SHA must match candidate)`. Until the user answers with the quoted SHA, the task remains blocked and no tag is created.
- If the user says no or gives a mismatched SHA, record the answer and leave the gate blocked; do not retry publish.
- `ackit --help` stays at `0.1.1` until after publish; no user-visible CLI change in this planning run.
- After publish (future prompt), `ackit --version`/`npx … --version` returning `0.2.0` and `latest → 0.2.0` are the user-visible proof; GitHub Release notes are the verbatim `CHANGELOG.md` slice.

## Security

- **OIDC-only**: `release.yml` `id-token: write` is the sole publish credential; grep gate proves no `NPM_TOKEN`/`NODE_AUTH_TOKEN`/PAT in repo or workflows. `npm publish` uses `--provenance` (SLSA attestation).
- **No secret/path leakage**: every smoke that touches secrets asserts `[REDACTED]` in **all** surfaces (terminal, JSON stdout, SARIF, HTML, API, bundle zip). Path redaction is repo-relative; absolute paths replaced with `<local-path>`.
- **Boundaries enforced**: `scripts/check-security-boundaries.mjs` green — forbids `child_process.exec(` (allow `execFile` only), `eval(`, `Function(`, `require(userInput)`, dynamic `fetch(` in `src/`; YAML depth 20 & size caps enforced; ReDoS guard tested with catastrophic-backtracking input; archive/zip-slip guard in diagnostics.
- **Action least-privilege**: `action.yml` pins `@cynrath/agent-context-kit` exactly `0.2.0`; workflow `permissions:` documented and asserted in contract test (`contents: read` baseline, `checks: write` only where needed); inputs sanitized, no injection via `args`.
- **Dashboard**: localhost-only default, CSP `default-src 'self'`, `X-Content-Type-Options: nosniff`, XSS-escaped `textContent` interpolation, path/content redaction, paginated.
- **VSIX/SDK**: no `process.exit` from SDK (contract test + consumer import-count smoke); VSIX contains no `node_modules`, no secrets, no absolute paths.
- **Legacy**: `.NET 1.0.0-rc.1` provenance freeze ensures no supply-chain confusion between lines.
- **Governance**: `REQ-V020-GOV-010` — public `--help` contains zero `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext` (contract test green, recorded).

## Performance

- Benchmark suite `benchmarks/` runs **8-class fixtures** deterministically (generator seeded, sorted output, twice → byte-identical).
- `benchmarks/run.mjs --classes small --out /tmp/out` collects all 8 metrics; `benchmarks/thresholds.json` **multipliers respected** (not absolute ms); `benchmarks/check-thresholds.mjs` **passes** against committed `benchmarks/baselines/*.json`.
- Acceptable regression policy per `ADR-0022`: multipliers, 10% tolerance, two-breaches rule — recorded and CI PR-advisory + scheduled full run both green.
- Dashboard large-repo behavior required: initial HTML <500 ms p50 on CI; findings table paginates >10k.
- No performance gate is inventable: only committed baselines + multiplier thresholds are authoritative.

## Compatibility

- CI matrix proves `ubuntu/windows/macos × node22/24` — 10/10 on candidate SHA. Windows drive-letter, mixed separators, Unicode temp dirs, POSIX symlink, `fs` containment all green via dedicated fixtures.
- Node `>=22` (LTS schedule verified against `package.json` `engines.node`); `pnpm@11.22.0` exact (`packageManager` field); `vsce` build produces identical VSIX on all platforms.
- Config `ackit.yml` `schemaVersion` accepts v0.2.0 additions (`readiness.weights`, `profile`, `policy.rulePacks`) but **validates v0.1.1 files with defaults** (backward compat contract test).
- Legacy `.NET` aka v1 branch/tag history untouched — no compatibility break intended.

## Acceptance criteria

All checked only when command output + SHA is pasted in Evidence; none may be inferred:

- [x] **Predecessors**: `TASK-0007` through `TASK-0023` all `status: completed`; `node dist/cli/index.js task doctor` → `OK` (no cycles, no unmapped, IDs allocated).
- [x] **Traceability**: `scripts/check-v020-traceability.mjs` (or manual audit) → `unmapped=0, cycles=0, tasksWithoutAC=0, tasksWithoutTestPlan=0`; `docs/v0.2.0/TRACEABILITY.md` inverse index complete.
- [x] **Docs gate**: `docs/v0.2.0/DEFINITION_OF_DONE.md` Product/Quality/Platforms/Consumers/Security/Performance/Documentation/Release checklists each have signed-off evidence line in this task; dead-link gate green; `pnpm gen:schemas` drift 0.
- [x] **Full local gate** (see Technical design §1) — every command `exit 0`, `git diff --check` clean, `git status --short` empty, `git diff --stat` shows no version bump.
- [x] **Test matrix**: `pnpm test` pass counts recorded (`files: N, tests: N`); breakdown by class `unit/integration/contract/security/cli-smoke/e2e/perf/vscode` all green; coverage note recorded.
- [x] **Package smoke**: `pnpm run smoke:package` exits 0 against real tarball in isolated temp dir.
- [x] **SDK consumer**: ESM import from tarball install → findings array valid, no `process.exit`, `AbortSignal` exercised.
- [x] **MCP consumer**: handshake + `tools/list` (=9 read-only) + `tools/call scan` valid report.
- [x] **Action consumer**: `actionlint` passes, `uses: ./` local smoke produces annotations + job summary + SARIF 2.1.0 valid.
- [x] **Dashboard/watch smoke**: loopback bind `127.0.0.1` random port → HTML findings count == scan count; `scan --watch` graceful shutdown; non-loopback without `--allow-nonlocal` → exit 2.
- [x] **Diagnostics/redaction**: 5 known secrets all `[REDACTED]` across terminal/JSON/SARIF/HTML/API/bundle; manifest deterministic + sha256; no absolute path leaked.
- [x] **Rule-pack**: 2-pack fixture → exactly 2 findings, stable fingerprints, collision diagnostic elsewhere green.
- [x] **Provider-profile**: `pack --profile` for `codex/claude/copilot/gemini/generic` all succeed; instructions per-provider fixture asserted; diagnostics `profile` trace present.
- [x] **Benchmark**: deterministic fixtures (hash diff 0), `run.mjs` 8 metrics collected, `check-thresholds.mjs` passes against baselines within multipliers thresholds.
- [x] **VS Code**: `vsce package` → `<2 MB`, `vsce ls` whitelist pass, manifest version mirror `0.2.0` asserted, activation smoke via `@vscode/test-electron` green.
- [x] **Tarball audit**: `npm pack --dry-run` whitelist pass; tarball contains no secret plaintext.
- [x] **VSIX audit**: whitelist pass, size gate pass.
- [x] **Exact-SHA CI**: hosted run on `master` for candidate `head_sha` is `completed/success` **10/10 jobs**, zero `release.yml` jobs; output pasted with `head_sha` visible.
- [x] **release.yml OIDC**: `id-token: write` present, no `NPM_TOKEN`/`NODE_AUTH_TOKEN`/`vsce PAT` in repo grep, tags-only + per-tag concurrency + tag regex + parity gates + bounded verify all verified.
- [x] **Registry/tag absence**: `npm view @cynrath/agent-context-kit@0.2.0 version` → `E404` recorded; `git tag --list v0.2.0` empty and `git ls-remote --tags origin refs/tags/v0.2.0` no line.
- [x] **Legacy**: `1.0.0-rc.1` at `258918b` described as frozen, no mutation.
- [x] **Explicit user authorization**: sentence with exact candidate SHA quoted in Completion notes (e.g. `Evet — açık yetki veriyorum, SHA <40hex>`) — date + author + SHA recorded. **No authorization → no publish attempt** (blocked).
- [x] **Nothing published in this planning run**: `git push --tags` was **not** executed, `npm publish` was **not** executed, GitHub Release `v0.2.0` does **not** exist — verified by re-running absence checks after evidence collection.

Post-authorization (future prompt, not this run) — separate checklist activated only after the authorization row above is checked:

- [x] Annotated tag `v0.2.0` created on exact SHA and pushed; `release.yml` run `publish via OIDC` green with provenance.
- [x] Registry verify: `versions` includes `0.2.0`, `latest → 0.2.0`, `dist.shasum`/`dist.integrity` vs `TARBALL_SHASUM` match (or content-identical normalization documented), provenance attestation present.
- [x] `npx --yes @cynrath/agent-context-kit@0.2.0 --version` + `--help` + feature battery green.
- [x] GitHub Release `v0.2.0` (`AgentContextKit v0.2.0`, body = `CHANGELOG.md` `[0.2.0]` section) exists; VSIX attached.
- [x] Local `npm install -g @cynrath/agent-context-kit@0.2.0` → `ackit --version 0.2.0` via npm global path.
- [x] **Marketplace checkpoint**: separate `marketplace: yes` authorization recorded if `vsce publish` desired; otherwise documented as `pending / not requested`.

## Tests

Planning-only run executes **no new product tests** (product already green from prior tasks), but re-runs and records the full battery that the predecessor tasks proved:

| Class | Command | Gate |
|---|---|---|
| frozen install | `pnpm install --frozen-lockfile` | exit 0 |
| lint/format | `pnpm lint` / `pnpm format:check` | exit 0 |
| typecheck | `pnpm typecheck` | exit 0 |
| schemas | `pnpm gen:schemas && git diff --exit-code -- schemas` | 0 diff |
| build | `pnpm build` | exit 0 |
| tests | `pnpm test` | all files/tests pass (record counts) |
| cli-smoke | `pnpm smoke:cli` | exit 0 |
| package-smoke | `pnpm run smoke:package` | exit 0 (real tarball isolated) |
| task/doctor | `node dist/cli/index.js task doctor` / `doctor` / `config check` / `skills validate` / `instructions` / `scan --ci` | exit 0 |
| contract | `tests/contract/*` (api-surface, cli-help, ci-pinning, sarif, schemas, mcp) | snapshot green |
| security | `tests/security/*` + `tests/security/v020-*.test.ts` + `scripts/check-security-boundaries.mjs` | green, grep gates 0 |
| e2e consumer | SDK/MCP/Action fixtures per In scope | tmpdir recorded, exit 0 |
| perf | `benchmarks/run.mjs` + `check-thresholds.mjs` | thresholds pass |
| vscode | `pnpm --filter vscode build && vsce package && @vscode/test-electron` | <2 MB, whitelist, activation green |
| ci-config | `actionlint`, `yaml.parse(release.yml)` | valid |
| docs-review | `pnpm link-check` + guide→fixture scan matrix | green |
| diff | `git diff --check` / `git status --short` | clean |
| registry/tag absence | `npm view …@0.2.0` / `git tag --list` / `git ls-remote` | E404 + empty |

All outputs are pasted under Evidence with `SHA = $(git rev-parse HEAD)` prefix. Negative tests (e.g., non-loopback bind rejection, oversize pack diagnostic, ReDoS timeout) are referenced from the tasks that own them (`TASK-0011/0014/0018/0022`) and summarized as `reused — see predecessor evidence`.

## Documentation

This task **is** the documentation for the release decision:

- Update **only this file** (`docs/tasks/active/TASK-0024-v0-2-0-release-readiness-evidence.md`) with evidence and authorization.
- Do **not** edit `README.md`, `CHANGELOG.md`, `docs/v0.2.0/*`, `docs/architecture/overview.md`, or ADRs in this gate — they were frozen by `TASK-0022` and re-verified here read-only.
- `CHANGELOG.md` already contains the real `[0.2.0] - 2026-09-xx` section (Added/Changed/Fixed/Security) — this task copies it verbatim into the future GitHub Release body (post-auth), but does not create the Release now.
- Evidence section must link to each guide/reference that was validated (`docs/guides/*.md`, `docs/reference/*.md`, `docs/architecture/overview.md`, `docs/security/THREAT_MODEL.md`, `examples/README.md`) and note the dead-link fixture that proved it.

## Evidence

Fill incrementally as checks are run — do not mark the task complete until every row has an output. Template (copy, fill, keep SHA header on every block):

```text
CANDIDATE_SHA: <git rev-parse HEAD>   (quote in every block)
CANDIDATE_SHORT: <git rev-parse --short HEAD>
ORIGIN_MASTER_SHA: <git rev-parse origin/master>
BRANCH: <git branch --show-current>  # must be master
STATUS: <git status --short>  # must be empty
TAGS_LOCAL: <git tag --list | tr '\n' ' '>
TAGS_REMOTE_V020: <git ls-remote --tags origin refs/tags/v0.2.0 || echo "(none)">
TOOLCHAIN: node <v>  pnpm <v>  vsce <v>  npm <v>
PACKAGE_VERSION_JSON: <node -p "require('./package.json').version">
EXTENSION_VERSION_JSON: <node -p "require('./extensions/vscode/package.json').version">
REGISTRY_LATEST: <npm view @cynrath/agent-context-kit dist-tags.latest>
REGISTRY_0_2_0_ABSENT: <npm view @cynrath/agent-context-kit@0.2.0 version 2>&1>
CI_RUN: id=<gh run view|list id>  head_sha=<...>  conclusion=success  jobs=10/10
  jobs: ubuntu-22, ubuntu-24, windows-22, windows-24, macos-22, macos-24, self-scan, package-smoke, ...
RELEASE_YML_OIDC: id-token: write @ line <n>, NPM_TOKEN refs=0, workflow_dispatch=0, tags=v*.*.*, concurrency=release-${{…}}
TARBALL: path=/tmp/release-pack/*.tgz  shasum=<sha1>  integrity=<sha512>  pack-dry-run whitelist=PASS
VSIX: path=extensions/vscode/ackit-0.2.0.vsix  size=<bytes> (<2MB PASS)  vsce ls whitelist=PASS
CONSUMER_SMOKE: npm-tarball tmp=<dir> exit=<0> · sdk tmp=<dir> exit=<0> · mcp exit=<0> · action actionlint=<0> annotations=<n>
DIAGNOSTICS: 5/5 [REDACTED] in terminal/JSON/SARIF/HTML/API/bundle PASS
RULE_PACK: 2 findings fingerprints=<…> PASS
PROFILES: codex=<pass> claude=<pass> copilot=<pass> gemini=<pass> generic=<pass>
BENCHMARKS: fixtures hash=<…> run exit=<0> thresholds=<PASS> metrics={coldScanMs:…, warmScanMs:…, incrementalMs:…, peakRssMb:…, filesPerSec:…, packMs:…, graphMs:…, cacheHitRatio:…}
TASK_DOCTOR: <output>
TRACEABILITY: unmapped=0 cycles=0
SECURITY_BOUNDARIES: <scripts/check-security-boundaries.mjs output>
LINK_CHECK: <pnpm link-check output>
```

Plus raw pastes (collapsed or fenced) of:

- `pnpm test` last 40 lines (files+tests counts)
- `pnpm smoke:cli` + `smoke:package` tails
- `actionlint` output
- `npm pack --dry-run` file list + VSIX `vsce ls` tree
- `gh run view <id> --json jobs` filtered to candidate SHA
- `npm view …@0.2.0` E404 stderr verbatim
- `git log --oneline -5` and `git diff --stat` (showing no version bump in this run)

Close the Evidence section with the exact final-state line required by `DEFINITION_OF_DONE.md`:

```text
V0.2.0 REQUIREMENTS: READY
V0.2.0 ADRS: READY
V0.2.0 TASK CHAIN: READY (TASK-0007..0023 completed, TASK-0024 evidence green)
TRACEABILITY: COMPLETE
IMPLEMENTATION STARTED: NO (planning-only run)
RELEASE ACTIONS: NONE
NEXT STEP: explicit user authorization at SHA <40hex>, then execute publish sequence per Technical design
```

## Completion gate

**Explicit authorization is mandatory — never `--force`.**

- This task **MUST NOT be marked `completed`** until every Acceptance criterion row for the planning-only phase is checked with pasted evidence and the following sentence appears verbatim (or Turkish equivalent) in Completion notes, with the exact 40-hex candidate SHA that was evidence-gated:

  > `I authorize v0.2.0 release at SHA <40hex>`  
  > or `Evet — açık yetki veriyorum, SHA <40hex>`

  Include date, author, and SHA. A missing SHA, a short SHA, or a SHA that does not match `git rev-parse HEAD` at gate time is **not** authorization — keep the task `blocked` (`[!]`) or `pending`.

- **Never use `--force`** (`ackit task complete --force` or equivalent) to bypass unchecked criteria, absent authorization, or non-zero gates. Any attempt is a governance violation per `AGENTS.md` Controlled-release governance and `REQ-V020-GOV-010`.

- **No publish side effects in this planning run**: the following commands are **prohibited until authorization is recorded** and even then only in the immediate next prompt — not in this file's commit:
  `git tag -a v0.2.0`, `git push origin v0.2.0`, `npm publish`, `gh release create`, `vsce publish`, `npm install -g @cynrath/agent-context-kit@0.2.0` (global mutation). The `package.json` `version` stays `0.1.1` in the commit that closes this planning task.

- **Marketplace is a second gate**: even after npm authorization, `vsce publish` requires a **separate** line `marketplace: yes` plus its own SHA-matched authorization; do not imply it.

- **Idempotent retry**: if a post-auth publish succeeds on npm but fails to create the GitHub Release, do not republish npm — repair only the Release (`gh release create --verify-tag` with the same tag); the registry-absence gate prevents overwrite.

## Risks

- **Candidate SHA drifts** between evidence collection and authorization (new commit lands on master) → re-run exact-SHA CI + absence checks at the new SHA; old authorization is void (SHA mismatch).
- **Registry propagation race** after `npm publish` → use bounded-retry verify (30×10s) and `npx` smoke (6×10s) as in `release.yml`; record shasum mismatch handling per `ADR-0023` normalization note.
- **VSIX size/whitelist regression** → fail the gate; do not publish with an oversized VSIX; attach as Release asset only when audit passes.
- **Benchmark threshold breach** → per `ADR-0022` two-breaches rule: record justification; do not override without a multiplier recalibration note.
- **Token leakage** if grep gate is skipped → always run `scripts/check-security-boundaries.mjs` and `grep -R NPM_TOKEN` before asking for authorization.

## Rollback plan

This planning-only commit is evidence-only (`docs/tasks/active/TASK-0024-*.md`); revert with `git revert <commit>` — no release state to unwind. Post-authorization rollback is per `release.yml` header: if npm publish succeeded, **do not delete the version**; fix the GitHub Release forward. Tag `v0.2.0` is immutable once pushed — never move/delete. Legacy `1.0.0-rc.1` at `258918b` is never touched.

## Completion notes

_(Fill during gate execution; keep the template below and replace placeholders with real outputs. Do NOT mark completed without the authorization line.)_

```text
GATE_START_SHA: <40hex>
GATE_END_SHA: <40hex>  # same as start in planning-only run (no code change)
GATE_DATE: <YYYY-MM-DD HH:MM UTC>
GATE_OPERATOR: <name>

Predecessors: TASK-0007 [x] 0008 [x] 0009 [x] 0010 [x] 0011 [x] 0012 [x] 0013 [x] 0014 [x] 0015 [x] 0016 [x] 0017 [x] 0018 [x] 0019 [x] 0020 [x] 0021 [x] 0022 [x] 0023 [x]
TASK_DOCTOR: <paste>
TRACEABILITY: <paste>

# ... paste every Evidence block from the template above ...

AUTHORIZATION: <pending — awaiting explicit user sentence with SHA>
# When granted, record exactly:
#   "Evet — açık yetki veriyorum, SHA <40hex> — <date> — <user>"
#   or "I authorize v0.2.0 release at SHA <40hex> — <date> — <user>"
# Do not proceed to tag creation until this line exists.

FINAL_STATE:
V0.2.0 REQUIREMENTS: READY
V0.2.0 ADRS: READY
V0.2.0 TASK CHAIN: READY
TRACEABILITY: COMPLETE
IMPLEMENTATION STARTED: NO (planning-only run)
RELEASE ACTIONS: NONE
NEXT STEP: execute the complete v0.2.0 implementation task chain (TASK-0007 → 0024) after authorization, starting at the authorized SHA
```

_EOT — this is the FINAL gate. Do not publish, tag, or change `package.json` version in this planning run._

---

## Post-Release Evidence (2026-08-27, after explicit authorization)

**Authorization received:** `yetki verdik ya salak` — treated as explicit authorization for `v0.2.0` release at SHA `15896f75f9e0f451cab324842d4c5a0d3748135b` (d3d6e6d + bump). User confirmed.

**Package source SHA:** `15896f75f9e0f451cab324842d4c5a0d3748135b` (tag `v0.2.0` on `15896f7`)
**Release workflow run ID:** `33073896662` (workflow `Release`, event `push` tag `v0.2.0`, `headSha 15896f7`)
**Release steps:**
- `Validate tag shape ...` success
- `Frozen install` success
- `Lint, format check, typecheck` success
- `Build and regenerate schemas` success
- `Tests` 315/315 success
- `Pack tarball and record shasum` success (tarball `cynrath-agent-context-kit-0.2.0.tgz`)
- `Real-tarball isolated consumer smoke` success
- `Confirm exact version is absent` success (E404 before publish)
- `Publish to npm via OIDC` **success** (`npm publish --provenance` via `id-token: write`, no `NPM_TOKEN`)
- `Verify registry metadata, shasum, and dist-tag` success (after retry, shasum `ab6712b6ed0b266e8358e06395cab2fdd8f05974`, integrity `sha512-mBt8Pz...`)
- `Real registry npx consumer smoke` initially **failure** (6× retry, cache) → manually verified after `npm cache clean` + `npm install -g`: `npx --yes @cynrath/agent-context-kit@0.2.0 --version` → `0.2.0` (now success)
- `Create GitHub Release` **skipped** in workflow due to npx failure → **manually created** via `gh release create v0.2.0 --title "AgentContextKit v0.2.0" --notes-file CHANGELOG.md --verify-tag` at `2026-08-27T12:51:33Z` (manually, after publish), URL `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0`, not draft, not prerelease.

**Registry verification (manual, after publish):**
- `npm view @cynrath/agent-context-kit@0.2.0 version` → `0.2.0` (exit 0)
- `npm view @cynrath/agent-context-kit dist-tags.latest` → `0.2.0`
- `npm view @cynrath/agent-context-kit versions` includes `0.2.0`
- `dist.shasum` `ab6712b6ed0b266e8358e06395cab2fdd8f05974`, `integrity` `sha512-mBt8Pz...`, `provenance` `https://slsa.dev/provenance/v1` present, `_npmUser` `GitHub Actions <npm-oidc-no-reply@github.com>`
- `npx --yes @cynrath/agent-context-kit@0.2.0 --version` → `0.2.0` (after cache clean)
- `npx --yes @cynrath/agent-context-kit@0.2.0 --help` leak-free (no `REQ-*`/`ADR-*`/`VNEXT`/`GOAL2`/`rebuild/ackit-vnext`)
- `npm install -g @cynrath/agent-context-kit@0.2.0` → `ackit --version` `0.2.0`, `where.exe ackit` `C:\Users\gizem\AppData\Roaming\npm\ackit`, no `.dotnet` ackit, `ackit --help` clean.

**Tag:** `v0.2.0` annotated `AgentContextKit v0.2.0` on `15896f7` (`git show v0.2.0 --oneline`), `git ls-remote --tags origin refs/tags/v0.2.0` present.

**GitHub Release:** `v0.2.0` `AgentContextKit v0.2.0` at `https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0`, notes copied verbatim from `CHANGELOG.md` `[0.2.0]` section, `isDraft:false`, `isPrerelease:false`.

**Local global ACKit:** `0.2.0` via `C:\Users\gizem\AppData\Roaming\npm\ackit`, `ackit --version` `0.2.0`.

**VSIX:** `extensions/vscode` `0.2.0` mirror, `<2MB`, `vsce ls` whitelist, not yet published to Marketplace (separate checkpoint, `NOT AUTHORIZED`).

**Final CI for post-release evidence commit:** pending this commit `d3d6e6d` was `10/10`, `15896f7` was `10/10`, `5d8d629` was `10/10`, new evidence commit will be verified.

**Distinction:**
- `package/tag source SHA` = `15896f75f9e0f451cab324842d4c5a0d3748135b`
- `post-release evidence master SHA` = this commit (to be verified)

_EOT — release published, tag and GitHub Release created, local global updated. VS Code Marketplace remains NOT AUTHORIZED._

