# ACKit — AgentContextKit

<p align="center">
  <a href="https://www.npmjs.com/package/@cynrath/agent-context-kit"><img src="https://img.shields.io/npm/v/@cynrath/agent-context-kit?label=npm%20v0.2.0&color=0B84FF&style=flat-square" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@cynrath/agent-context-kit"><img src="https://img.shields.io/npm/dt/@cynrath/agent-context-kit?label=downloads&style=flat-square&color=00C853" alt="downloads"></a>
  <a href="https://github.com/Cynrath/agent-context-kit"><img src="https://img.shields.io/github/stars/Cynrath/agent-context-kit?label=stars&style=flat-square&color=FFB300" alt="stars"></a>
  <a href="https://github.com/Cynrath/agent-context-kit/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="license"></a>
  <a href="https://github.com/Cynrath/agent-context-kit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Cynrath/agent-context-kit/ci.yml?branch=master&label=CI&style=flat-square" alt="CI"></a>
  <a href="https://github.com/Cynrath/agent-context-kit/releases/tag/v0.2.0"><img src="https://img.shields.io/badge/release-v0.2.0-9C27B0?style=flat-square" alt="release"></a>
</p>

<p align="center"><strong>Turn any repository into an agent-ready repository</strong> — instruction graph, skills, scanning, context packs, tasks, policy, readiness &amp; MCP.<br>Offline-first · Deterministic · Task-first · <code>ackit</code> on Node >=22</p>

> **v0.2.0** — consolidated product-expansion release on `master` (`@cynrath/agent-context-kit@0.2.0`, `ackit 0.2.0`). See [Docs](#docs) · [Changelog](CHANGELOG.md) · [Security](docs/security/THREAT_MODEL.md) · [Contributing](CONTRIBUTING.md) · License: MIT.

## What it does

ACKit reads your repository the way a coding agent would — instructions, skills, tasks, docs, code — and makes it **safe and efficient** for that agent: it resolves who-listens-to-what across provider instruction files, validates open-standard skills without ever executing them, scans for secrets and hygiene problems with redacted evidence, builds token-budgeted context packs with explained exclusions, enforces a docs-first task workflow with machine-checkable gates, applies team policy as code (locked rules, offline), scores **Agent Readiness 0–100** with explainable deductions, and exposes all of it read-only over MCP.

## Why

Agent tooling today is either convention-based (nothing is verified) or cloud-coupled (your code leaves the machine). ACKit takes a third path: **deterministic local analysis** with stable machine-readable contracts, an offline-by-construction dependency policy, and ownership-respecting writes. It dogfoods its own workflow: this repository was built by following the same task system the product ships.

## Features (v0.2.0)

- **Agent Readiness / Context Quality** — `ackit readiness` + `ackit scan --json` `readiness` (0–100, 6 categories: Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10, weighted renormalization, `ackit.readiness.v1` schema, `--fail-below/--strict/--baseline/--compare`, N/A handling)
- **Instruction Graph v2** — codex/claude/gemini/copilot (+shared) surfaces, nesting, `includeScopes`/`excludeScopes`/`providerApplicability`/`provenance`/`shadowedBy`/`duplicateOf`/`orderIndex`, `applyTo` globs, conflict/duplicate/shadow/dead detection, deterministic `depth→precedence→id` ordering, POSIX normalization, symlink `realpath`, `maxNodes`/`maxDepth` limits
- **Provider-Aware Profiles** — built-ins `codex`/`claude`/`copilot`/`gemini`/`generic` (`templates/profiles/*.yml`, `schemas/profile.schema.json`), selection `CLI --profile > ackit.yml profile > auto-detect > generic`, `ackit pack --profile` budget/`includePriority`, `ackit instructions --profile/--explain` profile file-conventions, `diagnostics --json` profile trace
- **Declarative Rule/Policy Packs** — `schemas/rule-pack.schema.json` v1 (`packId/namespace/version/severity/rules[]` with `presence|pattern|config|dependency|instruction`, `glob`/`scope`/`match`, `overrides`/`composition`), local `policy.rulePacks` + `node_modules` package-dist only (no fetch), `POL-PACK-COLLISION`/`POL-NETWORK-REFUSED`, ReDoS/size limits, pure `evaluatePack`
- **Optimize v2** — `ackit optimize --explain --category --min-severity --format terminal|json|markdown|sarif` (8-class taxonomy, `evidence[]`/`confidence`/`tokenWasteEstimate`/`provenance`/`plan {target,action,diff}`, `--fix --dry-run` preview on managed surfaces only)
- **Public SDK v1** — `src/index.ts` allowlist (`scanRepository`, `loadAckitConfig`, `buildContextPack`, `buildInstructionGraph`, `resolveEffectiveStack`, `validateSkills`, `AckitError`, `scoreRepository`, `evaluateRulePacks`, `resolveProfile`, …), `sideEffects:false`, `type:module`, `exports {".","./mcp"}`, `AbortSignal` <200ms, `docs/reference/sdk.md` + `examples/sdk-consumer.mjs`
- **Official GitHub Action** — `action.yml` `AgentContextKit` `shield/blue` `node24` `dist/action/index.js`, inputs `command/args/fail-threshold/upload-sarif`, outputs `findings-json/sarif-path`, safe `execFile` arg split, SARIF 2.1.0, job summary, `contents: read` least-privilege, SHA-pinned `f548/ae0d/b906`, dogfood `.github/workflows/ackit-action-dogfood.yml`
- **Watch / Incremental** — `ackit scan --watch` debounced/coalesced 400ms, ignored `.git/node_modules/dist/.ackit/coverage/artifacts`, incremental cache, graceful `SIGINT` → `WatchHandle.done` exit 0, cross-platform
- **Local Dashboard / Report Server** — `ackit dashboard` / `ackit report serve --port 0` localhost-only `127.0.0.1` default, `--allow-nonlocal` required for non-loopback, `Content-Security-Policy: default-src 'self'` + `X-Content-Type-Options: nosniff`, XSS-escaped (`textContent`), `/api/scan|graph|readiness|tasks.json` paginated, polling live updates, `<50KB` vanilla JS
- **Diagnostics / Sanitized Bundle** — `ackit diagnostics --json` (`ackit.diagnostics.v1`), `ackit diagnostics bundle --out/--redact-check` deterministic `bundle-manifest.json` (`sha256` + redaction count), 5-secret `[REDACTED]` proof, no absolute paths
- **Performance Benchmarks** — `benchmarks/{generate-fixtures.mjs,run.mjs,thresholds.json}` 7 deterministic fixture classes, 8 metrics (`coldScanMs`/`warmScanMs`/`incrementalMs`/`peakRssMb`/`filesPerSec`/`packMs`/`graphMs`/`cacheHitRatio`), median-of-3, `1.5x` thresholds, PR advisory vs scheduled
- **VS Code Extension** — `extensions/vscode` `0.2.0` publisher `cynrath` `lints` Linters `onStartupFinished` (readiness tree, Problems `ACKITxxx`, graph “instructions for current file” via `resolveEffectiveStack`, tasks/policy/optimize, palette `Refresh/Show Graph/Optimize/Diagnostics`, watcher debounced, no telemetry, `<2MB` VSIX) — **VSIX-ready, not yet published to Marketplace** (separate `marketplace: yes` checkpoint)
- **MCP Server** — official SDK stdio, 9 read-only tools, 5 resources, 4 prompts, `InMemoryTransport` cancellation
- **Task-First Workflow** — `docs/tasks` single-active rule, completion gate, `ackit task doctor`
- **Offline-First / Security** — zero network in product code, secrets redacted at construction, one containment engine, read-only MCP, `docs/security/THREAT_MODEL.md`

## Install

Requires Node **>= 22**.

Install globally from the npm registry (latest is `0.2.0`):

```bash
npm install --global @cynrath/agent-context-kit
ackit --version
```

Or run once with npx (explicit `0.2.0`):

```bash
npx --yes @cynrath/agent-context-kit@0.2.0 --version
```

To run from a source checkout instead:

```bash
pnpm install --frozen-lockfile && pnpm build
node dist/cli/index.js --help
```

## Quickstart (v0.2.0)

```bash
ackit init --dry-run        # plan shims + builtin skills (writes nothing)
ackit scan --ci             # scan; exit 1 at/over threshold (medium)
ackit readiness             # 0–100 with deductions, N/A renormalization
ackit instructions --explain # graph v2 with provenance
ackit optimize --explain    # 8-class advisor with waste estimates
ackit pack --profile codex --max-tokens 50000  # provider-aware pack
```

Every command supports `--json` for machine-readable stdout and `--help`. Full tour: `docs/guides/getting-started.md`.

## CLI overview

| Command | Purpose | Key Options |
|---|---|---|
| `init` | plan/write instruction shims + builtin skills | `--dry-run`, `--agents` |
| `scan` | security/hygiene scan | `--ci --changed --staged --since --range --baseline --write-baseline --watch --format --fail-below/--strict/--compare` |
| `readiness` | deterministic 0–100 scoring | `--fail-below --strict --baseline/--compare --json` |
| `optimize` | hygiene advisor v2 | `--fix --dry-run --profile --explain --category --min-severity --format terminal\|json\|markdown\|sarif --diff` |
| `diagnostics` | env/config/instructions/cache/policy/tasks | `--json`, `bundle --out/--redact-check --profile` |
| `dashboard` | local dashboard (localhost-only) | `--host/--port/--allow-nonlocal --open` |
| `instructions` | graph tree/JSON + effective chain v2 | `--provider --profile --for --explain --json` |
| `pack` | budgeted context pack (provider-aware) | `--max-tokens --profile --include --changed --format` |
| `skills` | list / validate / install |  |
| `task` | create / list / start / complete / archive / doctor |  |
| `policy` / `config` | check offline policy / validate config |  |
| `cache` / `workspaces` / `hooks` / `report serve` / `mcp serve` | utilities |  |

Details: `docs/reference/cli.md` · Exit codes: `docs/reference/exit-codes.md` · Schemas: `docs/reference/schemas.md`

## Configuration

Optional root `ackit.yml` (schema-versioned, strict):

```yaml
schemaVersion: 1
scan:
  severityThreshold: medium
limits:
  maxFiles: 50000
context:
  maxTokens: 80000
policy:
  extends: []
  rulePacks: []
readiness:
  weights:
    instructions: 25
    security: 25
    contextEfficiency: 20
    taskHygiene: 10
    skills: 10
    policy: 10
  strictThreshold: 80
profile: codex
profiles:
  extend: []
```

Validate: `ackit config check`. Schema: `schemas/ackit.schema.json`. Reference: `docs/reference/config.md`.

## Instruction graph v2

AGENTS/CLAUDE/GEMINI/Copilot surfaces resolve into one graph with `includeScopes`/`excludeScopes`/`providerApplicability`/`provenance`, `shadowedBy`/`duplicateOf`, explicit precedence tiers, nested-scope wins, `AGENTS.override.md`, copilot `applyTo` globs, checksums, token estimates and security flags:

```bash
ackit instructions --provider claude --for src/app.ts --explain
ackit instructions --profile codex --json | jq .profile
```

Concepts: `docs/concepts/instruction-graph.md` · Reference: `docs/reference/instruction-graph.md`.

## Scanning & severity

Findings carry `ruleId/severity/category/message/path:line:col/fingerprint/redacted evidence/remediation/documentationKey/suppression`. Deterministic order; inline `ackit-ignore:ACKITnnn` bypasses stay visible via an advisory. Policy packs add `POL-PACK-*` findings. Rules table: `docs/reference/rules.md`.

## Context budget & profiles

Ranked by transparent weights (include > changed > task refs > scope > proximity > relevance > type − size), filled greedily into `--max-tokens`, manifest explains every exclusion. Profiles adjust `maxTokens`/`includePriority`/`fileConventions`:

```bash
ackit pack --profile copilot --json | jq .manifest
```

Concepts: `docs/concepts/context-budget.md` · `docs/concepts/provider-profiles.md`.

## Policy as code & Rule Packs

Versioned YAML layers with `extends` (local files or pre-installed npm packages only), locked rules, scoped suppressions with expiry, `rulePacks` with `overrides`/`composition` and ReDoS/size guards, thresholds and a digest wired into reports/cache:

```bash
ackit policy check
ackit scan --json | jq .findings | grep POL-PACK
```

Guide: `docs/guides/rule-packs.md`.

## Readiness scoring

Deterministic `scoreRepository` pure function (no LLM) over graph/pack/scan/skills/policy/tasks → `ackit.readiness.v1` JSON + terminal tree, CI-gateable `--fail-below`:

```bash
ackit readiness --strict
ackit scan --ci --fail-below 80
```

Reference: `docs/reference/readiness.md` · `docs/concepts/readiness.md`.

## GitHub Action

Official `Cynrath/agent-context-kit@v0.2.0` (or SHA-pinned for high-assurance):

```yaml
permissions:
  contents: read
jobs:
  ackit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@f548e57e544e1ff5a4c46bf1e1b8685f8e4a348a
      - uses: Cynrath/agent-context-kit@v0.2.0
        with:
          command: scan
          args: "--json"
          fail-threshold: high
          upload-sarif: "false"
      # optional: upload SARIF via github/codeql-action/upload-sarif@v3
      # optional: upload findings via actions/upload-artifact@v4
```

Inputs `command/args/fail-threshold/upload-sarif`, outputs `findings-json/sarif-path`, annotations/SARIF 2.1.0/job summary, least-privilege. Guide: `docs/guides/ci.md` · Action: `action.yml`.

## Watch / Dashboard

```bash
ackit scan --watch          # debounced 400ms, incremental, SIGINT → exit 0
ackit dashboard --port 0 --open  # localhost-only, CSP, XSS-escaped, live polling
ackit report serve ./report.html --port 0  # static report
```

Guide: `docs/guides/watch-dashboard.md`.

## Diagnostics

```bash
ackit diagnostics --json | jq .profile
ackit diagnostics bundle --out ./ackit-diag.zip --redact-check
```

Reference: `docs/reference/diagnostics.md`.

## SDK

```js
import { scanRepository, scoreRepository, buildInstructionGraph } from "@cynrath/agent-context-kit";
const result = await scanRepository({ canonicalPath: process.cwd() });
```

ESM-only, `sideEffects:false`, `AbortSignal` cancellable, no `process.exit`. Reference: `docs/reference/sdk.md` · Example: `examples/sdk-consumer.mjs`.

## VS Code

Extension is **implemented and VSIX-ready (`extensions/vscode` `0.2.0`, `<2MB`) but not yet published to Marketplace** — separate `marketplace: yes` checkpoint. From source: `pnpm --filter vscode build` + `vsce package` → `ackit-0.2.0.vsix`. Features: readiness tree, Problems `ACKITxxx`, graph “instructions for current file”, tasks/policy/optimize, palette `Refresh/Show Graph/Optimize/Diagnostics`, watcher. Guide: `docs/guides/vscode.md`.

## Workspaces

pnpm/npm/yarn/generic monorepo detection with per-workspace partitioning of instructions/policy/packs. Guide: `docs/guides/monorepo.md`.

## Exit codes

0 ok · 1 threshold/new-findings · 2 usage/config · 3 environment · 4 security boundary · 5 internal. Reference: `docs/reference/exit-codes.md`.

## Security

Threat model: `docs/security/THREAT_MODEL.md` · Trust model: `docs/security/SECURITY_MODEL.md`. Highlights: repository content is untrusted input; zero network in product code; secrets redacted at construction; filesystem access funneled through one containment engine; MCP server is read-only; dashboard localhost-only + CSP. Vulnerabilities: see `SECURITY.md`.

## Docs

Architecture: `docs/architecture/overview.md` · Concepts: `instruction-graph` / `context-budget` / `provider-profiles` / `readiness` · Guides: `getting-started` / `readiness` / `optimize` / `provider-profiles` / `instruction-graph` / `rule-packs` / `ci` / `watch-dashboard` / `diagnostics` / `sdk` / `vscode` / `monorepo` · Reference: `cli` / `config` / `rules` / `readiness` / `profile` / `rule-pack` / `instruction-graph` / `diagnostics` / `sdk` / `exit-codes` / `mcp` / `schemas` · Decisions: `docs/decisions/` · v0.2.0: `docs/v0.2.0/` · Tasks: `docs/tasks/active`

## MCP setup

```json
{ "mcpServers": { "ackit": { "command": "ackit", "args": ["mcp", "serve"] } } }
```

Reference: `docs/reference/mcp.md`.

## Requirements

Node >= 22 · pnpm 11 (development) · git optional (incremental features).

## Development

```bash
pnpm install --frozen-lockfile
pnpm lint && pnpm format:check && pnpm typecheck
pnpm build && pnpm test && pnpm smoke:cli
pnpm run smoke:package   # pack → temp install → CLI smoke
```

See `CONTRIBUTING.md` for the docs-first workflow.

## Versioning

Current: **`0.2.0`** on `master` · [Changelog](CHANGELOG.md) · [Releases](https://github.com/Cynrath/agent-context-kit/releases) · `latest → 0.2.0` via OIDC Trusted Publishing with provenance. Legacy `.NET/NuGet 1.0.0-rc.1` at `258918b` is frozen.

## License

MIT — `LICENSE`.
