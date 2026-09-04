# CI Guide

## Recommended pipeline (implemented in `.github/workflows/ci.yml`)

Matrix: **ubuntu + windows + macos × Node 22 + 24**.

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm lint
- run: pnpm format:check
- run: pnpm typecheck
- run: pnpm build
- run: pnpm test
```

TASK-0286 hardens this further (SHA-pinned actions, package smoke, self-scan,
MCP smoke).

## Using ACKit as a gate in your repo

```bash
ackit scan --ci                      # exit 1 at/over severityThreshold
ackit scan --changed --ci            # only working-tree changes
ackit scan --baseline ackit-baseline.json   # fail on NEW findings only
```

Write a baseline after triaging an existing backlog:

```bash
ackit scan --write-baseline ackit-baseline.json
```

Commit the baseline; it stores fingerprints/paths only — never evidence text,
so no secret can leak through it.

## Caching

Scan cache lives under `.ackit/cache` keyed by content hash + rule version +
config/policy digests. `ackit cache clean` removes ONLY that tree. Add
`.ackit/` to your `.gitignore`.

## Local branch-switch build hygiene

`dist/` is git-ignored and survives `git switch`. After switching branches
(especially between release lines, e.g. maintenance and development), run
`pnpm build` before using the repository-built CLI (`node dist/cli/index.js`)
so validation never runs one branch's source against another branch's stale
`dist/`.
