# Copilot Instructions

Prefer minimal, tested, secure changes that follow the project docs and task files.

## Maintenance Note
This file is hand-maintained. `ackit generate` does not regenerate it. Update it through a regular `docs/tasks/` task and a normal commit, never through the generator.

## Governance
- Authoritative agent policy: `AGENTS.md` — controlled-release governance.
- Release actions (`master` push/merge, npm publish, tags, GitHub Releases) are user-authorized only; they require explicit authorization inside the active task. Always prohibited: force-push, history rewrite, tag movement/deletion, workflow dispatch, deployments.
- Normal fast-forward pushes to `rebuild/ackit-vnext` are allowed after local validation passes.

## Workflow
- Task-first workflow is mandatory. Every implementation change starts from a task record under `docs/tasks/active/`, created with `node dist/cli/index.js task "<title>"`.

## Commit Completeness Hard Rule
- Before any push, run `git status` and confirm the working tree is clean.
- Never leave a newly created `.md` task file, plan, queue row, or test file uncommitted. New files must be added and committed in the same logical commit that creates them, or in an immediately following commit, before any push.

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Stack & Validation
- Main stack: TypeScript (strict ESM) + Node.js >= 22, pnpm, Vitest, Biome.
- All vNext validation uses the repository-built CLI: `node dist/cli/index.js <command>`.
  The old global .NET `ackit` tool and `dotnet run` invocations are not valid vNext validation tools on this branch.

## Release Status
- Current line: AgentContextKit vNext, package `@cynrath/agent-context-kit`, version `0.1.0`.
- npm publish, tag creation, GitHub Releases, and other master mutations require explicit user authorization.
- Legacy .NET line is frozen and immutable: NuGet `AgentContextKit` `1.0.0-rc.1` (exact tag/release/assets/attestations at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`) and earlier prereleases remain untouchable; do not republish, reuse, move, replace, or delete them. Historical failed recovery evidence remains preserved.

## Recommended Checks
- `pnpm lint && pnpm format:check && pnpm typecheck`
- `pnpm build && pnpm test && pnpm smoke:cli`
- `pnpm run smoke:package`
- `node dist/cli/index.js doctor`
- `node dist/cli/index.js scan --ci`

## Commit Hygiene
- Conventional Commits scoped to the real diff; no model name, generator, or AI authorship in commit messages.
- Never commit generated `.ackit/`, SARIF, HTML, prompt pack, context export, `dist/`, `node_modules/`, coverage, or temp artifacts.
