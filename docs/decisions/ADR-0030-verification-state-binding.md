# ADR-0030: Verification State Binding

Status: Accepted · Date: 2026-09-05 · Governs: TASK-0079

## Context

ADR-0026 gave us evidence registries, verification bundles
(`ackit.verification-bundle.v1`), and verdicts (`ackit.verdict.v1`) with
structural validation. What it did NOT give us is *binding*: a verdict
records what a verifier claimed, but nothing ties that claim to the exact
state it approved. A stale or replayed verdict — recorded before an
implementation change, a rewritten criterion, a shifted intent, or a touched
policy — still satisfies the completion gate today, because the gate only
reads `{ verdict }` (see `VerdictStore.latestVerdictSummary`). That is the
highest-value remaining trust gap (multi-auditor consensus, TASK-0079 basis).

## Decision

Solve **deterministic local state binding** first (TASK-0079). Verifier
independence hardening builds on this contract next (TASK-0080).

### 1. Canonicalization and hash/domain rules

One canonical hashing module: `src/core/verification/canonical.ts`.

- SHA-256 over UTF-8 bytes, hex-encoded.
- Canonical payload: stable JSON with sorted object keys, `undefined`
  dropped, arrays order-preserved. Uncontrolled `JSON.stringify()` is never a
  public digest contract.
- Domain separation: every digest is
  `SHA-256("ackit/state-binding/v1:<domain>\n" + canonical(value))`, so a
  task-contract digest can never collide with an evidence digest of identical
  JSON shape. Domains: `state`, `bundle`, `source-state`,
  `worktree-symlink`, `worktree-dir`, `task-contract`, `intent`,
  `artifact-refs`, `workflow`, `config`, `policy`, `evidence`.
- No mtimes, no absolute paths, no clock reads, no secret values in
  persisted binding payloads (digests + task id only).
- Pre-existing digests (`configDigest`, `policyDigest`,
  `intentFingerprint`) predate this module and keep serving their own
  purposes (cache keys, reference keys); all NEW binding computation goes
  through the canonical module.

### 2. Bound field classes

`computeStateBinding(root, taskId)` (read-only) produces eight component
digests, a `stateDigest`, and a `bundleDigest`:

| Component | Canonical form |
|---|---|
| `sourceState` | git HEAD (full SHA) + sorted repo-relative POSIX entries `{path, kind, sha}` for the changed/untracked working set (streaming content hashes; symlinks digest the target *string*, never followed; deletions are tombstones). Byte backstop excludes `.ackit/`, `docs/tasks/`, root `ackit.yml`/`ackit-policy.yml`, and `docs/intent/` — each covered semantically elsewhere (ledger, task contract, config/policy digests, intent digest) |
| `taskContract` | `{task, title, criteria[] (document order, whitespace-collapsed requirements), dependencies (sorted), intentRef, specRefs/decisionRefs (sorted), planRef, scope globs (sorted)}` |
| `intent` | normalized semantic subset (id, title, problem, desiredOutcome, criteria, constraints, non-goals, affected systems, questions, risks) |
| `artifacts` | sorted `{ref (repo-relative), sha256(content)}` for spec/decision/plan refs |
| `workflow` | `{profile, stage}` |
| `config` | parsed verification-relevant subset `{workflow, autonomy, review}` in canonical form (formatting-insensitive) |
| `policy` | effective `{autonomy, review}` tables (deny-wins merge, defaults filled) |
| `evidence` | criteria sorted by id: `{id, requirement, status, evidence[] ({type, ref} sorted)}` |

`stateDigest = H("state", {task, components})`.
`bundleDigest = H("bundle", {task, state})` — a pure function of the state
digest, so the bundle digest preimage excludes its own digest field (no
recursive self-hashing) and Markdown rendering never participates:
formatting-only Markdown changes cannot alter the semantic digest.

### 3. Excluded field classes (with rationale)

| Excluded | Reason |
|---|---|
| `issuedAt` / `updatedAt` / `recordedAt` / `createdAt` / mtimes / clock | bookkeeping time; binding time would make time passage stale verdicts and break cross-process determinism |
| task `status` / `completedAt` | lifecycle bookkeeping; hashing them makes completion stale its own verdict (circular gate) |
| completion notes / checkbox marks | written/ticked *after* verification in the normal flow; the evidence registry carries the bound verified signal instead |
| active/archive relative path | move-only change; must not invalidate (archive after legitimate completion is proven) |
| non-semantic ordering (evidence entry order, ref-list order) | canonical sorts make insertion order non-semantic |
| intent `status` / `source` | provenance bookkeeping (draft → accepted must not self-invalidate) |
| workflow history / attempts / timestamps | loop bookkeeping; the gate reads attempts directly |
| verification-irrelevant config/policy sections (scan, limits, rules, suppressions, patterns, …) | cannot affect acceptance; binding them is over-binding |
| checkpoint contents / prior verdict history | resume aids and outcomes, not reviewed state (binding them is self-referential) |
| `.ackit/**` bytes in source state | local ledger writes (evidence/verdict/checkpoint) must not self-stale; gitignored anyway, excluded explicitly for robustness |
| `docs/tasks/**` bytes in source state | task-doc bookkeeping churn between verify and complete must not self-stale (drift already excludes this prefix); semantics covered by `taskContract` |
| `docs/intent/**` bytes in source state | provenance churn (draft → accepted, source notes) must not stale through the byte backstop; semantics covered by the `intent` digest (content changes still stale there) |
| root `ackit.yml` / `ackit-policy.yml` bytes in source state | covered semantically by the config/policy digests; formatting-only rewrites must not stale |

Residual (fail-safe direction): verification-irrelevant edits to policy
*extends-chain* files still move `sourceState` (byte backstop) while leaving
the policy digest unchanged — conservative staleness, documented, never
silent freshness.

### 4. Worktree semantics

Binding HEAD alone is insufficient (it misses pre-commit work). Coverage:

- HEAD when available (full SHA), staged changes, unstaged changes, and
  relevant untracked files — via the same expanded working set the drift
  assembler uses (`expandChangedFiles`), sorted repo-relative paths.
- Deterministic per-file content digests (streaming SHA-256, no size cap
  games), explicit symlink semantics (target string digested, never
  followed), root containment (`normalizeRelativePath` + `isInsideRoot`
  reused, never duplicated), no ignored build/dependency junk (git status
  semantics, plus explicit `.ackit/` + `docs/tasks/` exclusions), no
  absolute paths.
- Git unavailable degrades EXPLICITLY (`gitUnavailable: true` with a
  digested degraded marker) — never a silent strong-binding claim. Degraded
  bindings stay comparable and completable; the marker is visible on the
  bundle and in the binding record.

### 5. Bundle identity

`ackit.verification-bundle.v2`: the v1 human blocks (unchanged keys for
readers) plus a structured `binding` object
`{version, stateDigest, bundleDigest, components, gitUnavailable}` in JSON
and a digest display section in Markdown. The digest is computed from the
canonical machine representation, not the rendering. Missing referenced
artifacts or unavailable binding inputs refuse the bundle with a stable
code instead of emitting a silently unbound document.

### 6. Verdict identity and v1 compatibility

- Verdict *authoring* shape is unchanged (`ackit.verdict.v1`,
  binding-free): verifiers keep writing what they write today; roles and
  authoring docs are untouched.
- The store persists `ackit.verdict.v2` (v1 fields + `binding`, including
  the `gitUnavailable` degraded marker so the long-lived record carries
  the weakness visibly).
  `list`/`read` dispatch on `schemaId`: existing v1 files stay readable as
  legacy history (never rewritten or deleted).
- New registrations REQUIRE the caller-computed current binding; a
  self-declared `binding` in input fails strict validation with
  VERDICT-INVALID (never trusted). A missing binding fails with
  VERDICT-BINDING-MISSING.
- Legacy unbound v1 verdicts never silently satisfy a state-bound
  completion requirement (`bound: false, fresh: false`).
- The public SDK gains the four symbols the new registration contract
  requires (`computeStateBinding`, `compareStoredBinding`,
  `isBoundVerdict`, `StateBindingError`; allowlist test updated) —
  otherwise the surface is frozen. MCP tools are unchanged (read-only);
  TASK-0083 owns any further projection parity.

### 7. Registration-time validation

`ackit verification record` recomputes CURRENT state at registration and
binds it. With `--bundle <bundle.json>`, the submitted bundle digest must
equal the recomputed digest or registration is refused with
VERDICT-BUNDLE-MISMATCH (the required race: bundle generated → state
changes → registration attempted → refused).

### 8. Completion-time freshness recheck

Registration validation alone is insufficient (state may change after a
valid verdict is recorded). The completion gate recomputes CURRENT binding
for PASS-family latest verdicts (read-only, deterministic):

- bound + digests match → completes (unchanged behavior otherwise);
- bound + mismatch → `VERDICT-STATE-STALE` with the changed component
  classes (`changed: evidence, sourceState`);
- legacy v1 → `VERDICT-BINDING-MISSING`;
- recompute failure → the failure's stable code, fail-closed.

Drift finding codes stay frozen (existence-based); freshness is enforced at
completion and exposed via `verification show --json`
(`bound`/`fresh`/`problemCode`). `--force` still overrides with the
explicit banner (unchanged override semantics).

### 9. Stable codes

| Code | Meaning |
|---|---|
| `VERDICT-BINDING-MISSING` | bound data absent where required (legacy unbound; registration without binding) |
| `VERDICT-BUNDLE-MISMATCH` | submitted bundle digest ≠ recomputed current |
| `VERDICT-STATE-STALE` | stored binding ≠ recomputed current |
| `VERIFICATION-BINDING-UNAVAILABLE` | binding cannot be computed (fail-closed) |
| `VERIFICATION-ARTIFACT-MISSING` | referenced artifact missing/unreadable/escaping (fail-closed) |

All five are contract-tested; pre-existing verdict codes are unchanged.
TASK-0080 owns independence-specific diagnostics (not implemented here).

### 10. Security boundaries

Only digests + repo-relative identifiers persist. Never: absolute home
paths, tokens, env secrets, raw secret preimages, machine temp paths.
Source bytes are hashed (streamed), never embedded — proven with synthetic
secret fixtures (the bundle secret gate also runs over v2 output). Unsafe
or unavailable binding inputs fail closed with a documented diagnostic.

## Explicit non-claims

No proof of verifier identity. No PKI. No signing infrastructure. No
blockchain. No proof that a person/model actually read the bundle.
Deterministic local state binding only — TASK-0080 handles verifier
independence next.

## Consequences

- Stale/replayed verdicts cannot satisfy completion (negative matrix A–J
  proven; non-invalidating classes proven, especially the
  verify → notes → complete → archive lifecycle).
- Cross-temp-root / cross-process digest equality (fixtures with fixed git
  identity prove absolute-root/mtime/clock/order independence).
- Schemas regenerated (`verdict.schema.json` → v2,
  `verification-bundle.schema.json` → v2 with binding); idempotent.
- Existing mandated gate scenarios keep their codes (REWORK → 
...[truncated 615 chars]