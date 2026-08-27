---
id: "TASK-0032"
title: "Sponsors/community/repository discovery cleanup"
status: pending
schemaVersion: 2
dependencies: ["TASK-0031"]
createdAt: "2026-08-27"
completedAt: null
---


## Purpose

Set Sponsors FUNDING, Discussions integration, community docs audit, and repository discovery metadata (exactly 20 topics, description, website) for v0.2.1.

## Context

- Sponsors active (github:Cynrath) but `.github/FUNDING.yml` missing.
- Discussions being enabled; need links in README/docs.
- Topics need exactly 20 as specified, removing noisy broad topics, setting description/website.
- Community docs (CONTRIBUTING, SUPPORT, SECURITY, CODE_OF_CONDUCT, issue/PR templates) may need Discussions links + freshness audit.

## Goal

- `.github/FUNDING.yml` with `github: Cynrath` exists and Sponsor button resolves.
- Description + 20 topics + website `https://cynrath.github.io/agent-context-kit/` set via `gh repo edit` where supported.
- Discussions links updated, categories documented, community docs audited.
- README/docs Sponsors link only if public URL resolves.

## In scope

- Create `.github/FUNDING.yml`:
  ```yaml
  github: Cynrath
  ```
- Verify Sponsor button via `gh api /repos/Cynrath/agent-context-kit` funding? Or manual check `https://github.com/sponsors/Cynrath` resolves (curl 200).
- Set repository description: `Offline-first toolkit for agent-ready repositories: readiness scoring, instruction graphs, context packs, policy/rule packs, MCP, GitHub Actions, diagnostics, and VS Code.`
- Set Website after docs deployment: `https://cynrath.github.io/agent-context-kit/` (TASK-0031 dependency).
- Set exactly 20 topics:
  `agents-md, agent-skills, ai-agents, claude-code, cli, codex, coding-agents, context-engineering, cursor, developer-tools, gemini, github-actions, mcp, model-context-protocol, offline-first, policy-as-code, repository-scanner, security, typescript, vscode-extension`
  Remove if present: `ai-tools, antigravity, claude, open-source, qwen, qwen-code, qwen-coder, coding-agents-plugins, cli-tool`
  Do not exceed 20.
- Use `gh repo edit Cynrath/agent-context-kit --description --homepage --add-topic/--remove-topic` where supported; record exact command output.
- Recommended sidebar: `Releases: ON, Deployments: OFF (Pages via Cynrath.github.io), Packages: OFF (npm external)` — if UI-only, report as manual cleanup.
- Discussions integration: once enabled, update community/docs links to Discussions page `https://github.com/Cynrath/agent-context-kit/discussions`, categories: Announcements, General, Q&A, Ideas, Show and tell. Security reports stay under SECURITY.md.
- Audit/update: `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md`, rule-pack/provider-profile contribution guides — add Discussions links appropriately, do not fabricate contributors.
- Add Sponsors link to README/docs only if public URL resolves.

## Out of scope

- Auto-posting generic filler Discussions post unless tooling supports clearly useful first post.
- Storing financial/tax/bank info.
- Fabricating community activity.

## Affected files

- `.github/FUNDING.yml` (new)
- `README.md` (Sponsors/Discussions link if verified)
- `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- `.github/ISSUE_TEMPLATE/*`, `.github/pull_request_template.md` (if exist)
- `docs/guides/*` (Discussions link patch)

## Technical design

- Create FUNDING.yml with 1 line.
- Run `gh repo view Cynrath/agent-context-kit --json repositoryTopics,description,homepage` before/after.
- Set topics: `gh repo edit Cynrath/agent-context-kit --add-topic agents-md --add-topic ...` (loop 20) then remove noisy. Or `gh api -X PUT /repos/Cynrath/agent-context-kit/topics -f names='["agents-md",...]'` if supported.
- Verify `gh repo view ... --json repositoryTopics | jq '.repositoryTopics[].name'` sorted equals expected 20.
- Verify Sponsor: `curl -I https://github.com/sponsors/Cynrath` 200.
- Update docs links: `grep -r "github.com/Cynrath/agent-context-kit/discussions"` to place.

## Security

- Never store secrets; FUNDING only contains `github: Cynrath`.

## Tests

| Class | Command | Gate |
|---|---|---|
| file | `cat .github/FUNDING.yml` == `github: Cynrath` | PASS |
| api | `gh repo view --json repositoryTopics` == 20 expected | PASS |
| link | `curl -I https://github.com/sponsors/Cynrath` | 200 |
| docs | `grep -r Discussions` count | >0 |
| lint | `pnpm lint` | PASS |

## Acceptance criteria

- [ ] `.github/FUNDING.yml` exists with `github: Cynrath`, Sponsor button resolves
- [ ] Description set as specified
- [ ] Website `https://cynrath.github.io/agent-context-kit/` set
- [ ] Exactly 20 topics as list, noisy topics removed, no excess
- [ ] Releases/Packages/Deployments visibility noted (and manual UI cleanup reported if needed)
- [ ] Community docs audited, Discussions links added where appropriate
- [ ] Sponsors link in README/docs only if verified
- [ ] No financial info stored
- [ ] `git diff --check` clean

## Risks

- `gh repo edit` may not support topic removal in batch → fallback to `gh api`.
- Discussions not yet enabled → link anyway with note "when enabled".

## Rollback plan

Revert FUNDING.yml and topic changes via `git revert` + `gh repo edit` to restore old topics (record prior topics snapshot before edit).

## Completion notes

(placeholder) — include FUNDING content, gh repo view topics sorted, description/website check, Sponsors curl, docs audit list.
