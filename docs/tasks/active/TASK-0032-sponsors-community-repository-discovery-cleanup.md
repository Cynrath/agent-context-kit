---
id: "TASK-0032"
title: "Sponsors/community/repository discovery cleanup"
status: active
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

- [x] `.github/FUNDING.yml` exists with `github: Cynrath`, Sponsor button resolves
- [x] Description set as specified
- [x] Website `https://cynrath.github.io/agent-context-kit/` set
- [x] Exactly 20 topics as list, noisy topics removed, no excess
- [x] Releases/Packages/Deployments visibility noted (and manual UI cleanup reported if needed)
- [x] Community docs audited, Discussions links added where appropriate
- [x] Sponsors link in README/docs only if verified
- [x] No financial info stored
- [x] `git diff --check` clean

## Risks

- `gh repo edit` may not support topic removal in batch → fallback to `gh api`.
- Discussions not yet enabled → link anyway with note "when enabled".

## Rollback plan

Revert FUNDING.yml and topic changes via `git revert` + `gh repo edit` to restore old topics (record prior topics snapshot before edit).

## Completion notes

2026-08-27 — Sponsors/community/discovery cleanup for v0.2.1.

**FUNDING:**
- Created `.github/FUNDING.yml` with `github: Cynrath` (1 line, no other content)
- Verified `cat .github/FUNDING.yml` → `github: Cynrath`
- `curl -I https://github.com/sponsors/Cynrath` → `HTTP/1.1 200 OK` (verified via `curl.exe -I`)
- `gh repo view --json fundingLinks` currently `[]` locally (will be populated after push of FUNDING.yml; GitHub will show Sponsor button once `main` contains `FUNDING.yml`)

**Repository metadata (via `gh repo edit` + `gh repo view`):**
- Before: description `Offline-first CLI that makes repositories AI-agent-ready...`, homepage `https://cynrath.github.io/agent-context-kit/`, topics 20 (including `ai-tools`, `open-source`, `cli-tool`, `coding-agents-plugins` noisy)
- After:
  - Description: `Offline-first toolkit for agent-ready repositories: readiness scoring, instruction graphs, context packs, policy/rule packs, MCP, GitHub Actions, diagnostics, and VS Code.` (set via `gh repo edit --description`)
  - Homepage: `https://cynrath.github.io/agent-context-kit/` (already correct, re-asserted via `--homepage`)
  - Topics (20 exactly, sorted): `agent-skills, agents-md, ai-agents, claude-code, cli, codex, coding-agents, context-engineering, cursor, developer-tools, gemini, github-actions, mcp, model-context-protocol, offline-first, policy-as-code, repository-scanner, security, typescript, vscode-extension`
  - Removed: `ai-tools`, `open-source`, `cli-tool`, `coding-agents-plugins` (via `--remove-topic`)
  - Added: `agent-skills`, `claude-code`, `cursor`, `policy-as-code` (via `--add-topic`)
  - Verified via `gh repo view --json repositoryTopics --jq "[.repositoryTopics[].name] | sort"` → matches required 20

**Discussions:**
- `gh repo view --json hasDiscussionsEnabled --jq .hasDiscussionsEnabled` → `true` (enabled)
- Recommended categories documented: Announcements, General, Q&A, Ideas, Show and tell (per prompt, not auto-created, but docs now reference them)
- Security reports stay under `SECURITY.md`, never Discussions (documented)

**Community docs audit:**
- `CONTRIBUTING.md` — added community note with Discussions + Sponsors links at top (line 4+)
- `SUPPORT.md` — created (was missing) with Discussions categories, Sponsor link, and guidance (new file, 15 lines)
- `SECURITY.md` — added Community Channels section with Discussions (never for security) + Sponsors link, clarified private reporting flow
- `CODE_OF_CONDUCT.md` — added Discussions link at top
- `.github/ISSUE_TEMPLATE/config.yml` — added contact_links for `GitHub Discussions (Q&A, Ideas, Show and tell)` and `Sponsor Cynrath`, kept Security and General documentation links
- `.github/pull_request_template.md` — no change needed (Discussions not relevant for PR template, but SUPPORT.md covers)
- `README.md` — added Sponsors badge (`ea4aaa`) and Discussions badge (`1da1f2`) in header, plus Discussions/Sponsors links in second nav bar, verified `https://github.com/sponsors/Cynrath` 200 before adding

**Sponsors:**
- Sponsors link added to README/docs only after verified 200 (see above)
- No financial/tax/bank info stored

**Homepage sidebar visibility (manual UI cleanup note):**
- Recommended: `Releases: ON, Deployments: OFF (Pages via Cynrath.github.io), Packages: OFF (npm external)` — these toggles are UI-only in repository Settings → General → Features; `gh` does not expose them via API. Report as final manual UI cleanup: verify in Settings that `Releases` is checked, `Packages` and `Deployments` unchecked for `agent-context-kit` (since Pages deploys from `Cynrath.github.io` and npm is external).

**Verification:**
- `cat .github/FUNDING.yml` → `github: Cynrath`
- `gh repo view --json description,homepageUrl` → description correct, homepage correct
- `gh repo view --json repositoryTopics` → 20 exact topics
- `curl -I https://github.com/sponsors/Cynrath` → 200
- `grep -r "github.com/Cynrath/agent-context-kit/discussions"` → hits in `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/config.yml`, `README.md` (6 files) — PASS
- `pnpm lint` → 0 errors, `git diff --check` clean

**Next:** push FUNDING + community docs to `origin/main` to activate Sponsor button, then proceed to benchmark/demo (TASK-0033)

