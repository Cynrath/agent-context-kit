# Provider Surfaces and Projection Parity

Researched 2026-09-05 from official primary sources only (vendor docs and
vendor documentation repositories, fetched directly). Anything not stated
in official docs is marked UNSPECIFIED. Machine-readable source of truth:
`tests/fixtures/provider-capabilities.json` (pinned by
`tests/contract/provider-capabilities.test.ts`).

## Provider capability summary

| Surface | Always-on file(s) | Skills roots | Scoped syntax |
|---|---|---|---|
| Codex CLI | `AGENTS.md` (32KiB combined cap) | `.agents/skills` (+ `$HOME`, `/etc`) | nested `AGENTS.md` |
| Claude Code | `CLAUDE.md` (`AGENTS.md` NOT native) | `~/.claude/skills`, `.claude/skills` | `.claude/rules/*.md` (`paths:`) |
| Gemini CLI | `GEMINI.md` (any name via `context.fileName`) | `~/.gemini/skills`, `~/.agents/skills`, `.gemini/skills`, `.agents/skills` | JIT `GEMINI.md` discovery |
| Copilot Chat | `.github/copilot-instructions.md` + `AGENTS.md` | `.github/skills` | `.github/instructions/**/*.instructions.md` (`applyTo:`) |
| Copilot coding agent | `AGENTS.md` + `CLAUDE.md` + `GEMINI.md` (multi-native) | `.github/skills` | `applyTo:` + agent-ALL set |
| Copilot review | `AGENTS.md` only (+ repo toggle, HEAD sourcing) | `.github/skills` | `applyTo:` |
| VS Code agent mode | `copilot-instructions.md` + `AGENTS.md` + `CLAUDE.md` (settings-gated, unordered) | `.github`/`.claude`/`.agents/skills` + `~/.copilot`/`.claude`/`.agents/skills` | `applyTo:` + `paths:` |

Key modeled differences (D1–D10 in the fixture): per-provider canonical
filenames (one file never covers all CLIs); foreign-file reading (Claude
never native; Codex via fallback/import; Gemini via `context.fileName`;
VS Code + cloud agent multi-native); skills roots (one payload directory
never serves every provider); conflict resolution; scoped-syntax
dialects; precedence semantics (VS Code guarantees no order — conflicting
rules are unsafe there); review channels (Codex `## Code Review Rules`
vs Copilot review AGENTS-only + toggle + HEAD sourcing); size caps;
packaging; VS Code settings gates (repo files alone are insufficient —
see the `chat.useAgentsMdFile` / `useClaudeMdFile` / nested / locations /
review / commit / PR-description toggles in the fixture).

Explicit non-differences (do not model): instructions-as-context
(non-enforcement) everywhere; `SKILL.md` open-standard convergence
(author once, project to roots — hence no separate codex/gemini export
targets: identical bytes would be provider-count inflation, and roots
are caller-chosen via `--out`); shared frontmatter controls; the
two-tier shape; progressive disclosure.

## ACKit projection mapping

- Managed always-on set: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
  `.github/copilot-instructions.md` (covers every surface's primary
  file — D1).
- Skill export targets: `claude` (`SKILL.md`), `copilot`
  (`.instructions.md` with derived `applyTo:`), `generic` (skill sheet);
  Roots per target: `.claude/skills`, `.github/skills` (+
  `.github/instructions`), `.agents/skills` (D3 without count chasing).
- `instructions explain` is provider-aware (`--provider`, `--for`,
  `--explain` provenance); the instruction graph resolves the effective
  chain per provider.

## Projection parity statement (v0.5 snapshot)

All surfaces expose the same canonical workflow/evidence/verdict/status
snapshot; each surface was fixture-proven:

| Surface | Mechanism | Proof |
|---|---|---|
| CLI | `ackit status [id]` (human + `ackit.status.v1` JSON) | `tests/unit/status/`, `tests/integration/status/` |
| SDK | `buildStatusReport` / `renderStatusReport` + handoff + independence exports (allowlist-pinned) | `tests/contract/api-surface/`, `tests/contract/projection-parity.test.ts` (CLI ≡ SDK byte-equality) |
| MCP (read-only) | `ackit_status` (composed projection, no mutation surface) | `tests/contract/mcp/mcp-conformance.test.ts`, `tests/contract/projection-parity.test.ts` (MCP ≡ SDK) + read-only tool-name guard |
| GitHub Action | CLI passthrough (`command: status`, `drift` equally supported); description documents read-only surfaces | `tests/contract/projection-parity.test.ts` (spawns the committed bundle, asserts the snapshot in `findings-json`) |
| VS Code | Tasks view renders the SDK status snapshot (blockers + next actions); no write paths added | `tsc --noEmit`, esbuild bundle, extension CI job (host-run suite) |

Out of scope (deferred, not drift): MCP mutation/write control plane,
new provider integrations for breadth, large builtin-skill catalog —
each explicitly deferred for v0.5.0 per TASK-0083.
