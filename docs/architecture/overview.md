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

## Workflow expansion architecture (ADR-0025 … 0028)

New first-class primitives (additive; legacy repositories unaffected):

```
src/core/
  workflow/      profiles (quick|standard|high-risk), stage machine, per-task
                 state store (.ackit/workflow/TASK-####/state.yaml,
                 ackit.workflow.v1), declarative lifecycle gates, verification
                 attempt state (verify/fix loop)
  intent/        committed intent docs (docs/intent/, ackit.intent.v1):
                 validate, normalize, fingerprint (machine-independent sha256)
  checkpoint/    per-task checkpoints (.ackit/workflow/.../checkpoints/,
                 ackit.checkpoint.v1): deterministic extraction, staleness
                 detection, resume context + handoff pack renderers
  evidence/      evidence contract v2 (ackit.evidence.v2): criteria synced
                 from the task doc, typed evidence entries, completeness
                 validation (structure only — never semantic judgment)
  verification/  verification bundle (ackit.verification-bundle.v1) +
                 verdict registration/validation (ackit.verdict.v1,
                 append-only, latest governs)
  drift/         deterministic drift findings (frozen code list:
                 UNPLANNED_FILE_CHANGE, MISSING_REQUIRED_ARTIFACT, ...)
  roles/         portable role contracts (templates/roles/, ackit.role.v1,
                 data-only — no subagent runtime)
  journal/       sanitized local execution journal (ackit.execution-journal.v1,
                 closed event-kind list, redaction at construction)
```

Existing subsystems are extended, never duplicated: task frontmatter gains
optional `intentRef`/`specRefs`/`decisionRefs`/`planRef` (schemaVersion stays 2);
`buildContextPack` gains task/resume ranking signals; the policy engine gains
optional `autonomy` (tier0–4 × allow/ask/deny) and `review` sections; skills gain
deterministic provider projections.

### Terminology

- **Intent** — committed, schema-versioned record of problem/desired
  outcome/constraints/non-goals/acceptance criteria (`ackit.intent.v1`).
  Required only by workflow profiles that declare it; never inferred by ACKit.
- **Workflow profile** — explicit lifecycle contract selected per task:
  `quick`, `standard`, or `high-risk` (ADR-0025).
- **Stage** — one ordered step of a profile; forward-only, machine-checkable.
- **Required artifact** — a declared prerequisite (intent, spec, plan, task,
  evidence, verdict) that must exist before its stage advances.
- **Evidence** — typed, referenced proof linked to an acceptance criterion
  (`ackit.evidence.v2`). Implementation existing ≠ criterion verified.
- **Verdict** — a fresh-context verifier's structured judgment
  (`ackit.verdict.v1`): PASS / PASS_WITH_WARNINGS / REWORK_REQUIRED / BLOCKED.
- **Checkpoint** — deterministic per-task snapshot enabling resume after
  compaction, chat/model/provider switch, restart, or handoff
  (`ackit.checkpoint.v1`).
- **Resume / handoff pack** — deterministic rendered context (concise resume
  block; self-contained handoff document) for a fresh agent.
- **Drift finding** — deterministic machine check result with a frozen code
  (e.g. `UNPLANNED_FILE_CHANGE`); never a semantic claim.
- **Autonomy tier** — risk classification (0–4) of an action with an
  allow/ask/deny policy; enforced only at ACKit-owned boundaries (ADR-0028).
- **Role contract** — portable, data-only YAML contract a provider may use when
  spawning subagents (verifier must emit `ackit.verdict.v1`); ACKit never
  spawns or routes agents.
- **Execution journal** — sanitized local-only event log of ACKit-observable
  transitions; not telemetry; never uploaded.
