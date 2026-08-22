# Getting Started

## Requirements

- Node.js **>= 22** (LTS lines 22 and 24 are CI-tested)
- Optional: git for incremental/baseline features

## Install

The package is **not published yet** (rebuild in progress; publishing is a
separate authorization). Until then, from a checkout:

```bash
pnpm install --frozen-lockfile
pnpm build
node dist/cli/index.js --version
```

After the first authorized publish: `npx @cynrath/agent-context-kit --help`.

## 30-second tour (verified commands)

```bash
ackit init --dry-run          # plan instruction shims + builtin skills
ackit skills install          # install the four built-in skills
ackit scan                    # security/hygiene scan (report only)
ackit scan --ci               # gate mode: exit 1 at/over threshold
ackit instructions            # print the resolved instruction graph
ackit pack --max-tokens 50000 # budgeted context pack
ackit task "first task"       # docs-first task with tool-allocated id
```

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
```

Validate anytime: `ackit config check`. Full reference:
`docs/reference/config.md`.
