# CLI Reference

Global options (every command): `--root <path>` · `--config <path>` ·
`--json` · `--quiet` · `--no-color` · `--verbose` · `--debug` · `--strict`.
Exit codes: see `docs/reference/exit-codes.md`.

| Command | Purpose |
|---|---|
| `ackit` | deterministic quick health summary; `--json` pure stdout |
| `ackit init [--agents all\|list] [--dry-run]` | instruction shims + builtin skills plan/write |
| `ackit sync [--dry-run] [--check] [--force]` | reconcile ACKit-owned managed assets (instructions + skills) after upgrades; content-driven, never version-driven (released in 0.4.0) |
| `ackit scan [options]` | security/hygiene scan |
| `ackit optimize [--fix] [--dry-run]` | hygiene advisor; fix fenced to managed surfaces |
| `ackit pack [--max-tokens n] [--format md\|json] [--include globs] [--changed] [--task id] [--resume]` | budgeted context pack; task-aware ranking + resume section |
| `ackit instructions [--provider id] [--for path]` | instruction graph tree/JSON + effective chain |
| `ackit skills list\|validate\|install\|sync\|doctor\|discover\|scaffold` | open-standard skills management |
| `ackit skills export --provider claude\|copilot\|generic --out <dir> [--force]` | provider projections of canonical skills |
| `ackit task create <title> [--depends-on ids] [--intent id] [--spec paths] [--decision paths] [--plan path]` | docs-first tasks with artifact references |
| `ackit task list\|start\|complete [--force]\|archive\|doctor\|show` | task lifecycle (completion gate: evidence, verdict, stage, drift for workflow tasks) |
| `ackit task resume <id>` | print the deterministic resume context of the latest checkpoint |
| `ackit workflow set <id> [--profile quick\|standard\|high-risk]` | explicit workflow profile selection (defaults to configured `workflow.defaultProfile`) |
| `ackit workflow show [id]` \| `advance <id> [--to stage]` \| `verify <id> --outcome pass\|fail` | stage machine + verify/fix-loop state |
| `ackit intent new <title> \| list \| show <id> \| validate [id] \| fingerprint <id>` | intent artifacts (`docs/intent/`) |
| `ackit checkpoint create <id> --next-objective text [--next-path p] [--next-command c] [--next-expected e]` | record a checkpoint with the exact next action |
| `ackit checkpoint show <id> [cpId] \| validate <id> \| export <id> [--out file]` | checkpoint inspection, staleness validation, handoff pack |
| `ackit evidence sync <id> \| show <id> \| verify <id> --criterion AC-n --type t --ref text \| validate <id>` | evidence contract (criteria linked to typed proof) |
| `ackit verification bundle <id> [--out file] [--diff] [--format md\|json]` | deterministic bundle for a fresh independent verifier |
| `ackit verification record <id> --verdict <file> \| show <id>` | append-only verdict registration + inspection |
| `ackit drift check <id> [--ci]` \| `drift check-active [--ci]` | deterministic workflow drift findings; gate the active workflow task |
| `ackit role list \| show <role> \| validate` | portable role contracts (`ackit.role.v1`) |
| `ackit journal show [--limit n] [--task id] \| validate` | local sanitized execution journal |
| `ackit policy check` | resolve effective offline policy (chain+digest+autonomy+review) |
| `ackit config check` | validate `ackit.yml` |
| `ackit cache clean` | remove ONLY `.ackit/cache` |
| `ackit workspaces` | detect monorepo layout |
| `ackit hooks install\|uninstall\|status` | managed pre-commit block (scan + active-task drift gate) |
| `ackit report serve <file> [--host] [--port] [--allow-nonlocal]` | loopback report UI |
| `ackit mcp serve` | MCP server over stdio (official SDK; read-only tools) |

## sync options (released in 0.4.0)

```
--dry-run   preview the reconciliation plan without writing (would-* statuses)
--check     read-only CI gate: exit 1 when anything is out-of-sync or blocked
--force     discard local edits on OWNED skills (third-party names still refused)
```

Sync reconciles only ACKit-owned managed assets: the `AGENTS.md` managed
block, the `CLAUDE.md` / `GEMINI.md` / `.github/copilot-instructions.md`
shims, and builtin skills. Write decisions are content-driven — upgrading
the npm package alone never rewrites files. Statuses: `up-to-date`,
`would-create`, `would-update-managed`, `updated-managed`, `installed`,
`updated`, `conflict-user-modified`, `refused-non-managed`,
`refused-third-party`.

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
