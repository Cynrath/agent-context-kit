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
| `autonomy` | optional `tier0..tier4: allow\|ask\|deny` | Policy v2 (ADR-0028). Enforced at ACKit-owned boundaries (`task complete --force`, checkpoint/handoff export, verdict registration): an explicitly-set deny refuses (exit 4) and an explicitly-set ask is treated as deny in non-interactive contexts; repositories that never set a tier keep today's behavior (defaults are advisory for unconfigured repos). Deny in any active layer is sticky. |
| `review` | optional `required: []`, `blockingSeverity: []` | Policy v2 (ADR-0028). When configured, a PASS-family verdict must cover every required review dimension (via the documented code-prefix registry) and carry no finding at/above a configured blocking severity; violations block workflow-task completion through the `VERDICT_BLOCKING` path. Unconfigured repositories see zero change. |
| `workflow` | optional `defaultProfile`, `requireVerifier`, `profiles.{requireEvidence,requireVerifier}` | Parsed for forward compatibility; the workflow completion gate currently uses the built-in profile requirements (`ackit workflow set --profile`), so these keys do not alter gate behavior in this release — recorded as a known limitation (final-validation audit TASK-0064). |

Precedence (deterministic): **defaults < ackit.yml < policy extends < CLI
flags**. Arrays replace; objects merge recursively. The effective digest
(sha256 over sorted-key canonical JSON) feeds cache keys and report headers.

Editor support: `schemas/ackit.schema.json` (generated from the same zod
source of truth via `pnpm gen:schemas`).

Errors carry stable codes (`CFG-*`), file:line, received value, and a
did-you-mean suggestion where applicable.
