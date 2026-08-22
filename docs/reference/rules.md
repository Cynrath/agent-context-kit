# Rules Reference

Rule ids use the stable `ACKIT<NNN>` namespace (ADR-0009). Semantic changes
to an existing id follow finding-schema versioning; the catalog snapshot test
gates renames.

## Built-in rules

| ID | Severity | Category | Detects |
|---|---|---|---|
| ACKIT001 | critical | secrets | token shapes: AWS AKIA/ASIA, ghp_, github_pat_, sk-, xoxb-, glpat-, AIza |
| ACKIT002 | critical | secrets | private key blocks (`BEGIN … PRIVATE KEY`) |
| ACKIT003 | high | secrets | credential-style assignments with literal values |
| ACKIT004 | high | secrets | connection strings with inline credentials |
| ACKIT005 | medium | secrets | high-entropy quoted literals (advisory confidence) |
| ACKIT010 | medium | absolute-path-leak | Windows/POSIX/macOS home-path leakage in tracked text |
| ACKIT020 | low | hygiene | TODO/FIXME/HACK markers |
| ACKIT040 | low | large-context-file | markdown > 8000 estimated tokens |
| ACKIT050 | high | config-problem | `ackit.yml` schemaVersion missing/unsupported |
| ACKIT070 | medium | ci-release-hygiene | workflow `uses:` pinned to mutable refs |
| ACKIT080 | medium | dependency-advisory | floating dependency specs (`latest`, git/#ref) |
| ACKIT099 | low | hygiene | suppression-bypass advisory (auto-emitted; not suppressible) |

Instruction-graph analysis adds ACKIT300–314 (conflicts, duplicates, stale
refs, unreachable globs, hidden unicode, external refs, massive data,
credential-shaped literals, root escapes).

## Suppression

Inline marker on the finding's line or the line above:

```
# ackit-ignore:ACKIT003 reviewed: vendor sample, rotated upstream
app_password = redacted-sample-value
```

Suppressed findings keep `suppressed: true` + reason AND emit a visible
ACKIT099 advisory that cannot itself be suppressed. File-level excludes come
from config `scan.exclude`; policy-level suppressions require a reason and
support expiry (see policy docs).

Deterministic ordering everywhere: relativePath → ruleId → line → column.
