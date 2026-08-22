---
name: ackit-scan-and-fix
description: Run ACKit scan, interpret findings by severity, and apply safe fixes with suppression hygiene.
---

# Scan and Fix

Activate when the user asks to scan, audit, or clean up the repository.

## Steps

1. `ackit scan` (add `--ci` in CI contexts) and read findings grouped by severity.
2. Fix critical/high first: rotate exposed credentials out-of-band, remove keys,
   correct root-escape references.
3. Suppress false positives ONLY inline via `ackit-ignore:ACKITnnn` with a real
   reason; every bypass stays visible as an ACKIT099 advisory.
4. Re-scan and confirm exit code 0 or an explicit accepted-risk list.

## Notes

- Unknown-extension files are always scanned; do not "fix" by renaming secrets away.
- Never weaken rules to make output green.
