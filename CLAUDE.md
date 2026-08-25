# Claude Project Context

Use the same repository rules as `AGENTS.md` (authoritative for all agents).

## Dogfood / ACKit-First
This repository IS AgentContextKit. Every agent session must dogfood the tool.

- Before ANY task: run `node dist/cli/index.js --version`,
  `node dist/cli/index.js doctor`, `node dist/cli/index.js scan --ci`.
- Create new task docs with `node dist/cli/index.js task "<title>"` first, then
  fill/refine the generated Markdown.
- Do not create task docs manually unless the CLI fails. If it fails, record the exact failure.
- All vNext validation uses the repository-built CLI: `node dist/cli/index.js <command>`.
  The old global .NET `ackit` tool and any `dotnet run` invocation are not valid
  vNext validation tools on this branch.
- Run `node dist/cli/index.js doctor` and `node dist/cli/index.js scan --ci` before every final commit.
- Never commit generated `.ackit/`, reports, SARIF, prompt packs, context exports, package artifacts, packed tarballs, or temp outputs.
- Preserve the task-first workflow, legacy-release immutability, and no-network/default safety rules.

## Workflow
- Task-first: every implementation change starts from `docs/tasks/active/`.
- Continuous progress: do not stop between documented tasks; proceed through them in order.

## Commit Completeness Hard Rule
- Before any push, run `git status` and confirm the working tree is clean.
- Never leave a newly created `.md` task file, plan, queue row, or test file uncommitted. New files must be added and committed in the same logical commit that creates them, or in an immediately following commit, before any push.

## Stack
- TypeScript (strict ESM) + Node.js >= 22
- pnpm (`packageManager` pinned), Vitest, Biome
- GitHub Actions: `.github/workflows/ci.yml`

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes

## Release Status
- Current line: AgentContextKit vNext, package `@cynrath/agent-context-kit`, version `0.1.0`; development happens on `master` and PR branches running the same CI gate.
- npm publish, tags, and GitHub Releases are user-authorized actions only (see Controlled-release governance in `AGENTS.md`).
- Legacy .NET line is frozen and immutable: NuGet `AgentContextKit` `1.0.0-rc.1` (exact tag/release/assets/attestations at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`) and earlier prereleases remain untouchable; do not republish, reuse, move, replace, or delete them. Historical failed recovery evidence remains preserved.

## Risk Summary
- No risk findings in the latest local scan.
- Legacy .NET releases stay immutable; see Release Status above.

## Recommended Checks
- `pnpm lint && pnpm format:check && pnpm typecheck`
- `pnpm build && pnpm test && pnpm smoke:cli`
- `pnpm run smoke:package`
- `node dist/cli/index.js doctor`
- `node dist/cli/index.js scan --ci`

## Commit And Push Policy
- Follow `AGENTS.md` for the full commit and push policy. Always-prohibited actions (force-push, history rewrite, tag movement/deletion, workflow dispatch, deployments) remain in force; master/publish/tag/release require explicit per-task user authorization.
- Normal fast-forward pushes to `rebuild/ackit-vnext` are allowed after local validation passes and the working tree is clean.
- Do not include model name, generator, or AI authorship in commit messages.
