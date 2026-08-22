# Monorepo Guide

`ackit workspaces` detects the workspace layout (REQ-MONO-001) with zero extra
dependencies:

1. `pnpm-workspace.yaml` packages globs (highest precedence)
2. root `package.json` `"workspaces"` (npm/yarn style)
3. fallback: nested directories with their own `package.json` (depth ≤ 2)

`nx.json` / `turbo.json` presence is reported as an advisory label only —
task-graph execution stays out of scope.

## What workspaces change

- **Instructions stay path-scoped, not workspace-scoped.** A nested
  `packages/web/AGENTS.md` applies to files under `packages/web/` and to
  nothing else — even in a sibling workspace. This distinction is tested.
- **Policy layers target paths.** Root policy inherits everywhere; scope
  suppressions/overrides with `pathGlobs` such as `packages/web/**`.
- **Packs partition.** Per-workspace token budgets can be applied by running
  `ackit pack` with different `--max-tokens` per partition; output remains
  deterministic for identical inputs.

Example layout:

```
repo/
  pnpm-workspace.yaml      # packages: [packages/*]
  AGENTS.md                # applies everywhere
  packages/web/AGENTS.md   # applies under packages/web only
  apps/api/
```
