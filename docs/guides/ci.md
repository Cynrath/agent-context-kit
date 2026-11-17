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

## GitHub Action distribution

The Action keeps `command`, `args`, `fail-threshold`, `upload-sarif` and the
`findings-json` / `sarif-path` outputs. Pin a published tag or full commit SHA.
It sets up Node 24 and the exact pnpm version from its own `package.json`, then
installs the frozen lockfile and builds in the Action checkout. Setup requires
registry access; the resulting CLI execution is offline and scans the consumer's
working directory. Consumer dependencies and scripts are never installed or run.

`fail-threshold` is inclusive (`low|medium|high|critical`), ignores explicitly
policy-suppressed findings, and cannot clear a nonzero CLI exit code. SARIF is
generated only when requested and is not uploaded automatically. Consumers need
`contents: read`; SARIF upload is a separate opt-in step with its own permissions.
Use the Action outputs to locate generated files rather than guessing paths.

`pnpm run smoke:action` exports clean source into a separate Action checkout,
installs/builds it and scans an unrelated Git fixture without consumer runtime
files. `pnpm run smoke:action --ref vX.Y.Z` repeats the check from a release tag.
ADR-0034 records the source distribution decision; generated `dist` is untracked.

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
