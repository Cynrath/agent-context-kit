# TASK-0269: vNext config engine and JSON schemas

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0267
- Unlocks: TASK-0270, TASK-0281, TASK-0282
- Requirement IDs: REQ-CFG-001, REQ-CFG-002, REQ-CFG-003, REQ-CFG-004, REQ-CFG-005 (error UX bar), REQ-TEST-001 (config unit part)
- Related ADR/spec: ADR-0004 (config name/versioning); MS§18

## Purpose

Implement configuration loading/validation: real YAML parser, zod runtime schema, actionable errors (file:line, did-you-mean), deterministic merge order (defaults < config < policy extends < CLI flags), and published JSON Schemas for editor support.

## Scope

- `src/core/config/`: load `ackit.yml` (name per ADR-0004) or fallback default when absent; schemaVersion gate with clear upgrade error.
- Config surface per REQ-CFG-002 (scan includes/excludes, limits, thresholds, instruction/skills behavior, context budget, policy extends, baseline, output, cache, workspaces).
- Error rendering per REQ-CFG-005 example quality bar; `ackit config check` subcommand.
- Emit `schemas/ackit.schema.json` (+ placeholders wired later by policy/task tasks into their own schema files).

## Out of scope

Policy file semantics (TASK-0282); task frontmatter schema internals (TASK-0281 owns its schema file).

## Affected files

- `src/core/config/**`, `src/shared/**` (result/error types)
- `schemas/ackit.schema.json`
- `tests/unit/config/**`, `tests/integration/config/**`

## Data/database impact

None.

## Security impact

Schema validation blocks malicious glob/path config values before they reach fs layer; unknown-property rejection prevents typo-driven insecure defaults.

## Permission/auth impact

None.

## Localization impact

English messages.

## UX impact

Error example bar from MS§37 becomes contract-tested output shape.

## Logging/audit impact

Config digest exposed for cache keys (REQ-BASE-004 consumer).

## Acceptance criteria

- [x] Unit: valid parse, each config section typed; invalid cases produce code+location+suggestion (snapshot contract).
- [x] Deterministic merge precedence covered by table-driven unit tests.
- [x] `schemaVersion` mismatch yields dedicated error code, not generic failure.
- [x] JSON Schema validates the repo's own sample config (contract test).
- [x] Integration: missing config ⇒ sensible defaults; malformed YAML ⇒ stable error exit 2 per ADR-0007.

## Test steps

`pnpm vitest run tests/unit/config tests/integration/config` + snapshot review.

## Risks

zod/YAML line-number mapping fidelity → keep raw-path metadata through parser wrapper.

## Rollback plan

Focused commit revert.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation (`src/core/config/`, strict TS):
- `schema.ts` — zod v4 schema (CONFIG_SCHEMA_VERSION=1) covering REQ-CFG-002 fully: scan include/exclude/severityThreshold, limits (maxFiles/maxFileBytes/maxTotalBytes/maxDepth/deadlineMs), instructions, skills, context budget, policy extends, baseline, output format, cache, workspaces. Strict objects reject unknown keys; explicit full default objects per section.
- `errors.ts` — stable CFG-* codes + Levenshtein-based nearestKey did-you-mean (case-insensitive, distance ≤ 2).
- `load.ts` — loadAckitConfig: reads ackit.yml (ADR-0004 name; --config override), missing file ⇒ defaults with sourceFile=null; malformed YAML ⇒ CFG-YAML-SYNTAX with line/column from parser offsets; schemaVersion gate BEFORE validation ⇒ dedicated CFG-SCHEMA-VERSION; unknown-key pre-pass reports CFG-UNKNOWN-KEY with exact key location + suggestion; zod value errors mapped to CFG-INVALID-VALUE with path/line/received. applyLayers implements deterministic deep merge (arrays replace; objects merge recursively) with precedence defaults < config < policy extends < CLI flags; policyLayer param is the TASK-0282 seam. configDigest = sha256 over sorted-key canonical JSON (REQ-BASE-004 input). stableStringify exported for deterministic artifacts.
- `json-schema.ts` — z.toJSONSchema from the same zod source of truth (single identity, REQ-ARCH-009); regenerated to schemas/ackit.schema.json via `pnpm gen:schemas` (scripts/generate-schemas.mjs over dist).
- CLI: `ackit config check [--root] [--config] [--json]` — terminal mode renders `CODE file:L:C message (did you mean 'x'?)`; JSON mode emits pure stdout {schemaVersion:"ackit.config-check.v0", ok, digest|errors}; exit 2 on invalid config (ADR-0007); subcommand exit codes propagate through a CliInvocation record consumed by runCli.

Tests (16 files / 83 tests total in repo, all green):
- unit/config/schema.test.ts (defaults table, typed sections, invalid rejections), suggestions.test.ts (did-you-mean cases), merge.test.ts (precedence table incl. array-replace and no-input-mutation).
- integration/config/load.test.ts (missing config ⇒ defaults+stable digest; malformed YAML ⇒ syntax code with line>1; missing explicit config ⇒ CFG-FILE-MISSING; valid file loads typed+attributed; unknown key ⇒ location line 2 + 'scan' suggestion; schemaVersion 99 ⇒ dedicated code).
- integration/config/config-check-cli.test.ts (exit 0 on defaults; pure JSON ok=true+digest; invalid ⇒ exit 2 with structured error incl. suggestion).
- contract/config-schema.test.ts (committed schemas/ackit.schema.json === generated; examples/ackit.example.yml validates).

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest 16 files / 83 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

Notes: zod 4 requires full output-shaped defaults for `.default()` on object sections (v3 `{}` shortcut removed) — fixed by explicit defaults; biome organize-imports applied to scripts/generate-schemas.mjs; useLiteralKeys stays disabled (conflicts with noPropertyAccessFromIndexSignature).

External actions: none.
