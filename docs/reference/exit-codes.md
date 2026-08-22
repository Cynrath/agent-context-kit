# Exit Codes

Frozen taxonomy for every `ackit` command (ADR-0007):

| Code | Meaning |
|---|---|
| `0` | success / threshold passed |
| `1` | findings exceeded the configured CI threshold (or new findings vs baseline) |
| `2` | invalid CLI usage or invalid config/policy |
| `3` | environment/repository error (e.g., root unresolvable) |
| `4` | security boundary violation blocked (root escape, overwrite refusal, ownership conflict, non-loopback bind) |
| `5` | internal unexpected failure |

Notes:

- Report-only commands (scan without `--ci`) exit 0 even with findings.
- `task doctor` uses 1 to surface integrity problems; gate failures inside
  `task complete` are usage errors (2) unless overridden with `--force`,
  which still prints a warning banner and records it in JSON output.
- Machine-readable stdout stays pure in JSON/SARIF modes; diagnostics are
  stderr-only with sanitized text.
