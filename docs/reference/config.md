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
| `workflow` | optional `defaultProfile`, `requireVerifier`, `profiles.{requireEvidence,requireVerdict}` | Effective from this release: `defaultProfile` selects the profile used by `ackit workflow set` when `--profile` is omitted; `requireVerifier` / `profiles.requireVerdict` / `profiles.requireEvidence` tighten the built-in profile minimums additively (explicit `true` adds a requirement, explicit `false`/absence never loosens). The completion gate, `workflow advance`/`show`, drift evaluation, and MCP `ackit_workflow_status` all read the same resolved path. Absent `workflow:` preserves exact v0.3.0 defaults (legacy repos unchanged). Unknown keys and invalid values fail deterministically (`CFG-*`). |

Precedence (deterministic): **defaults < ackit.yml < policy extends < CLI
flags**. Arrays replace; objects merge recursively. The effective digest
(sha256 over sorted-key canonical JSON) feeds cache keys and report headers.

Editor support: `schemas/ackit.schema.json` (generated from the same zod
source of truth via `pnpm gen:schemas`).

Errors carry stable codes (`CFG-*`), file:line, received value, and a
did-you-mean suggestion where applicable.
