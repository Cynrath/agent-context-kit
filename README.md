# ACKit — AgentContextKit

**Turn any repository into an agent-ready repository** — instruction graph,
agent skills, security scanning, context budgeting, docs-first tasks,
policy-as-code, and MCP. Offline-first and deterministic.

> Status: **v0.1.1** — public CLI help cleanup and controlled-release
> automation hardening on the vNext line. Deterministic,
> offline-first agent readiness for coding agents. Requires Node >= 22.
> See [Docs](#docs) · [Security](docs/security/THREAT_MODEL.md) ·
> [Contributing](CONTRIBUTING.md) · License: MIT.

## What it does

ACKit reads your repository the way a coding agent would — instructions,
skills, tasks, docs, code — and makes it **safe and efficient** for that
agent: it resolves who-listens-to-what across provider instruction files,
validates open-standard skills without ever executing them, scans for secrets
and hygiene problems with redacted evidence, builds token-budgeted context
packs with explained exclusions, enforces a docs-first task workflow with
machine-checkable gates, applies team policy as code (locked rules, offline),
and exposes all of it read-only over MCP.

## Why

Agent tooling today is either convention-based (nothing is verified) or
cloud-coupled (your code leaves the machine). ACKit takes a third path:
**deterministic local analysis** with stable machine-readable contracts, an
offline-by-construction dependency policy, and ownership-respecting writes.
It dogfoods its own workflow: this repository was built by following the same
task system the product ships.

## Features

- Instruction graph: codex/claude/gemini/copilot surfaces, nesting, overrides,
  `applyTo` globs, conflict/duplicate/staleness/advisory analysis
- Agent Skills (open standard): parse/validate/install/sync with ownership
  lock; four built-ins included; scripts detected, never executed
- Scanning: secret shapes, credential assignments, private keys, connection
  strings, entropy advisories, absolute-path leaks, CI pinning hygiene,
  dependency drift — evidence always redacted
- Context packs: weighted deterministic ranking inside a token budget with a
  full manifest (hash/reason/tokens)
- Tasks: `docs/tasks` workflow with single-active rule and completion gate
- Policy-as-code: extends chains, locked rules, suppressions with expiry,
  digests — strictly offline
- Incremental & baselines: git changed/staged/range sets, content-addressed
  cache, fingerprint compare (new vs fixed)
- Reports: terminal, JSON, SARIF 2.1.0, Markdown, self-contained HTML;
  loopback report viewer
- Monorepo aware: pnpm/npm/yarn/generic detection with path-scoped semantics
- MCP server (official SDK, stdio): 9 read-only tools, 5 resources, 4 prompts

## Install

Requires Node **>= 22**.

Install globally from the npm registry:

```bash
npm install --global @cynrath/agent-context-kit
ackit --version
```

Or run once with npx:

```bash
npx --yes @cynrath/agent-context-kit@0.1.1 --version
```

To run from a source checkout instead:

```bash
pnpm install --frozen-lockfile && pnpm build
node dist/cli/index.js --help
```

## Quickstart

```bash
ackit init --dry-run        # plan shims + builtin skills (writes nothing)
ackit skills install        # install 4 built-in skills idempotently
ackit scan --ci             # scan; exit 1 at/over threshold
ackit instructions          # resolved instruction graph
ackit pack --max-tokens 50000
```

Every command supports `--json` for machine-readable stdout and `--help`.
Full tour: `docs/guides/getting-started.md`.

## CLI overview

| Command | Purpose |
|---|---|
| `init` | plan/write instruction shims + builtin skills |
| `scan` | security/hygiene scan (+`--ci --changed --staged --since --range --baseline --write-baseline --watch --format`) |
| `optimize` | hygiene advisor (`--fix` fenced to managed surfaces) |
| `pack` | budgeted context pack |
| `instructions` | graph tree/JSON + effective chain |
| `skills` | list / validate / install |
| `task` | create / list / start / complete / archive / doctor |
| `policy` / `config` | check offline policy / validate config |
| `cache` / `workspaces` / `hooks` / `report serve` / `mcp serve` | utilities |

Details: `docs/reference/cli.md` · Exit codes: `docs/reference/exit-codes.md`

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
```

Validate: `ackit config check`. Schema: `schemas/ackit.schema.json`.
Reference: `docs/reference/config.md`.

## Instruction graph

AGENTS/CLAUDE/GEMINI/Copilot surfaces resolve into one graph with explicit
precedence tiers, nested-scope wins, `AGENTS.override.md`, copilot `applyTo`
globs, checksums, token estimates and security flags:

```bash
ackit instructions --provider claude --for src/app.ts
```

Concepts: `docs/concepts/instruction-graph.md`.

## Scanning & severity

Findings carry `ruleId/severity/category/message/path:line:col/fingerprint/
redacted evidence/remediation/documentationKey/suppression`. Deterministic
order; inline `ackit-ignore:ACKITnnn` bypasses stay visible via an advisory.
Rules table: `docs/reference/rules.md`.

## Context budget

Ranked by transparent weights (include > changed > task refs > scope >
proximity > relevance > type − size), filled greedily into `--max-tokens`,
manifest explains every exclusion. Concepts:
`docs/concepts/context-budget.md`.

## Policy as code

Versioned YAML layers with `extends` (local files or pre-installed npm
packages only), locked rules, scoped suppressions with expiry, thresholds and
a digest wired into reports/cache. `ackit policy check`.

## Workspaces

pnpm/npm/yarn/generic monorepo detection with per-workspace partitioning of
instructions/policy/packs. Guide: `docs/guides/monorepo.md`.

## Exit codes

0 ok · 1 threshold/new-findings · 2 usage/config · 3 environment ·
4 security boundary · 5 internal. Reference: `docs/reference/exit-codes.md`.

## Security

Threat model: `docs/security/THREAT_MODEL.md` · Trust model:
`docs/security/SECURITY_MODEL.md`. Highlights: repository content is
untrusted input; zero network in product code; secrets redacted at
construction; filesystem access funneled through one containment engine;
MCP server is read-only. Vulnerabilities: see `SECURITY.md`.

## Docs

Architecture: `docs/architecture/overview.md` · Concepts:
instruction-graph / context-budget / agent-skills · Guides: getting-started /
ci / monorepo / agent-integration · Reference: cli / config / rules /
exit-codes / mcp / schemas · Decisions: `docs/decisions/README.md` ·
History: `docs/history/v1.md`

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

## Versioning & status

vNext restarts at `0.1.0`; v1 (.NET/NuGet `1.0.0-rc.1`) is frozen legacy and is
not part of this distribution line. Distribution is the scoped npm package
`@cynrath/agent-context-kit` (CLI binary `ackit`). Publishing, tagging, and
GitHub Releases follow the repository's controlled-release governance: each
action is separately authorized and verified (`AGENTS.md`). Changelog:
`CHANGELOG.md` (the `0.1.0` entry atop a verbatim legacy section).

## License

MIT — `LICENSE`.
