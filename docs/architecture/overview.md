# Architecture Overview

ACKit is a single npm package (`@cynrath/agent-context-kit`) exposing:

- a CLI (`ackit`) and
- a read-only MCP server (official TypeScript SDK over stdio)

built from one modular TypeScript (strict, ESM) source tree.

```
src/
  cli/            commander wiring; global options; exit codes per ADR-0007
  api/            public-API alias layer (scanRepository)
  index.ts        THE public programmatic entry (contract-tested allowlist)
  core/
    filesystem/   canonical-root engine: normalize → realpath → containment,
                  safe walker with limits/cancellation, text/binary classifier,
                  ignore stack (builtin → .gitignore chain → user globs)
    config/       ackit.yml zod schema, YAML loader w/ line-accurate errors,
                  deterministic merge + sha256 digest, JSON-schema emission
    scanner/      pipeline: discovery → ignore/filter → classify → bounded
                  rule evaluation → redact-at-construction → fingerprint →
                  deterministic sort; built-in ACKITnnn rule catalog;
                  inline suppression with visible bypass advisory
    instructions/ instruction-graph discovery/resolution (codex/claude/
                  gemini/copilot/shared), reference+security scanning,
                  conflict/duplicate/staleness/advisory analysis
    skills/       open-standard skill parser/validator, ownership lock,
                  idempotent builtin install/sync
    context/      budgeted deterministic context pack; optimize advisor with
                  fenced fix mode
    policy/       offline declarative policies: extends DFS, locked rules,
                  suppressions w/ expiry, digest, forbidden patterns
    tasks/        docs-first task system (active|archive) with completion gate
    git/          porcelain-based changed/staged/range sets
    cache/        content-addressed scan cache; baseline compare/write
    reporting/    terminal/json/sarif/markdown/html renderers; loopback serve
    watch/        debounced watcher + git hooks installer
    workspace/    monorepo detection + path partitioning
  mcp/            official SDK server (tools/resources/prompts)
shared/           exit codes, diagnostics sanitizer, version source, tokens
```

## Invariants

1. **Single door to the filesystem** — feature code never calls `fs` directly.
2. **Redaction before reporters** — findings are constructed already-safe.
3. **Determinism** — same repo+config ⇒ byte-identical JSON/packs/fingerprints.
4. **Offline by construction** — resolution paths cannot reach the network.
5. **Single identity source** — package.json feeds CLI/MCP/reports alike.

## SDK as shared engine (v0.2.0, ADR-0021)

`src/index.ts` is the frozen public SDK surface (contract-tested). CLI (`src/cli/**`), MCP (`src/mcp/**`), dashboard, GitHub Action, and VS Code extension all reuse `scanRepository` / `buildContextPack` / `buildInstructionGraph` / `loadAckitConfig` via this boundary. External consumers (`npm install @cynrath/agent-context-kit` → `import { scanRepository }`) use the same ESM import. `src/core/**` is internal; the distributed `package.json` `exports` exposes only `"."` and `"./mcp"`.

### Reserved subsystems (v0.2.0)

The following modules are reserved for v0.2.0 and not yet implemented in this baseline:

- `src/core/readiness/` — deterministic readiness scoring engine (`scoreRepository`)
- `src/core/profiles/` — provider-aware context profiles (Codex, Claude, Copilot, Gemini, generic)
- `src/core/policy/packs/` — declarative rule packs (YAML/JSON, collision handling, ReDoS-safe)
- `src/core/dashboard/` + `src/dashboard/ui/` — local localhost-only dashboard/report server
- `src/core/diagnostics/` — diagnostics and sanitized bundle
- `benchmarks/` — performance benchmark fixtures/harness (deterministic, multiplier thresholds)
- `extensions/vscode/` — official VS Code extension (SDK consumer, VSIX)

No code exists for these subsystems in this baseline commit; they are documented here to pin architecture boundaries before implementation starts. See `docs/v0.2.0/EXECUTION_PLAN.md` and ADRs 0015–0024.

Details: `docs/concepts/*.md`, ADRs under `docs/rebuild/decisions/` and `docs/decisions/`.
