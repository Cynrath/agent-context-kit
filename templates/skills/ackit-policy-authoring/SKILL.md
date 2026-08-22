---
name: ackit-policy-authoring
description: Author layered ackit policy files with deterministic merge, scoping and lockable rules.
---

# Policy Authoring

Activate when the user asks to codify scan thresholds or team-wide rule
overrides.

## Steps

1. Start from `ackit.yml`; add a policy layer with `schemaVersion` and
   `extends` (local files or already-installed packages only — resolution is
   offline by construction).
2. Scope overrides by org/repo/path; lock security-relevant rules so
   downstream repos cannot downgrade them.
3. Verify with the policy digest surfaced by `ackit config check` / scan JSON.

## Notes

- Remote URL auto-fetch is forbidden; dependencies must be pre-installed.
- Suppressions in policies need a reason and, ideally, an expiry.
