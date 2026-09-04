# Severity playbook

- critical: credential/token exposure, private keys (`ACKIT001`, `ACKIT002`) — rotate first, then clean.
- high: connection strings, generic credential assignments, root escapes (`ACKIT003`, `ACKIT004`, instruction-graph escapes) — fix next.
- medium: entropy advisories (confirm before acting), config drift, path leaks (`ACKIT005`, `ACKIT010`, `ACKIT050`, `ACKIT070`, `ACKIT080`).
- low: hygiene markers, large context files, near-duplicates (`ACKIT020`, `ACKIT040`); every applied bypass emits `ACKIT099` (low/hygiene, not suppressible).

Inline suppression is `# ackit-ignore:ACKITnnn <reason>` on the finding line
or the line above (that line plus the next). File excludes come from config
`scan.exclude`; policy suppressions need `reason` and support `expiresAt`.
