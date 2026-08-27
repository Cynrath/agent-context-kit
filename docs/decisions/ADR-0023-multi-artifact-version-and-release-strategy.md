# ADR-0023: Multi-Artifact Version & Release Strategy

Status: Accepted · Date: 2026-08-27

## Context

The existing distribution is a single scoped npm package `@cynrath/agent-context-kit` (ADR-0013) with a controlled tag-triggered release workflow `.github/workflows/release.yml` (tags `v*.*.*`, OIDC Trusted Publishing, provenance, registry+`npx` verification, GitHub Release only after success). Anything on `master` never publishes. v0.2.0 adds two more shippable artifacts that should be version-aligned: the VS Code extension `.vsix` and the GitHub Action (`action.yml` consumption pin). Their release must not complicate or weaken the npm release governance.

## Decision

1. **Version coupling: one logical release, three auditable artifacts**:
   - **Primary**: `npm` package `@cynrath/agent-context-kit@0.2.0` — source-of-truth version in `package.json`. `v0.2.0` tag points at the commit whose `package.json` version is `0.2.0`. This is the only artifact that uses `release.yml` Trusted Publishing. No `master` push ever runs this workflow (tags-only `on: push.tags: v*.*.*` unchanged).
   - **VS Code**: `extensions/vscode/package.json` `version: "0.2.0"` MUST equal the npm version (contract test asserts equality). It is built via `pnpm build && pnpm --filter vscode build && vsce package` and produces `ackit-0.2.0.vsix`. The VSIX is attached to the GitHub Release as a non-required asset (informational) and published to the Marketplace only via a **separate explicit authorization** (`vsce publish` requires a Personal Access Token never stored in repo; do not imply marketplace publish authority). CI validates `vsce ls` whitelist + size <2MB regardless of marketplace publish.
   - **GitHub Action**: `action.yml` version is the git tag `v0.2.0` (users pin `uses: Cynrath/agent-context-kit@v0.2.0` or a full SHA). Its `package.json` dependency on `@cynrath/agent-context-kit` is pinned exactly `0.2.0`. The action repo distribution is the same commit/tag — no separate tag.

2. **Release sequence (TASK-0024)**:
   ```
   1. master HEAD = 0.2.0 candidate, full gates green, npm 0.2.0 absent, tag v0.2.0 absent
   2. explicit user authorization recorded in TASK-0024 with exact SHA
   3. annotated tag v0.2.0 pushed → release.yml publishes npm + verifies + creates GitHub Release
   4. (separate step, optional) after GitHub Release is green, build VSIX and attach to release via gh release upload; Marketplace publish only after separate `marketplace: yes` authorization text.
   ```

3. **Verification per artifact**:
   - npm: `npm view @cynrath/agent-context-kit@0.2.0 version/dist.shasum/dist-tags`, integrity/shasum vs recorded `pnpm pack` (content-identical ignoring npm's `package.json` normalization: stripped `packageManager`/`prepack` per v0.1.1 precedent is benign), SLSA provenance present, `npx --yes @cynrath/agent-context-kit@0.2.0 --version` + `npx … --help` leak-free, tarball audit `npm pack --dry-run` whitelist + no secret.
   - VSIX: `vsce ls`, size, forbidden entries (no `node_modules`, no secrets, no absolute paths), activation smoke via `@vscode/test-electron` (Problems and "instructions for current file" UI).
   - Action: `actionlint` + `uses: ./` smoke on `scan` with low threshold → job summary artifact valid.

4. **Governance preservation**:
   - No long-lived npm token (`NPM_TOKEN`) in GitHub Secrets; Trusted Publishing (`id-token: write`) is the only publish path. Secrets scanning gate in `TASK-0022` checks for `NPM_TOKEN`/`NODE_AUTH_TOKEN`/`vsce PAT` patterns and fails if present.
   - Force-push, rebase, tag movement/deletion, `workflow_dispatch` publish path → always prohibited (unchanged). Tag `v0.2.0` is annotated and immutable once created; movement is never automated.

5. **Documentation**: `CHANGELOG.md` holds the real `[0.2.0] - 2026-09-xx` entry (Added/Changed/Fixed/Security per Keep a Changelog). GitHub Release notes are copied from that section verbatim, plus marketplace/VSIX note when applicable. `docs/guides/ci.md` and `docs/guides/vscode.md` document pinning recipes.

## Rationale

One tag triggers one deterministic npm publish with full provenance; VSIX and Action align by version string and audit, not by separate tags, minimizing coordination drift. Marketplace remains opt-in with distinct authorization because it requires external credentials and organizational approval.

## Alternatives considered

- Three independent tags (`npm-v0.2.0`, `vscode-v0.2.0`, `action-v0.2.0`): rejected — users would need to track drift; single tag is conventional and `release.yml` already handles it.
- Publishing VSIX automatically from `release.yml`: rejected — would need a VS Code PAT in GitHub Secrets, enlarging blast radius; kept separate.
- Bumping npm to 0.2.0 but Action to 2.0.0: rejected — version divergence breaks "install the release" mental model.

## Consequences

- New `extensions/vscode/package.json` version field exists solely to mirror npm; its release-verified state is VSIX audit + attachment, not a separate `npm publish`.
- `release.yml` is not changed to publish VSIX/Marketplace automatically; if a future decision wants that, a new ADR is required.
- Final gate TASK-0024 must check all three artifact audits before the user authorization question.

## Related requirements

REQ-V020-N-001..002, REQ-V020-GOV-009/010.

## References

- `.github/workflows/release.yml` (existing, tags-only, OIDC)
- `package.json` (source-of-truth version)
- `docs/v0.2.0/REQUIREMENTS.md` §15 (release readiness)
