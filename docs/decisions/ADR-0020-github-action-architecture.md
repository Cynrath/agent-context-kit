# ADR-0020: Official GitHub Action Architecture

Status: Accepted · Date: 2026-08-27

## Context

EPIC F must ship an official minimal GitHub Action. Ergonomics concept:

```yaml
- uses: Cynrath/agent-context-kit@v0.2.0
  with:
    command: scan
```

Decisions needed: composite vs Node vs Docker, bundled `dist` vs published npm, annotations/SARIF/job summary/artifact, fail thresholds, permissions, supply-chain safety, marketplace metadata, action tests, dogfood workflow, interaction with existing `.github/workflows/release.yml` (which publishes npm only on `v*.*.*` tags). Master pushes must never publish npm; tag-version coupling must be exact.

## Decision

1. **Action kind: Node (JavaScript) action** (not composite, not Docker):
   - `action.yml` has `runs.using: "node24"` (pin to Node 24, matching release workflow's Node 24), `main: "dist/action/index.js"` (checked-in or release-asset bundle). Composite would re-invoke `npx` per step and complicate annotations/inputs; Docker would require privileged runners. Node action is smallest, pin-friendly, and can call the toolkit as a library.

2. **Distribution: invoke the published npm package by default** with a **bundled fallback**:
   - Primary path: action's `dist/action/index.js` `require("@cynrath/agent-context-kit")` is resolved by running `npm ci --production` inside the action's `node_modules` at build time — the action's `package.json` pins `@cynrath/agent-context-kit` exactly `0.2.0` (no caret). This way the action is self-contained (no `npx` network at runtime) and supply-chain auditable.
   - Alternative rejected: always `npx --yes @cynrath/agent-context-kit@0.2.0` at runtime — would require network per job and weaken deterministic digest pinning. Bundled `dist` inside the action repo (committed `dist/action/` + `action.yml` `main`) is allowed as long as it is reproducible from `pnpm build` and `actionlint`/`npm pack` white-lists it.

3. **Inputs/Outputs**:
   ```yaml
   inputs:
     command: { description: "ackit subcommand (scan|doctor|optimize|pack|instructions|policy)", default: "scan", required: false }
     args:    { description: "extra CLI args (not shell-interpolated; split safely)", required: false, default: "" }
     fail-threshold: { description: "severity required to fail the job (low|medium|high|critical)", required: false, default: "high" }
     upload-sarif: { description: "whether to produce SARIF", required: false, default: "false" }
   outputs:
     findings-json: { description: "path to findings JSON" }
     sarif-path:    { description: "SARIF file path when upload-sarif=true" }
   ```

4. **CI integration surface**:
   - Annotations: `core.error/warning` per finding (severity→annotation level: critical/error→error, high→warning, else notice). Path is repo-relative; evidence never included in annotation body.
   - SARIF: when `upload-sarif: true` or `command: scan --format sarif`, write SARIF 2.1.0 to `${{ runner.temp }}/ackit.sarif` with repo-relative URIs (existing `renderSarif`), then user may `uses: github/codeql-action/upload-sarif@v3` (documented recipe; action does not auto-upload without explicit permission, keeping least-privilege).
   - Job summary: `$GITHUB_STEP_SUMMARY` Markdown table `{ category, count, top finding }` + readiness score line when available (threshold configurable).
   - Artifact: `actions/upload-artifact@v4` optional (user step) — documented path `${{ runner.temp }}/ackit-findings.json`. Action itself does not secretly upload.

5. **Security**:
   - `permissions:` documented as `contents: read` (action needs repo), plus `checks: write` only if annotations via Check API (fallback to `core.*` needs no extra perm). Never `contents: write` or `id-token: write` (reserved for `release.yml`). No `pull_request_target` usage.
   - Input injection: `args` is parsed with a safe argv splitter (no shell), never passed to `child_process.exec` (only `execFile` with sanitized args). Checked by security fixture (injection string `"; rm -rf /"` does not execute).
   - Pinning: action repo's workflow tests pin `actions/checkout`, `actions/setup-node`, etc., to full SHAs (reuse `.github/workflows/ci.yml` pins). The action consumption pin in consumer workflows is documented as `uses: Cynrath/agent-context-kit@v0.2.0` (tag) or full SHA for high-assurance consumers (document both).

6. **Marketplace metadata**:
   - `action.yml` `name: "AgentContextKit"`, `description: "Offline-first agent readiness toolkit (scan/pack/graph/policy)"`, `branding: { icon: "shield", color: "blue" }`. `marketplace` publishing is optional for v0.2.0 and requires a separate manual dispatch (not tag-triggered). Documented but not executed without explicit authorization.

7. **Version coupling**:
   - Action version `0.2.0` matches npm `0.2.0`. `master` push runs only `ci.yml` (verify+self-scan+package-smoke); `release.yml` runs only on `v*.*.*` tags. Dogfood workflow `.github/workflows/ackit-action-dogfood.yml` (or an `action-smoke` job in `ci.yml`) runs `uses: ./. --command scan` against the current repo with `actionlint` lint as a required step.

8. **Tests**:
   - Contract: `tests/contract/action/action-contract.test.ts` asserts `action.yml` `runs.using == node24`, inputs include `command`+`fail-threshold`, `branding` exists, `permissions` docs.
   - Integration: hosted workflow (via `nektos/act` locally or a minimal `push` job) runs `uses: ./` with `command: scan` + `fail-threshold: low` → job fails, annotations present, SARIF artifact valid.

## Rationale

Node action + pinned npm dep balances determinism, supply-chain auditability, and runner performance. Least-privilege, safe arg splitting, and documentation-only auto-upload keep the action safe for private repos.

## Alternatives considered

- Composite (inline `run: npx ...`): rejected — would require network per job and cannot emit structured annotations cleanly.
- Docker: rejected — heavier, slower cold start, private registries.
- Invoking local `dist/cli/index.js` directly from host repo: rejected — couples action version to source `dist/` presence; pinned npm dep is cleaner.

## Consequences

- New files: `action.yml`, `action/{package.json,src/index.ts,dist/index.js}`, `.github/workflows/ackit-action-dogfood.yml` (or job), docs `docs/guides/ci.md` update, `benchmarks/` unaffected.
- Build: `pnpm build` emits `dist/action/index.js` (bundled via `esbuild`/`tsup` — lightest available; justify if heavier). `files` whitelist may or may not include `action/dist/...` (action consumers read from repo checkout, not npm).
- Publishing the action to the Marketplace is a distinct authorization checkpoint (never auto).

## Related requirements

REQ-V020-F-001..003.

## References

- `.github/workflows/release.yml` (existing tag-triggered OIDC flow, master-never-publishes invariant)
- `.github/workflows/ci.yml` (existing SHA pins for Actions)
