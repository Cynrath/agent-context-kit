# PROJECT-CONTROL-0108 Vibe-Feature Local Product Continuation

## Purpose
Continue independent local product, code-quality, test, documentation, and security work after PROJECT-CONTROL-0107, using a strict docs-first plan-then-execute flow. The plan, the task files, and the queue/handoff updates are committed and pushed first; the actual implementation follows in TASK-0168 through TASK-0176. Tier 1 features (Anthropic/Continue generate targets, safe `ackit hooks`) ship first; Tier 2 features (baseline diff CLI, deterministic trim, watch mode, entropy guard) are designed and either implemented conservatively or queued separately; MCP stdio is design-only.

## Current State
- `master` is at `148e730eef692a40209334fbd91af5b226c01b87` and aligned with `origin/master`.
- 257/257 local tests are green; `ackit scan --ci` and `ackit doctor` are clean.
- Standard 3/3 hosted jobs (ci, cross-platform-smoke, cross-platform-source-smoke) are green for the current HEAD.
- `0.2.0-alpha.3` remains NO-GO because `RB-003` (independent backup security owner) and `RB-008` (destructive NuGet recovery authority) remain unresolved.
- TASK-0159 through TASK-0167 are complete; 257/257 is the current verified local test count.
- Installed global tool: `AgentContextKit 0.2.0-alpha.2`.
- Current `ackit generate` targets: `codex`, `claude`, `cursor`, `copilot`, `all`.

## Scope
- Audit the post-0107 state and sync the active queue, NEXT_TASKS, handoff docs, and CHANGELOG (TASK-0168).
- Add additive `generate --target Anthropic` and `generate --target continue` targets with skip-existing semantics, offline-only, no network, JSON schema preserved (TASK-0169).
- Add safe local-only `ackit hooks` command with dry-run default and explicit `--install` to write `.git/hooks/pre-commit` and `pre-push` (TASK-0170).
- Add read-only `ackit diff` to compare two baseline snapshots (added/removed/unchanged/escalated/reduced) (TASK-0171).
- Add deterministic `ackit trim` with `--max-chars` and optional output path (TASK-0172).
- Design and optionally implement local `ackit watch` with debounce and filter for `.git/`, `.ackit/`, `bin/`, `obj/`, and generated artifacts (TASK-0173).
- Research and possibly add a conservative high-entropy string scanner rule with synthetic fixtures only (TASK-0174).
- Design-only `ackit mcp --stdio` for a future local-only MCP server, no dependency, no network (TASK-0175).
- Run the full local validation suite plus hosted 3/3 at the end (TASK-0176).

## Out Of Scope
- Source/package version metadata change to `0.2.0-alpha.3` or any other value.
- Tag, GitHub Release, NuGet publish, or any package mutation.
- Force push, history rewrite, tag movement, immutable version reuse.
- Closing `RB-003` or `RB-008` without explicit maintainer-provided evidence.
- API-key publication, secret exposure, or fabricated owner/identity evidence.
- Commit message model-name or AI-generator disclosure.
- Adding a tokenizer dependency for `ackit trim`; `--max-chars` is the contract.
- Implementing a real MCP stdio server this cycle; design-only.
- Broad noisy entropy detection; only conservative thresholds and synthetic fixtures.

## Affected Files
- `docs/tasks/PROJECT-CONTROL-0108-vibe-feature-local-product-continuation.md` (this file).
- `docs/tasks/TASK-0168-...md` through `TASK-0176-...md`.
- `docs/PROJECT_EXECUTION_QUEUE.md`, `docs/NEXT_TASKS.md`, `docs/ROADMAP.md`.
- `.codex/NEXT_STEPS.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`.
- Source code, tests, scripts, and workflows touched by TASK-0169 through TASK-0175.
- `CHANGELOG.md`.
- `docs/CLI_REFERENCE.md`, `docs/GENERATED_FILES.md`, `docs/AI_WORKFLOW.md`, `docs/GIT_HOOKS.md`, `docs/BASELINE.md`, `docs/BASELINE_MODEL.md`, `docs/JSON_OUTPUT.md`, `docs/PROMPT_PACK.md`, `docs/CONTEXT_EXPORT.md`, `docs/WATCH_MODE.md`, `docs/SCANNER_RULES.md`, `docs/SARIF_OUTPUT.md`, `docs/SECURITY_MODEL.md`, `docs/MCP_STDIO_DESIGN.md`, `docs/INTEROPERABILITY_DESIGN.md`, `docs/DEVELOPMENT_STANDARD.md`, `docs/NO_NETWORK_DEFAULT_POLICY.md`.
- `README.md`, `README.tr.md`.

## Implementation
1. Create every TASK-0168+ task file before implementation.
2. Commit and push the docs-only planning commit first.
3. Execute TASK-0168 (post-0107 audit and state sync).
4. Execute TASK-0169 through TASK-0175 in order, each with focused validation, logical commit, push, and hosted 3/3.
5. Execute TASK-0176 (final validation and hosted check sync).

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.
- Generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, and context export artifacts remain local-only and untracked.
- `ackit hooks` only writes repository-local files inside `.git/hooks/`, refuses to overwrite an existing hook, and requires explicit `--install`.
- `ackit diff` is read-only and never mutates input baselines.
- `ackit trim` is local-only, deterministic, and does not call any external tokenizer or LLM.
- `ackit watch` is local-only, ignores `.git/`, `.ackit/`, `bin/`, `obj/`, and generated artifacts, and never opens a network connection.
- High-entropy scanner rule uses synthetic fixtures only and an explicit allowlist path.
- MCP stdio is design-only this cycle; no implementation, no dependency, no network.
- NuGet publication, if ever authorized, remains OIDC-only.

## Compatibility
- Keep CLI command surface, JSON schema `2`, config `1`, baseline `1`, SARIF `2.1.0`, package ID, and tool command name compatible with `0.2.0-alpha.2` unless a future explicitly approved task changes them.
- New `generate` targets are additive; existing targets keep current behavior.
- `ackit hooks`, `diff`, `trim`, and `watch` are new commands and do not change existing exit codes.
- `ackit hooks` does not modify existing hooks; it skips and reports when present.

## Database Impact
None.

## Admin Impact
None required from the agent.

## Permission Impact
Verification jobs remain read-only. Local Git pushes are normal `master` pushes only when the active control task explicitly authorizes them.

## SEO/I18n Impact
New user-facing CLI strings must be localized in English and Turkish via the existing `L("...")` mechanism.

## Audit/Security Impact
- Preserves the alpha.3 NO-GO and `RB-003`/`RB-008` blocker visibility.
- Strengthens scanner rule catalog with a new conservative entropy rule, behind tests and allowlist.
- Keeps CLI exit-code contract stable: `0` success, `1` CI findings, `2` invalid invocation, `3` scanner/internal error.
- Hooks and watch mode are local-only and never phone home.

## Acceptance Criteria
- TASK-0168 through TASK-0176 are each complete with focused validation.
- The full local validation suite is green with 257+/257+ tests passing.
- Pushed commits pass the standard 3/3 hosted jobs.
- `docs/PROJECT_EXECUTION_QUEUE.md` and `docs/NEXT_TASKS.md` agree on the active control and the 257/257 milestone.
- No release write is performed; no `RB-003`/`RB-008` is closed.
- Each new CLI command has skip-existing or safe-default behavior and a deterministic JSON output.

## Tests
- Task-specific focused tests plus the complete local contract, localization, performance, package, documentation, security, readiness, and release gate set.

## Validation
- Local gates, hosted 3/3, and any task-specific manual verification.

## Risks
- Stale evidence, over-claiming, accidental release write, deleted user changes, or weakened security rules.
- Premature closing of maintainer-gated blockers.
- Watch mode flakiness, entropy false positives, and tokenizer dependency creep.

## Rollback
- Revert ordinary commits; never rewrite published packages or move existing tags.

## Completion Evidence
Pending. Will be filled after the audit, validation, and any audit-driven fixes.

## Commit
- Logical, narrow commits per task; no generated `.ackit/` or `bin/`/`obj/` artifacts.

## Push
- Normal `master` pushes after validation.
