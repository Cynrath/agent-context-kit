# CLI Reference

Global options (every command): `--root <path>` · `--config <path>` ·
`--json` · `--quiet` · `--no-color` · `--verbose` · `--debug` · `--strict`.
Exit codes: see `docs/reference/exit-codes.md`.

| Command | Purpose |
|---|---|
| `ackit` | deterministic quick health summary; `--json` pure stdout |
| `ackit init [--agents all\|list] [--dry-run]` | instruction shims + builtin skills plan/write |
| `ackit scan [options]` | security/hygiene scan |
| `ackit optimize [--fix] [--dry-run]` | hygiene advisor; fix fenced to managed surfaces |
| `ackit pack [--max-tokens n] [--format md\|json] [--include globs] [--changed]` | budgeted context pack |
| `ackit instructions [--provider id] [--for path]` | instruction graph tree/JSON + effective chain |
| `ackit skills list\|validate\|install [--force]` | open-standard skills management |
| `ackit task create <title> [--depends-on ids] \| list \| start \| complete [--force] \| archive \| doctor` | docs-first tasks |
| `ackit policy check` | resolve effective offline policy (chain+digest) |
| `ackit config check` | validate `ackit.yml` |
| `ackit cache clean` | remove ONLY `.ackit/cache` |
| `ackit workspaces` | detect monorepo layout |
| `ackit hooks install\|uninstall\|status` | managed pre-commit block |
| `ackit report serve <file> [--host] [--port] [--allow-nonlocal]` | loopback report UI |
| `ackit mcp serve` | MCP server over stdio (official SDK) |

## scan options

```
--ci                    gate mode (exit 1 at/over threshold or vs baseline)
--format fmt            terminal|json|sarif|markdown|html
--output file           write report instead of stdout
--changed --staged      git incremental candidate sets
--since ref --range a..b  commit-range sets (merge-base)
--baseline file         compare: fail on new findings
--write-baseline file   persist structural baseline (no evidence stored)
--watch                 re-scan on changes until Ctrl+C
```

Machine-readable stdout is always pure JSON in the respective modes;
diagnostics go to stderr.
