# Policy v2 Reference (ADR-0028)

Policy v2 adds risk-tiered autonomy and a review policy to the existing
policy engine — one engine, additive sections, no second gate framework.
Both are optional: repositories without them see zero behavior change.

Surfaces (precedence: policy documents over `ackit.yml` config):

- `ackit.yml` — optional `autonomy:` and `review:` sections.
- Policy documents (via `policy.extends`) — the same sections; document
  layers merge over config.

## Autonomy tiers

| Tier | Class | Default |
|---|---|---|
| `tier0` | read / inspect / analyze | `allow` |
| `tier1` | local edits, local tests | `allow` |
| `tier2` | git mutations, controlled local state changes | `ask` |
| `tier3` | external writes (PR/issue/browser form) | `ask` |
| `tier4` | publish / deploy / production / destructive | `deny` |

Per-tier decisions are `allow | ask | deny`. **Deny is sticky**: once any
active layer denies a tier, later layers' allows cannot reopen it. Invalid
values are ignored with diagnostics — they never open a gate.

## ACKit-owned boundary enforcement

ACKit enforces tiers **only at boundaries it actually controls**:

| Boundary | CLI surface | Tier |
|---|---|---|
| `forceCompletion` | `task complete --force` | `tier2` |
| `checkpointExport` | `checkpoint export` (incl. handoff pack) | `tier2` |
| `verdictRegistration` | `verification record` | `tier2` |

Enforcement semantics (identical for all three):

- An **explicitly-set deny** in any active layer refuses the command with
  `POLICY-TIER-DENIED` (exit code 4).
- An **explicitly-set ask** in a non-interactive context is treated as deny
  (`POLICY-TIER-ASK`, exit 4) — no silent bypass.
- **Compatibility rule**: when no active layer explicitly sets the tier,
  the boundary proceeds with today's behavior. The default table's
  `tier2: ask` is advisory for unconfigured repositories; enforcement
  fires only for explicit configuration. This keeps v0.2.2 behavior for
  repositories that never configured autonomy.
- Every enforcement decision is journaled as a `policy-decision` event
  (detail: `{boundary, tier, decision}`).
- `tier4`-class actions (publish/deploy/release) do not exist as
  ACKit-owned boundaries: they are refused by product governance entirely
  and can never be agent-authorized through this table.

**Explicit limitation**: ACKit cannot intercept provider-internal tool
calls. This table is advisory metadata for provider integrations and
enforcement for ACKit-owned surfaces only.

## Review policy

Optional `review:` section:

```yaml
review:
  required: [correctness, regression, security, tests, architecture, plan-compliance, documentation]
  blockingSeverity: [critical, high, medium]
```

For workflow-enabled tasks whose profile requires a verdict, a PASS-family
verdict must also satisfy the configured review policy; violations surface
through the completion gate's `VERDICT_BLOCKING` blocker path. Repositories
without a review policy see zero change.

### Required dimensions and the code-prefix registry

A review dimension is covered when the verdict's `findings[]` contain a
finding whose stable `code` starts with one of the dimension's registered
prefixes:

| Dimension | Code prefixes |
|---|---|
| `correctness` | `CORRECTNESS`, `SEMANTIC`, `LOGIC` |
| `regression` | `REGRESSION`, `BEHAVIOR` |
| `security` | `SECURITY`, `SECRETS`, `INJECTION`, `TRAVERSAL` |
| `tests` | `TEST`, `EVIDENCE`, `COVERAGE` |
| `architecture` | `ARCHITECTURE`, `DESIGN`, `STRUCTURE` |
| `plan-compliance` | `PLAN`, `SCOPE`, `UNPLANNED` |
| `documentation` | `DOC`, `DOCUMENTATION` |

A required dimension with no covering finding produces
`REVIEW-DIMENSION-MISSING`.

### blockingSeverity mapping

Verdict finding severities (`ackit.verdict.v1`: `blocking | warning | info`)
map onto the review severity ladder (`critical | high | medium` =
threshold ranks 3 | 2 | 1) deterministically:

- verdict `blocking` → rank 3 (critical-equivalent)
- verdict `warning` → rank 1 (medium-equivalent)
- verdict `info` → rank 0 (below every threshold)

A finding at or above the configured threshold produces
`REVIEW-BLOCKING-SEVERITY`. Note: a literal `blocking` finding on a
PASS-family verdict is already rejected structurally at registration
(`VERDICT-BLOCKING-ON-PASS`); this check covers the mapped severities of
the remaining findings.

## Related

- `docs/reference/config.md` — the `autonomy`/`review` config sections.
- `docs/decisions/ADR-0028-policy-v2-autonomy-tiers-roles-hooks.md` — the
  accepted decision.
- `ackit policy check` — prints the resolved autonomy table and review
  policy (terminal and JSON).
