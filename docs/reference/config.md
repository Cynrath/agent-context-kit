# Config Reference — `ackit.yml`

Canonical file: `ackit.yml` at repository root (ADR-0004). Optional; omitted
sections use defaults. Unknown keys are errors with did-you-mean hints;
`schemaVersion` mismatch gets a dedicated upgrade code.

| Section | Keys (defaults) | Notes |
|---|---|---|
| `schemaVersion` | `1` | required literal |
| `scan` | `include: []`, `exclude: []`, `severityThreshold: low` | exclude = file globs |
| `limits` | `maxFiles`, `maxFileBytes`, `maxTotalBytes`, `maxDepth`, `deadlineMs` | engine limits; breaches emit diagnostics |
| `instructions` | `enabled: true`, `maxTokenEstimatePerFile: 20000` | graph + optimize sizing |
| `skills` | `enabled: true` | validator/CLI gating |
| `context` | `maxTokens: 100000` | pack budget default |
| `policy` | `extends: []` | local paths or `npm:<pkg>/<file>` (pre-installed only) |
| `baseline` | path string | consumed by scan options |
| `output` | `format: terminal` | terminal\|json\|markdown\|html\|sarif |
| `cache` | `enabled: true` | `.ackit/cache` content-addressed store |
| `workspaces` | `enabled: false` | monorepo partitioning switch |

Precedence (deterministic): **defaults < ackit.yml < policy extends < CLI
flags**. Arrays replace; objects merge recursively. The effective digest
(sha256 over sorted-key canonical JSON) feeds cache keys and report headers.

Editor support: `schemas/ackit.schema.json` (generated from the same zod
source of truth via `pnpm gen:schemas`).

Errors carry stable codes (`CFG-*`), file:line, received value, and a
did-you-mean suggestion where applicable.
