# OpenAI Build Week 2026 — ACKit Optimize

## Status and release boundary

ACKit Optimize is new OpenAI Build Week 2026 work in the current `master` source tree. It was not present in the published `AgentContextKit` `1.0.0-rc.1` package. The RC1 package, `v1.0.0-rc.1` tag, GitHub prerelease, nupkg/snupkg assets, two attestations, and historical release evidence remain immutable.

This document describes verified source behavior, not a new package publication, `1.0.0` GA release, deployment, or promise that every instruction-quality question can be decided automatically.

## What existed before Build Week

The exact pre-feature baseline is commit [`6998e269af4962bbe70a9cb4044727d25dc1a06d`](https://github.com/Cynrath/agent-context-kit/commit/6998e269af4962bbe70a9cb4044727d25dc1a06d), dated 2026-07-18. At that commit AgentContextKit already provided:

- an offline-first .NET 10 CLI and global-tool package;
- repository scanning, stable `ACKIT` risk rules, doctor checks, config diagnostics, and baseline-aware CI;
- task-first/ACKit-first workflow records and agent-file generation;
- JSON schema v2, scanner SARIF 2.1.0, offline HTML/Web UI, prompt-pack, and context-export artifacts;
- English/Turkish CLI localization;
- safe repository-relative, skip-existing generated-file conventions; and
- the complete immutable `v1.0.0-rc.1` prerelease evidence.

The baseline did not contain an `ackit optimize` help entry, instruction discovery/scope model, `ACKITOPT` rules, instruction context estimates, Optimize reports, proposal generator, or Optimize demo. Baseline validation was 431 tests passed, 0 failed, 0 skipped; Release build had 0 warnings/errors; doctor passed 13/13; scan/scan-CI exited 0 with no High/Critical finding.

## What was newly built during Build Week

1. Instruction discovery for root and nested `AGENTS.md`, root Claude/Anthropic instructions, Copilot/Cursor/Continue surfaces, and the repository workflow/development-standard files already supported by AgentContextKit.
2. Deterministic directory scope, inheritance, precedence, applicability, valid nested override, shadowing, and ambiguity analysis.
3. Conservative Markdown/Continue JSON parsing with original text, normalized/core representations, source type/path/scope, line ranges, polarity, command fragments, and repository references.
4. Stable `ACKITOPT001`–`ACKITOPT015` findings for exact/near duplication, contradictions, platform/package/build-test conflict, unverifiable/vague/stale/broad/shadowed/boilerplate rules, unsafe automatic actions, safety-boundary conflict, and ambiguous precedence.
5. Deterministic characters/words/lines/estimated-token metrics. The documented token method is `ceiling(normalized UTF-16 characters / 4)`; it is a context-size estimate, not tokenizer output or model billing.
6. A first-class `ackit optimize` CLI with console, JSON, Markdown, SARIF 2.1.0, and self-contained offline HTML output; repeatable include/exclude filters; localized human output; stable ordering; and explicit CI exit semantics.
7. An optional `--proposal <repo-relative.md>` artifact that never rewrites instruction sources. It uses atomic create-new behavior, rejects path escapes/instruction targets/symbolic-link traversal, consolidates only safe duplicates, maps removals to source lines, preserves valid overrides and mandatory constraints, and leaves conflicts/unsafe actions for human decision. No apply mode exists.
8. A public-safe synthetic demo plus deterministic fixtures, schema/golden/live-output tests, mutation/hash guards, sanitization checks, cross-platform source-package smoke, and recurring sample smoke.

## Commit boundary and ledger

The pre-feature baseline is exclusive. The exact implementation range currently verified is:

```text
6998e269af4962bbe70a9cb4044727d25dc1a06d..7bf37cb83de64c7950e0bd27336fbc26758eb56a
```

That range contains 70 changed paths and these focused commits:

| Commit | Task | Verified purpose |
| --- | --- | --- |
| [`a227c04531ed085ef08d6ee722d904011d21401c`](https://github.com/Cynrath/agent-context-kit/commit/a227c04531ed085ef08d6ee722d904011d21401c) | TASK-0258 | Baseline, authorization, task chain, acceptance criteria, and immutable-RC1 boundary before implementation |
| [`d49bd446b227b1b77038b50f2f704c483168af52`](https://github.com/Cynrath/agent-context-kit/commit/d49bd446b227b1b77038b50f2f704c483168af52) | TASK-0259 | Core discovery, scope, normalization, metrics, 15-rule catalog, deterministic findings, fixtures, and focused tests |
| [`c79932af3271038e00a37270c50a6fb518e8db38`](https://github.com/Cynrath/agent-context-kit/commit/c79932af3271038e00a37270c50a6fb518e8db38) | TASK-0260 | CLI plus console/JSON/Markdown/SARIF/offline-HTML output, schemas/goldens, localization, exits, and source smoke |
| [`7bf37cb83de64c7950e0bd27336fbc26758eb56a`](https://github.com/Cynrath/agent-context-kit/commit/7bf37cb83de64c7950e0bd27336fbc26758eb56a) | TASK-0261 | Explicit non-destructive proposal, atomic/symlink-safe output, source mapping, demo fixture, docs, and regression coverage |

TASK-0262 adds the public Build Week narrative and final validation evidence after the implementation range. A Git commit cannot embed its own future SHA without changing that SHA; the exact TASK-0262 documentation commit is therefore recorded by the immediately following evidence-only commit and by the final completion report. This is an explicit audit constraint, not an omitted or rewritten history entry.

To reproduce the range without relying on rewritten history:

```powershell
git log --reverse --format='%H %s' 6998e269af4962bbe70a9cb4044727d25dc1a06d..7bf37cb83de64c7950e0bd27336fbc26758eb56a
git diff --stat 6998e269af4962bbe70a9cb4044727d25dc1a06d..7bf37cb83de64c7950e0bd27336fbc26758eb56a
```

## How Codex and GPT-5.6 were used

OpenAI Codex with GPT-5.6 was used as the engineering assistant for repository inspection, task decomposition, implementation drafts, focused regression tests, documentation drafting, local command execution, failure diagnosis, and read-only GitHub Actions monitoring. It worked through the same public repository files, ACKit task records, compiler, tests, scripts, and Git history that a maintainer can review.

GPT-5.6 is not part of the `ackit optimize` runtime path. The shipped source does not call OpenAI or another model, does not require an API key, and does not use model output to assign findings or rewrite files. Runtime discovery, normalization, ordering, IDs, metrics, findings, formats, and proposals are deterministic local C# behavior.

Human-controlled decisions remained explicit:

- the project goal, required capabilities, acceptance criteria, and permission to create focused commits/pushes;
- repository safety, privacy, compatibility, release immutability, and no-network boundaries;
- which conflicts or scoped overrides are semantically intentional;
- whether any proposed consolidation should ever be copied into an owning instruction file;
- release/version/tag/package/deployment decisions and credentials; and
- final claim review and any future publication decision.

Codex/GPT-5.6 did not publish NuGet, create or move a tag, alter a GitHub Release/asset/attestation, dispatch/rerun a workflow, change settings/secrets, deploy, or make a `1.0.0` GA decision.

## Build and test from source

Requirements: Git plus the repository-pinned .NET 10 SDK. The published RC1 install cannot demonstrate Optimize because it predates the feature.

```powershell
git clone https://github.com/Cynrath/agent-context-kit.git
Set-Location agent-context-kit
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help
```

No remote service is required after source/package acquisition. `README.nuget.md` and package metadata were intentionally not changed: no future package version was selected or authorized.

## Three-minute demo

Run from the repository root:

```powershell
Push-Location samples/ackit-optimize-demo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --json
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --format sarif --output .ackit/reports/instructions.sarif
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --format html --output .ackit/reports/instructions.html --proposal .ackit/reports/optimized-instructions.md
Get-Content .ackit/reports/instructions.sarif | ConvertFrom-Json | Select-Object version
Get-Content .ackit/reports/optimized-instructions.md -TotalCount 45
Pop-Location
```

Expected deterministic demo evidence:

- 4 sources, 16 parsed rules, 4 resolved scopes, 1 valid nested override, and 10 findings;
- finding distribution: two `ACKITOPT001`, one `ACKITOPT002`, two `ACKITOPT007`, and one each of `ACKITOPT008`, `ACKITOPT009`, `ACKITOPT012`, `ACKITOPT013`, and `ACKITOPT014`;
- whole instruction surface: 1,080 characters, 142 words, 39 lines, and 270 estimated tokens;
- proposal rule bodies: 192 estimated tokens before, 156 after, 36 avoided; 13 retained rules, 2 consolidation groups, and 2 unresolved safety decisions;
- the npm-to-pnpm nested rule is preserved as a valid scoped override; and
- reruns skip existing artifacts while all four instruction-source SHA-256 hashes remain unchanged.

Generated `.ackit/` reports are local/ignored review artifacts. Do not commit them.

## Verification evidence

Every implementation commit was normally pushed only after local validation; all three push-triggered workflows completed successfully for each exact SHA.

| Commit | CI | Published-package smoke | Current-source smoke |
| --- | --- | --- | --- |
| `a227c045` | [29648931050](https://github.com/Cynrath/agent-context-kit/actions/runs/29648931050) | [29648931085](https://github.com/Cynrath/agent-context-kit/actions/runs/29648931085) | [29648931149](https://github.com/Cynrath/agent-context-kit/actions/runs/29648931149) |
| `d49bd446` | [29650061884](https://github.com/Cynrath/agent-context-kit/actions/runs/29650061884) | [29650061875](https://github.com/Cynrath/agent-context-kit/actions/runs/29650061875) | [29650061881](https://github.com/Cynrath/agent-context-kit/actions/runs/29650061881) |
| `c79932af` | [29651733106](https://github.com/Cynrath/agent-context-kit/actions/runs/29651733106) | [29651733087](https://github.com/Cynrath/agent-context-kit/actions/runs/29651733087) | [29651733085](https://github.com/Cynrath/agent-context-kit/actions/runs/29651733085) |
| `7bf37cb8` | [29653163763](https://github.com/Cynrath/agent-context-kit/actions/runs/29653163763) | [29653163773](https://github.com/Cynrath/agent-context-kit/actions/runs/29653163773) | [29653163760](https://github.com/Cynrath/agent-context-kit/actions/runs/29653163760) |

Latest verified local implementation totals before the documentation-only closure:

- Release build: 0 warnings, 0 errors;
- full tests: 463 passed, 0 failed, 0 skipped;
- focused Optimize Core/report/proposal/demo/CLI tests: 31 passed, 0 failed, 0 skipped;
- installed and current-source doctor: 13/13 passed;
- installed/current-source `scan --ci`: exit 0 with no new Build Week risk finding;
- JSON and SARIF parsing, schema/golden/live outputs, CLI contract, EN/TR parity, 464-file Markdown/222-target link audit, package metadata, sample smoke, redaction/privacy review, diff, and tracked-artifact gates passed. Public-release redaction reports exactly five pre-existing Low local-path findings and therefore exits 1 by contract; no changed Build Week file adds one; and
- changed-file format verification passed. The optional repository-wide formatter still reports five pre-existing missing-final-newline diagnostics in untouched tests; they are not Build Week regressions.

## Known limitations

- Optimize is available from current source, not the immutable published `1.0.0-rc.1` package. No successor package/version is claimed.
- Markdown parsing is intentionally conservative; it does not attempt full natural-language theorem proving or infer unstated intent.
- Near-duplicate findings are heuristic. Proposal consolidation is stricter than finding generation and requires equal scope, polarity, normalized core, command/reference sets, and mandatory categories.
- Valid scoped overrides can still require human domain knowledge. Contradictions and unsafe automatic actions remain unresolved by design.
- Stale-reference findings require locally provable missing repository paths; ACKit does not declare external URLs, undocumented business rules, or semantic version guidance stale.
- Estimated tokens use the documented local `characters / 4` approximation and are not exact for GPT-5.6 or any other tokenizer/billing system.
- Proposal output is a review artifact, not an apply-ready source file. There is no `--apply` behavior.
- Optimize has no finding baseline mode. Default review exits 0; explicit `--ci` applies the documented High/Critical exit policy.
- Source discovery is limited to the supported instruction surfaces documented in the CLI reference; arbitrary prose is not scanned as agent instruction input.

## Immutable RC1 confirmation

The verified local and remote RC1 tag still resolves to `258918b33c3d1359aac967604ee524e8b66ddf02`. Read-only final validation also matched release ID `353913024`, exact asset IDs `476881883`/`476881892`, their recorded sizes and SHA-256 digests, and one existing repository attestation per digest. Build Week work changed only normal commits on `master`; it did not move/reuse/delete the tag, republish `1.0.0-rc.1`, change GitHub Release assets, alter attestations, or claim GA. See the immutable [GitHub prerelease](https://github.com/Cynrath/agent-context-kit/releases/tag/v1.0.0-rc.1) and the [NuGet package](https://www.nuget.org/packages/AgentContextKit/1.0.0-rc.1).
