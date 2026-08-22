# Severity playbook

- critical: credential/token exposure, private keys — rotate first, then clean.
- high: connection strings, generic credential assignments, root escapes.
- medium: entropy advisories (confirm before acting), config drift.
- low: hygiene markers, large context files, near-duplicates.
