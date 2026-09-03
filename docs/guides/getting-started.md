# Getting Started

## Requirements

- Node.js **>= 22** (LTS lines 22 and 24 are CI-tested)
- Optional: git for incremental/baseline features

## Install

From the npm registry (requires Node >= 22):

```bash
npm install --global @cynrath/agent-context-kit
ackit --version
```

One-shot usage: `npx --yes @cynrath/agent-context-kit@0.4.0 --help` (pinned to current `0.4.0`).

From a source checkout instead:

```bash
pnpm install --frozen-lockfile
pnpm build
node dist/cli/index.js --version  # 0.4.0
```

## 30-second tour (verified commands — v0.4.0)

```bash
ackit init --dry-run          # plan instruction shims + builtin skills
ackit sync --check            # CI gate: are ACKit-owned assets in sync?
ackit scan --ci               # gate mode: exit 1 at/over threshold (medium)
ackit readiness               # 0–100 scoring across 6 categories
ackit instructions --explain  # graph v2 with provenance
ackit optimize --explain      # 8-class advisor with waste estimates
ackit pack --profile codex --max-tokens 50000 # provider-aware pack
ackit diagnostics --json      # env/config/instructions/cache/policy/tasks
ackit dashboard --port 0 --open # localhost-only dashboard
ackit task "first task"       # docs-first task with tool-allocated id
```

Deeper references: `docs/concepts/readiness.md` · `docs/reference/readiness.md` · `docs/guides/ci.md` · `docs/guides/watch-dashboard.md` · `docs/guides/vscode.md` · `docs/reference/sdk.md`.

## Configuration

Optional `ackit.yml` at repository root — every section is optional:

```yaml
schemaVersion: 1
scan:
  severityThreshold: medium   # low|medium|high|critical
limits:
  maxFiles: 50000
context:
  maxTokens: 80000
policy:
  extends: []
  rulePacks: []               # declarative packs (local or node_modules)
readiness:
  weights: { instructions: 25, security: 25, contextEfficiency: 20, taskHygiene: 10, skills: 10, policy: 10 }
  strictThreshold: 80
profile: codex                # codex|claude|copilot|gemini|generic
profiles:
  extend: []                  # repo-relative custom profiles
```

Validate anytime: `ackit config check` (`ackit.yml OK — schemaVersion 1, digest …` still valid; `readiness`/`profile` additive). Full reference:
`docs/reference/config.md` · `docs/v0.2.0/config-v2-design.md`.
