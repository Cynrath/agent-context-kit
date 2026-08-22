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

- [ ] Unit: valid parse, each config section typed; invalid cases produce code+location+suggestion (snapshot contract).
- [ ] Deterministic merge precedence covered by table-driven unit tests.
- [ ] `schemaVersion` mismatch yields dedicated error code, not generic failure.
- [ ] JSON Schema validates the repo's own sample config (contract test).
- [ ] Integration: missing config ⇒ sensible defaults; malformed YAML ⇒ stable error exit 2 per ADR-0007.

## Test steps

`pnpm vitest run tests/unit/config tests/integration/config` + snapshot review.

## Risks

zod/YAML line-number mapping fidelity → keep raw-path metadata through parser wrapper.

## Rollback plan

Focused commit revert.

## Completion notes

(placeholder)
