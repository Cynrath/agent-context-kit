---
name: ackit-policy-authoring
description: Author layered ackit policy files with deterministic merge, scoping and lockable rules.
---

# Policy Authoring

Activate when the user asks to codify scan thresholds or team-wide rule
overrides.

See [merge order](references/merge-order.md) for precedence and digest.

## Steps

1. Start from `ackit.yml`; add a policy layer with `schemaVersion: 1` and `extends` (local repo-relative files or `npm:<pkg>/<file>` for already-installed packages only — resolution is offline by construction, remote fetch is refused with `POL-OFFLINE-BLOCKED`).
2. Scope overrides with `org` / `repo` / `pathScopes`; lock security-relevant rules with `locked: true` so downstream layers cannot weaken them (`POL-LOCKED-CONFLICT`; deny is sticky across layers). Suppressions require `reason` and support `expiresAt`.
3. Verify with `ackit policy check` (chain plus digest plus autonomy plus review plus problems) and `ackit config check` (schema validation). Risk tiers (`tier0 allow` through `tier4 deny`) enforce ONLY at ACKit-owned boundaries (`task complete --force`, `checkpoint export`, `verification record`): explicit `deny` refuses with `POLICY-TIER-DENIED` (exit 4); explicit `ask` in a non-interactive context denies. Optional `review:` (`required` dimensions plus `blockingSeverity`) gates `PASS`-family verdicts via `VERDICT_BLOCKING`.

## Notes

- Remote URL auto-fetch is forbidden; dependencies must be pre-installed.
- Deterministic merge: defaults < `ackit.yml` < policy extends chain (declaration order) < CLI flags; arrays replace, objects merge; digest is sha256 over sorted-key JSON.
- Repositories without `autonomy:` / `review:` see zero behavior change.
