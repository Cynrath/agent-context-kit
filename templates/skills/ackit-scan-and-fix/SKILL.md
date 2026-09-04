---
name: ackit-scan-and-fix
description: Run ACKit scan, interpret findings by severity, and apply safe fixes with suppression hygiene.
---

# Scan and Fix

Activate when the user asks to scan, audit, or clean up the repository.

See [severity playbook](references/severity-playbook.md) for triage order.

## Steps

1. `ackit scan` (add `--ci` in CI contexts; `--format terminal|json|sarif|markdown|html`, `--baseline <file>` / `--write-baseline <file>`, `--changed` / `--staged` / `--since <ref>` / `--range <a..b>` for incremental sets) and read findings grouped by severity (`docs/reference/rules.md`).
2. Fix critical/high first: rotate exposed credentials out-of-band, remove keys, correct root-escape references. Values are never printed; do not paste findings into external services.
3. Suppress false positives ONLY inline with `# ackit-ignore:ACKITnnn <reason>` on the finding line or the line above (covers that line plus the next line); every applied bypass stays visible as a non-suppressible `ACKIT099` advisory. Policy-level suppressions require `reason` and support `expiresAt`; locked rules (`locked: true`) can never be weakened (`POL-LOCKED-CONFLICT`).
4. Re-scan (`ackit scan --ci`) and confirm exit 0 or an explicit accepted-risk list. Confirm offline policy with `ackit policy check` / `ackit config check` where thresholds or extends changed.

## Notes

- Unknown-extension files are always scanned; do not "fix" by renaming secrets away.
- Never weaken rules, thresholds, or baselines to make output green.
- Resolution is offline by construction; remote fetches never happen.
