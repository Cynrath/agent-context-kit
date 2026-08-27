---
id: "TASK-0012"
title: "Declarative rule packs / policy packs"
status: pending
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Deliver safe, offline, declarative rule packs / policy packs (EPIC E) that extend the scan/policy surface without arbitrary JS execution. Packs provide six typed assertions — `presence` / `absence` / `pattern` / `config` / `dependency` / `instruction` — with glob/scope gating, deterministic DFS composition, and full reuse of the scanner `Finding` pipeline. This is the v0.2.0 extensibility primitive that replaces any future plugin-code proposal.

Related ADRs: ADR-0011 (policy engine), ADR-0015 (consolidated release), ADR-0018 (pack format + security boundary), ADR-0005 (fs containment), ADR-0009 (rule IDs), ADR-0021 (SDK boundary). Requirements: REQ-V020-E-001..003, REQ-V020-GOV-001/003/007.

## Context / current state

**Existing policy engine** — `src/core/policy/` is feature-complete on `master` for GOV-1/3/7 at policy-document scope but does not support generic pack assertions:

- `src/core/policy/types.ts` — 59 lines, Zod-strict `PolicyDocumentSchema` (`schemaVersion: 1`, `org?`, `repo?`, `pathScopes`, `extends`, `rules: PolicyRule[]` with `ruleId: /^ACKIT\d{3}$/`, `enabled?`, `severity?`, `locked`, `thresholds`, `suppressions` with `pathGlobs/reason/expiresAt`, `forbiddenPatterns: { id: ACKIT\d{3}, pattern, severity, message }`). `EffectivePolicy { documents, chain, digest, diagnostics }`.
- `src/core/policy/resolve.ts` — ~376 lines, offline-by-construction `resolvePolicy(root, { entryFiles, repoName, orgName })`. DFS pre-order over `extends` (child layers first), cycle detection (`POL-CYCLE`), `locked` conflict throws `POL-LOCKED-CONFLICT`, containment via `isInsideRoot` + `realpath` double-check (`POL-ROOT-ESCAPE`, `POL-OFFLINE-BLOCKED` for `npm:`), `stableStringify` + `sha256` digest, empty-policy fallback when `ackit-policy.yml` absent.
- `src/core/policy/apply.ts` — ~96 lines, `applyPolicyToFindings(findings, { policy, documents })`: flattens severity overrides, merges scoped vs global suppressions (`active()` checks `expiresAt`), gates per-layer entries via `pathScopes` + `globMatches`. `globMatches` (`src/core/policy/match.ts`) is deterministic 11-line `*`/`**` → `RegExp`.
- `schemas/policy.schema.json` — JSON Schema draft 2020-12 for the v1 document above (`$comment: ACKit policy document schema v1`). `ackit.yml` `policy.extends` (`schemas/ackit.schema.json` v1) delegates to this layer.
- **Scanner integration** today is only via `forbiddenPatterns` → `forbiddenPatternToRule()` in `resolve.ts` that compiles a single `RegExp(pattern,"g")` and produces a `ScanRule` (`hygiene` category). `Finding` contract (`src/core/scanner/types.ts`) is stable: `ruleId, severity, category, message, relativePath, line/column, fingerprint, evidence (already redacted), remediation, documentationKey, suppressed, suppressionReason`. `ScanRule { id, category, severity, documentationKey, remediation, appliesTo, evaluate({content, relativePath}) → FindingDraft[] }`.
- **No generic assertions exist**: there is no `presence` (glob must match ≥1 file), `absence` (must not), `pattern`/`content` (glob+regex), `config` (zod path assertion on `ackit.yml`), `dependency` (`package.json` deps), or `instruction` (graph node count/property) capability. `ackit.yml` has no `policy.rulePacks` field. No `schemas/rule-pack.schema.json`, no `src/core/policy/packs/` modules, no `evaluateRulePacks`. Tests cover `policy` + `forbiddenPatterns` only.

**What stays**: policy DFS/locked/digest/containment primitives are reused unchanged (no rewrite). Pack composition extends them with namespaced IDs and size/pattern limits rather than replacing them.

## Goal

One outcome: authors can ship a declarative YAML/JSON pack (`packId`, `namespace`, `version`, `severity`, `rules[1..200]`, optional `overrides`/`composition.extends`) that is loaded only from repo-local paths (`ackit.yml: policy.rulePacks`) or from already-installed `node_modules/<pkg>/ackit-packs/*` (offline), validated with strict size/complexity limits (`maxPattern 500`, `maxFileBytes 512KB`, `maxDepth 20`), composed deterministically (DFS + overrides + locked + `POL-PACK-COLLISION`), and evaluated by a pure function `evaluateRulePacks(effectivePacks, repoFiles, config, instructionGraph) → Finding[]` whose findings are indistinguishable from builtin findings (same `Finding` schema, stable `packId:slug` fingerprints, counted in `scan --ci --threshold`). No JS exec, no network, no traversal, ReDoS-guarded.

## In scope

- **Schema + types** — `schemas/rule-pack.schema.json` v1 (draft 2020-12, `additionalProperties: false`, `id: rule-pack`) and Zod `RulePackSchemaV1` + `RuleV1` union (`presence|absence|pattern|config|dependency|instruction`) in `src/core/policy/packs/types.ts`. `pnpm gen:schemas` wires the export.
- **Top-level pack shape** (strict, per ADR-0018 §1):
  ```ts
  { schemaVersion: 1
  , packId: string                 // kebab-case ^[a-z0-9]+(-[a-z0-9]+)*$, 3..64
  , namespace: string              // DNS-like or org prefix ^[a-z0-9]+([-.][a-z0-9]+)*$, 2..64
  , version: string                // semver ^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?
  , displayName?: string           // 1..80
  , description?: string           // 1..500
  , severity: "low"|"medium"|"high"|"critical"  // default pack severity (each rule may override)
  , rules: RuleV1[]                // 1..200, unique `id` per pack
  , overrides?: Record<string, { severity?: Severity, remediation?: string, enabled?: boolean, locked?: boolean }>
  , composition?: { extends: string[] }         // local refs only, 0..20 entries
  }
  RuleV1 {
    id: string                     // `${packId}:${slug}` where slug ^[a-z0-9]+(-[a-z0-9]+)*$ OR /^ACKIT\d{3}$/ alias (builtin-compat)
  , type: "presence"|"absence"|"pattern"|"config"|"dependency"|"instruction"
  , glob?: string                  // picomatch-compatible, optional — when omitted rule applies repo-wide
  , scope?: string[]               // path globs limiting evaluation (0..20, each 1..200 chars)
  , match?: string                 // regex source, 1..500 chars, required for type==="pattern"
  , message: string                // 1..500
  , severity?: Severity
  , remediation?: string           // 1..500
  , enabled?: boolean              // default true
  , locked?: boolean               // default false — prevents weakening via later composition
  }
  ```
  Limits enforced at parse (see Technical design → Validation).
- **Six rule types** with deterministic semantics (REQ-V020-E-003):
  - `presence` — repo must contain ≥1 file matching `glob`; otherwise one finding at repo root (`relativePath: "."` or `glob`).
  - `absence` — repo must contain 0 files matching `glob`; each matched file emits one finding.
  - `pattern` — for each file matching `glob` (or all text files if no glob), test `match` regex line-by-line; each match emits a finding at that `line/column` with `rawEvidence = match[0]` (redacted by pipeline before `Finding.evidence`).
  - `config` — assertion over dotted path on effective `AckitConfig` (e.g., `scan.exclude`, `policy.extends`, `context.maxTokens`) — `path`, `op` (`equals|notEquals|exists|notExists|contains|matches`), `value?`.
  - `dependency` — presence/absence/version assertion over `package.json` `dependencies+devDependencies+peerDependencies` (e.g., `package: "zod", version: ">=3.0.0"`).
  - `instruction` — assertion over `InstructionGraph` node count/properties (e.g., `graph.nodes where provider==="copilot" count >=1`).
- **Glob + scope** — `glob` via `picomatch` (already in deps); `scope` is an additional AND-filter of path globs (if `scope` non-empty, file must satisfy at least one scope glob). Both validated for traversal/URL (see Security).
- **Loading** — `ackit.yml` `policy.rulePacks: string[]` (paths repo-relative, validated via `isInsideRoot` + `realpath` containment, outside-root → `FS-PATH-ESCAPES-ROOT`). Loader `src/core/policy/packs/load.ts` reads YAML or JSON (real YAML parser, maxFileBytes 512KB, maxDepth 20), validates `RulePackSchemaV1`, compiles `pattern` regexes with ReDoS guard. Local/repo only; `composition.extends` inside packs follows same containment.
- **Optional package-distributed packs** — allowed ONLY from already-installed `node_modules/<pkg>/ackit-packs/*` resolved through `node_modules` without network. No `https://` fetch, no `extends: "url"` (→ `POL-NETWORK-REFUSED`). External entries require `npm:` or `pkg:` prefix *or* explicit allowlist `node_modules` path and are refused if package not installed (→ `POL-OFFLINE-BLOCKED`). Offline by construction (REQ-V020-GOV-001).
- **Namespaces / IDs** — stable namespaced ids `namespace:packId:ruleSlug` (storage key) plus alias `packId:slug`. Global `ACKIT\d{3}` ids remain singletons and cannot be redefined by packs (diagnostic `POL-PACK-COLLISION`). Pack-vs-pack same namespaced id → last `extends` wins deterministically (sorted) unless `locked: true` on the winner's `overrides` entry — then earlier locked value is retained and weakening attempt emits `POL-PACK-LOCKED`.
- **Composition** — deterministic DFS over `composition.extends` (local files/packages), then top-level `rules`, then `overrides`. Produces `EffectiveRulePack { packId, namespace, version, severity, rules: EffectiveRule[], digest, chain, diagnostics }` with `digest = sha256(canonical JSON)` via `stableStringify`. Merge is pure, order-stable, snapshot-tested.
- **Validation** — size/complexity limits emit `POL-PACK-LIMIT-*` diagnostics and refuse to load the offending pack (no crash). Exceeding any limit → pack skipped, diagnostic recorded, scan continues with remaining packs.
- **Evaluation** — pure `evaluateRulePacks(effectivePacks, { repoFiles, config, instructionGraph }) → Finding[]` (offline, bounded, no I/O). Findings reuse `Finding` schema (including `fingerprint = sha256(packId|ruleId|relativePath|line|message)`) so SARIF/JSON/manifest pipelines are uniform.
- **CI integration** — pack findings count toward `scan --ci --threshold` and `--fail-below` gates unchanged.
- **CLI wiring** — `executeConfiguredScan` merges builtin rules + effective packs; `ackit policy check --json` reports `effectivePacks { packId, namespace, version, digest, ruleCount, chain }` + diagnostics; `ackit diagnostics` surfaces pack status.
- **Tests, docs, evidence** — per Acceptance criteria / Tests below.

## Out of scope

- Any execution of JS/TS/shell from pack contents — packs are data only (no `eval`, no `require(packId)`, no `vm`, no `child_process.exec` with pack input). Violation is a security failure.
- Remote URL auto-fetch or registry download of packs — `extends: "https://…"` and URL-shaped `glob` are refused (`POL-NETWORK-REFUSED`). Explicit user `pnpm install` of a pack package is the only distribution path (deferred to explicit future ADR if ever changed).
- Rego/OPA engine, container vuln scanning, SBOM generation, SAST cloning, ML/PII detection — per REQ-V020-GOV-OUT-001 / REQ-GOV-009.
- Replacing `src/core/policy/resolve.ts` / `apply.ts` architecture — pack composition reuses DFS/locked/digest primitives additively.
- `ackit.yml` schemaVersion bump beyond v2 needed for `policy.rulePacks` — the task adds `rulePacks` inside existing v2 policy shape; a full version bump requires separate ADR if chosen (document the chosen additive field instead).
- Automatic mutation / `--fix` for pack findings — pack findings are advisory unless a dedicated `optimize` rule authorizes it (left to TASK-0009).
- Telemetry, cloud control plane, vector DB, LLM APIs — out of scope per GOV invariants (grep-gate enforced).

## Technical design

### Schemas — `schemas/rule-pack.schema.json` v1

New file, registered in `pnpm gen:schemas` (update `scripts/gen-schemas.*` + `src/core/config/schema.ts` re-export if needed). JSON Schema draft 2020-12, `type: object`, `additionalProperties: false`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ackit.rule-pack.v1",
  "title": "ACKit rule pack v1",
  "type": "object",
  "required": ["schemaVersion","packId","namespace","version","severity","rules"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "packId": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$", "minLength": 3, "maxLength": 64 },
    "namespace": { "type": "string", "pattern": "^[a-z0-9]+([-.][a-z0-9]+)*$", "minLength": 2, "maxLength": 64 },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+(-[0-9A-Za-z.-]+)?$" },
    "displayName": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "minLength": 1, "maxLength": 500 },
    "severity": { "enum": ["low","medium","high","critical"] },
    "rules": {
      "type": "array", "minItems": 1, "maxItems": 200,
      "items": { "$ref": "#/$defs/ruleV1" }
    },
    "overrides": {
      "type": "object", "additionalProperties": {
        "type": "object", "additionalProperties": false,
        "properties": {
          "severity": { "enum": ["low","medium","high","critical"] },
          "remediation": { "type": "string", "minLength": 1, "maxLength": 500 },
          "enabled": { "type": "boolean" },
          "locked": { "type": "boolean" }
        }
      }
    },
    "composition": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "extends": { "type": "array", "maxItems": 20, "items": { "type": "string", "minLength": 1, "maxLength": 300 } }
      }
    }
  },
  "$defs": {
    "ruleV1": {
      "type": "object", "required": ["id","type","message"], "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "pattern": "^([a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*|ACKIT\\d{3})$", "maxLength": 80 },
        "type": { "enum": ["presence","absence","pattern","config","dependency","instruction"] },
        "glob": { "type": "string", "minLength": 1, "maxLength": 300 },
        "scope": { "type": "array", "maxItems": 20, "items": { "type": "string", "minLength": 1, "maxLength": 200 } },
        "match": { "type": "string", "minLength": 1, "maxLength": 500 },
        "message": { "type": "string", "minLength": 1, "maxLength": 500 },
        "severity": { "enum": ["low","medium","high","critical"] },
        "remediation": { "type": "string", "minLength": 1, "maxLength": 500 },
        "enabled": { "type": "boolean" },
        "locked": { "type": "boolean" }
      },
      "allOf": [
        { "if": { "properties": { "type": { "const": "pattern" } } }, "then": { "required": ["match","glob"] } }
      ]
    }
  }
}
```

Zod mirror in `src/core/policy/packs/types.ts` (`RulePackSchemaV1`, `RuleV1Schema` discriminated union), `strictObject`, `superRefine` for cross-field checks (`pattern` requires `match`, `match` length ≤500, `rules` unique `id` per pack).

Limits at parse: `maxRules 200`, `maxPatternLen 500`, `maxFileBytes 512KB`, `maxDepth 20` (YAML/JSON depth). Exceeding emits `POL-PACK-LIMIT-RULES | POL-PACK-LIMIT-PATTERN | POL-PACK-LIMIT-BYTES | POL-PACK-LIMIT-DEPTH` and refuses that pack.

### Types — six assertion kinds

```ts
// src/core/policy/packs/types.ts
export type RuleType = "presence"|"absence"|"pattern"|"config"|"dependency"|"instruction";
export type EffectiveRule = RuleV1 & { packId: string; namespace: string; effectiveSeverity: Severity };
export interface EffectiveRulePack {
  packId: string; namespace: string; version: string;
  severity: Severity; displayName?: string; description?: string;
  rules: EffectiveRule[];        // after DFS + overrides + locked resolution
  digest: string;                 // sha256(stableStringify(canonical pack JSON))
  chain: string[];                // resolved file chain, POSIX repo-relative
  diagnostics: ScanDiagnostic[];  // collisions, limits, network refusals, etc.
}
```

`glob` is `picomatch`-compiled once at load (not per-file); `scope` is `string[]` of additional picomatch globs ANDed with `glob`. `match` is ECMAScript regex source bounded to 500 chars.

### Glob + scope semantics

- `glob` — picomatch with `dot: false`, posix-normalized; `**` spans segments, `*` stays in-segment. Examples: `**/*.ts`, `src/**/*.{ts,js}`, `README.md`.
- `scope` — optional additional filter: when non-empty, a file must satisfy `glob` AND at least one `scope` entry. Use case: pack rule targets `**/*.md` but `scope: ["docs/**"]` restricts to docs subtree.
- Validation: `glob`/`scope` entries are checked for URL shape (`^https?://` → `POL-NETWORK-REFUSED`), traversal (`..` segment that would escape root after normalize → `POL-PACK-TRAVERSAL`), and absolute path (`path.isAbsolute` → `POL-PACK-TRAVERSAL`). No outside-root pack path is ever evaluated.

### Loading — local repo only (`ackit.yml: policy.rulePacks`)

- **Config key**: `ackit.yml` → `policy.rulePacks: string[]` (default `[]`). Additive field on `schemas/ackit.schema.json` v1 inside `policy` object: `{ extends: string[], rulePacks: string[] }`. Parsed by `src/core/config/load.ts`, validated by `AckitConfigSchema`.
- **Resolution** (`src/core/policy/packs/load.ts`):
  ```
  async function loadRulePacks(root: RepositoryRootLike, rulePackPaths: string[]): Promise<LoadedPack[]>
  ```
  For each entry: `path.resolve(root.canonicalPath, entry)` → `isInsideRoot` string check → `fsp.realpath` → second containment check (realRoot vs realPath, handles Windows 8.3 / symlink escapes) → `fsp.readFile` capped at 512KB (stream guard reads first 512KB+1 and refuses if >512KB → `POL-PACK-LIMIT-BYTES`). Parse as YAML (`yaml.parse`, maxDepth 20 — depth counter walks parsed object; >20 → `POL-PACK-LIMIT-DEPTH`) or JSON if `.json`. Zod-validate `RulePackSchemaV1`; on failure throw `PolicyError("POL-INVALID", ...)` with `file:line` from YAML source map.
- **`composition.extends` inside packs** — same containment loop recursively (DFS), up to 20 entries per pack, cycle detection via `visiting` set → `POL-CYCLE`. Each extended file is loaded and validated the same way.
- **No network**: any entry matching `^https?://` or `^ftp://` or URL-shaped `glob` is refused before I/O with diagnostic `POL-NETWORK-REFUSED` and `POL-OFFLINE-BLOCKED` (offline invariant). No `fetch`, no `http.get` path exists in pack code — enforced by grep-gate.

### Optional package-distributed packs — offline, pre-installed only

- Allowed form: already-installed `node_modules/<pkg>/ackit-packs/*.{yml,json}`. Config may list `policy.rulePacks: ["npm:acme-pack/ackit-packs/security.yml"]` or `["node_modules/acme-pack/ackit-packs/security.yml"]` (both normalized to `npm:` form). Resolver uses `createRequire(root/package.json).resolve("acme-pack/package.json")` to locate `pkgDir`; then joins `subPath`. If not installed → `POL-OFFLINE-BLOCKED` diagnostic: `npm policy package 'acme-pack' is not installed; ACKit never fetches remote packages (REQ-V020-GOV-001)`.
- No `extends: "url"` inside packs: same URL-shape refusal.
- Digest pinning (optional P2, spec-left field): `ackit.yml` may list `policy.rulePacks: [{ path: "...", digest: "sha256:..." }]` (future) — current task accepts `string[]` only but types leave `digest` slot via `overridesDigest?` on `EffectiveRulePack`; loader computes digest and surfaces it to `ackit policy check` without enforcing pin (pin enforcement deferred, but field is documented).

### Namespaces / IDs

- **Canonical storage key**: `namespace:packId:ruleSlug` (`namespace` + `packId` + `slugAfterColon`). Example: `acme:security-baseline:no-plaintext-aws-key` from `packId:"security-baseline", namespace:"acme", rule.id:"security-baseline:no-plaintext-aws-key"`.
- **Alias**: `packId:slug` (`security-baseline:no-plaintext-aws-key`) is accepted as shorthand and stored under canonical key (alias resolution: prepend `namespace:` if missing).
- **Global `ACKIT\d{3}` ids**: singletons, cannot be redefined by packs. Attempt → diagnostic `POL-PACK-COLLISION` (finding not emitted from pack; builtin rule remains authoritative). Pack-vs-pack same namespaced canonical id → deterministic last-wins after DFS-sort: packs are sorted by `chain` (POSIX), then `overrides` are applied; if winner has `locked: true` in its `overrides[ruleId]`, earlier locked value is retained and weakening attempt emits `POL-PACK-LOCKED`.
- **Stable across machines**: IDs, globs, and fingerprints use POSIX repo-relative paths only; no absolute path in rule metadata.

### Composition — deterministic DFS + overrides + locked / collisions

```
resolveEffectivePacks(root, packPaths)
  visiting, visited sets
  documents: RulePack[] in DFS pre-order (extends first, then parent)
  chain: string[] POSIX relative

composePacks(documents) → EffectiveRulePack[]
  byPack = groupBy(packId)
  for each packId in sorted(packIds):
    rulesById = Map<CanonicalId, EffectiveRule> in document order
    for doc in sorted(documentsForThisPackId by chain):
      for rule in doc.rules:
        key = canonicalId(rule.id, doc.namespace, doc.packId)
        if existing?.locked && weakens(existing, rule): emit POL-PACK-LOCKED, keep existing
        else if existing && existing.packId !== rule.packId: emit POL-PACK-COLLISION, last wins
        else rulesById.set(key, withPackMeta(rule, doc))
    apply doc.overrides (and pack-level severity default):
      for [ruleId, patch] in doc.overrides:
        target = rulesById.get(canonicalId(ruleId, ...))
        if !target: emit POL-PACK-UNKNOWN-OVERRIDE (diagnostic), skip
        else if target.locked && weakens(target.effectiveSeverity, patch.severity): emit POL-PACK-LOCKED, skip
        else patch target (severity/remediation/enabled/locked)
    packDigest = sha256(stableStringify({ packId, namespace, version, severity, rules: sortedRules }))
```

`severityRank(low=0, medium=1, high=2, critical=3)` used for `weakens(a,b) = b.severity < a.severity || b.enabled===false`. All diagnostics use stable codes `POL-PACK-COLLISION`, `POL-PACK-LOCKED`, `POL-PACK-UNKNOWN-OVERRIDE`, `POL-PACK-CYCLE`, `POL-NETWORK-REFUSED`, `POL-ROOT-ESCAPE`, `POL-PACK-LIMIT-*`.

### Validation — size / complexity limits → diagnostics

- `maxRules 200` per pack — `rules.length >200` → `POL-PACK-LIMIT-RULES` (pack skipped).
- `maxPatternLen 500` — `rule.match.length >500` → `POL-PACK-LIMIT-PATTERN`.
- `maxFileBytes 512KB` — raw file >524288 bytes → `POL-PACK-LIMIT-BYTES`.
- `maxDepth 20` — parsed object depth >20 → `POL-PACK-LIMIT-DEPTH`.
- `maxScopeEntries 20`, `maxGlobLen 300`, `maxMessageLen 500` — same pattern.
- ReDoS: compile `new RegExp(match)` and run sentinel ` "a".repeat(10_000)` + fixture `"\n".repeat(1_000)` with 50ms timeout via `performance.now()` guard; if exceeds 50ms or throws catastrophic flag, reject → `POL-PACK-REDOS` (pack rule disabled, diagnostic).
- All limit hits are diagnostics, not crashes; `loadRulePacks` returns `diagnostics[]` per pack and continues with remaining packs. `ackit policy check --json` aggregates.

### Evaluation — pure `evaluateRulePacks`

```ts
// src/core/policy/packs/evaluate.ts
export function evaluateRulePacks(
  effectivePacks: readonly EffectiveRulePack[],
  ctx: {
    repoFiles: readonly { relativePath: string; content: string }[];
    config: AckitConfig;
    instructionGraph?: InstructionGraph | undefined;
    signal?: AbortSignal | undefined;
  }
): Finding[]
```

- **Pure, bounded**: no I/O, no network, no `process` access; respects `signal?.aborted` (checks per-rule, returns partial `Finding[]` plus diagnostic `POL-PACK-ABORTED` if aborted).
- Per type:
  - `presence`: `files.some(f => picomatch(glob)(f.relativePath) && scopeOk(f))`; if none → `Finding { ruleId=canonicalId, severity=rule.effectiveSeverity??pack.severity, category="hygiene"|"config-problem"|"dependency-advisory"|"instruction-scope" (derived from type), message=rule.message, relativePath=glob, line:1, column:1, evidence="" }`.
  - `absence`: each file matching `glob && scopeOk` → one finding at `line:1`.
  - `pattern`: for each file matching `glob && scopeOk`, split `content` by `\r?\n`, run `regex.exec(line)` with `lastIndex=0` per line, push `FindingDraft { ruleId, severity, category:"hygiene", message, offset: lineOffset + match.index, rawEvidence: match[0], remediation, documentationKey: "rules/"+ruleId }`; pipeline redacts `rawEvidence` before `Finding.evidence`.
  - `config`: dotted-path read via `getByPath(config, rule.configPath)` (reuse `zod`-like accessor); compare via `op` (`equals`, `contains`, `matches` uses same regex guard); mismatch → finding at `relativePath: "ackit.yml"`.
  - `dependency`: read `package.json` content from `repoFiles.find(p=>p.relativePath==="package.json")`; parse JSON safely (invalid → diagnostic `POL-PACK-BAD-PACKAGE-JSON`, skip); check `deps[packageName]` existence/version via `semver` range check if available else string `includes`.
  - `instruction`: read `ctx.instructionGraph`; evaluate count/property predicate (`graph.nodes.filter(...).length` compared via `op`); mismatch → finding at `relativePath: "AGENTS.md"` (or graph root).
- **Scope helper**: `scopeOk(relativePath) = scope.length===0 || scope.some(s => picomatch(s)(relativePath))`.
- **Evidence redaction**: `FindingDraft.rawEvidence` is redacted by `src/core/scanner/pipeline.ts` boundary (reuse `redactEvidence()` — no secret value survives into `Finding.evidence`; pipeline already guarantees per ADR-0009).

### Findings — reuse scanner `Finding` schema + stable fingerprints

- Findings are constructed via same `FindingSchema` (`ruleId, severity, category, message, relativePath, line/column, fingerprint, evidence (redacted), remediation, documentationKey, suppressed, suppressionReason`).
- **Fingerprint**: `sha256(packId + "|" + canonicalRuleId + "|" + relativePath + "|" + (line ?? "") + "|" + message)` hex, deterministic, machine-path independent. Same inputs ⇒ same fingerprint across OS.
- `category` mapping: `presence/absence → "hygiene"` (or `"config-problem"` for config, `"dependency-advisory"` for dependency, `"instruction-scope"` for instruction); `pattern → "hygiene"`.
- `ruleId` in finding is the canonical `namespace:packId:slug` form (alias normalized), so SARIF `ruleId` is stable for baselines.
- Suppressions (`PolicyDocument.suppressions`) still apply via `applyPolicyToFindings` after pack evaluation (pack `ruleId` respected).

### CI integration

- `executeConfiguredScan(root, opts)` merges `builtinRules` + `effectivePacks.map(packToRule)` (or directly appends `evaluateRulePacks` findings) before `normalize → fingerprint → baselineCompare → threshold`. Pack findings count toward `--threshold <level>` and `--fail-below <score>` / `scan --ci` exit codes (`0` success, `1` threshold violated, `2` usage/config, `3` env, `4` security boundary, `5` internal).
- `ackit scan --ci --json` includes pack findings in `findings[]` and `diagnostics[]` includes pack diagnostics (`POL-PACK-*`). SARIF output includes pack `ruleId`s in `runs[0].tool.driver.rules[]` (each rule entry generated from `EffectiveRulePack.rules`).

## User-facing behavior

```yaml
# ackit.yml (policy rulePacks — additive field)
policy:
  extends: ["./policies/org.yml"]        # existing
  rulePacks:
    - "./packs/acme-security.yml"          # repo-relative, YAML or JSON
    - "./packs/hygiene.json"
    - "npm:acme-pack/ackit-packs/baseline.yml"  # pre-installed package only
```

```yaml
# packs/acme-security.yml — example pack v1
schemaVersion: 1
packId: acme-security-baseline
namespace: acme
version: 1.2.0
displayName: "Acme Security Baseline"
severity: high
rules:
  - id: acme-security-baseline:readme-required
    type: presence
    glob: "README.md"
    message: "Repository must contain README.md at root"
    remediation: "Add README.md"
  - id: acme-security-baseline:no-plaintext-secret
    type: pattern
    glob: "**/*.{ts,js,yml,yaml}"
    scope: ["src/**", "config/**"]           # AND-filter
    match: "AKIA[0-9A-Z]{16}"
    severity: critical
    message: "Plaintext AWS key shape detected"
    remediation: "Remove secret, use env var"
  - id: acme-security-baseline:deps-pinned
    type: dependency
    message: "zod must be declared"
    severity: medium                         # overrides pack default high
  - id: acme-security-baseline:config-exclude
    type: config
    message: "scan.exclude must contain node_modules"
    severity: low
composition:
  extends: ["./base.yml"]
overrides:
  acme-security-baseline:deps-pinned: { severity: high, locked: true }
```

```powershell
# CLI
ackit policy check --json
# → { effectivePacks: [{ packId, namespace, version, digest, ruleCount, chain, diagnostics }], diagnostics: [...] }

ackit diagnostics --json
# → includes pack status: { packs: [{ packId, digest, ruleCount, chain }], packDiagnostics: [...] }

ackit scan --json
# → findings[] includes pack findings with ruleId "acme:acme-security-baseline:readme-required" etc.
#    diagnostics[] includes POL-PACK-* codes

ackit scan --ci --threshold high
# → exit 1 if any pack finding has severity ≥ high (same gate as builtin rules)
```

Error surfacing: unknown pack id → diagnostic `POL-PACK-NOT-FOUND`; collision → `POL-PACK-COLLISION`; locked weaken → `POL-PACK-LOCKED`; network URL → `POL-NETWORK-REFUSED`; traversal → `FS-PATH-ESCAPES-ROOT` / `POL-ROOT-ESCAPE`; ReDoS → `POL-PACK-REDOS`; limits → `POL-PACK-LIMIT-*`. All via `diagnostics[]`, never raw stack traces unless `--debug`.

## Security

- **No exec** — packs are `yaml`/`json` data validated by Zod strict schema (`additionalProperties:false`). Pack fields `match` are regex source only; never passed to `eval`, `Function`, `vm`, `require`, or `child_process`. Grep-gate in completion asserts `src/core/policy/packs/**` contains no `eval(` `Function(` `require(` `child_process`.
- **No network** — no `fetch`/`http`/`https` import in pack code; any URL-shaped `extends`/`glob`/`scope` (`^https?://`, `^ftp://`, `//`) is refused synchronously with `POL-NETWORK-REFUSED` before I/O. Offline-first invariant (REQ-V020-GOV-001) holds because package-distributed packs resolve only via `node_modules` already on disk (pre-installed `pnpm install`), never via fetch. `POL-OFFLINE-BLOCKED` if package absent.
- **Traversal containment** — every pack path (`rulePacks[]`, `composition.extends[]`) is validated via `isInsideRoot` string check then `realpath` double-check; outside-root denied with stable `FS-PATH-ESCAPES-ROOT`/`POL-ROOT-ESCAPE` before read. Pack `glob`/`scope` paths validated for `..` escape and absolute-path shape (`POL-PACK-TRAVERSAL`). No symlink/junction/reparse escape (fs engine reused).
- **ReDoS defense** — `match` length ≤500, rules ≤200; each `pattern` regex compiled once and exercised against sentinel fixture (`"a".repeat(10_000)` + multiline 1k) with 50ms budget via `performance.now()` sentinel. Exceeding budget or throwing catastrophic backtracking → reject `POL-PACK-REDOS`. Runtime evaluation is per-line, non-backtracking where possible (use `[^]*` guard).
- **YAML/JSON limits** — `maxFileBytes 512KB`, `maxDepth 20`, `maxRules 200`, `maxGlob 300`, `maxScope 20`, `maxMessage 500`; exceeding any → `POL-PACK-LIMIT-*` diagnostic and pack skip (no crash, no OOM). Parser is `yaml` (not `js-yaml` with custom tags); no `!!js/function` tags allowed (strict schema rejects `!!` tags).
- **Secret/path redaction** — pack `FindingDraft.rawEvidence` routed through same `redactEvidence()` as builtin rules; `Finding.evidence` is redacted, never stores raw secret; `fingerprint` is hash, not raw content; `diagnostics` never echo secret values (only `POL-PACK-*` + path, not match content).
- **Supply-chain pin** — optional digest pin `policy.rulePacks[{ path, digest }]` computed as `sha256(stableStringify(pack))`; if provided and mismatch → hard load failure. Documented as P2; not required for v0.2.0 gate but field is present for future.

## Performance

- **Pack load** — YAML parse + Zod validate + glob compile for a 200-rule pack <100ms cold on CI runner; I/O bounded by 512KB per file and DFS ≤20 extends. No network wait.
- **Evaluation** — `evaluateRulePacks` scans `repoFiles` already in memory from discovery; `pattern` rules reuse pre-compiled `RegExp` + per-line `exec`; `presence`/`absence` are `O(files × rules)` with picomatch fast-path. 100-rule pack over 5k files <200ms incremental budget (benchmark suite `benchmarks/run.mjs` class `large` covers it). No regex is evaluated without the 50ms sentinel pre-check.
- **Memory** — effective packs retained as plain objects; `rulePacks` contents not duplicated per file; `digest` cached per pack.
- **Benchmark harness** — `benchmarks/fixtures` includes `large-rule-pack` fixture (100 rules: 40 presence/absence, 40 pattern, 20 config/dependency/instruction); `benchmarks/run.mjs` reports `packLoadMs`, `packEvalMs`, `packFindingsCount`, `cacheHitRatio`. Thresholds via `thresholds.json` multiplier (e.g., `packEvalMs < baseline ×1.5`), not absolute ms (see ADR-0022).

## Compatibility

- **Node** — `>=22` (same as `engines.node`), `AbortSignal` available; `path.posix` used for chain normalization so Windows drive/space/Unicode/mixed EOL normalized to POSIX `relativePath` (per GOV-005).
- **Schemas** — additive: `schemas/ackit.schema.json` adds optional `policy.rulePacks: string[]` without bumping top-level `const`; `schemas/rule-pack.schema.json` is new v1 (`$id: ackit.rule-pack.v1`); `gen:schemas` updated. If a breaking pack schema change is later required, it requires `schemaVersion: 2` + ADR + CHANGELOG (per GOV-009).
- **Existing policy** — v1 `ackit-policy.yml` (`PolicyDocumentSchema`) unchanged; pack composition runs alongside `resolvePolicy`, not inside it. `EffectivePolicy.digest` remains `sha256(stableStringify(policy))`; new `EffectiveRulePack.digest` is independent. No migration required for repos without `policy.rulePacks`.
- **Cross-platform** — all paths POSIX-normalized (`split("\\").join("/")`); picomatch globs POSIX-only; `realpath` casing handled for Windows 8.3 short names; case-sensitivity tests per TASK-0289.
- **Version alignment** — pack `version` is informational semver (not engine gate); npm package `@cynrath/agent-context-kit@0.2.0` and `extension/package.json` mirror `0.2.0` (ADR-0023) — pack version drift does not block scan.

## Acceptance criteria

- [ ] `schemas/rule-pack.schema.json` v1 exists, `additionalProperties:false`, `required: [schemaVersion, packId, namespace, version, severity, rules]`, `rules` `1..200`, `match` `≤500`, `maxFileBytes`/`maxDepth` enforced in loader; `pnpm gen:schemas && pnpm typecheck` green and `schemas/rule-pack.schema.json` validates a minimal `acme-security-baseline` fixture via `ajv` or `zod` snapshot.
- [ ] `ackit.yml` `policy.rulePacks: ["./packs/acme.yml", "./packs/hygiene.json"]` (repo-relative) loads 1..2 packs from a temp repo; outside-root entry `../evil.yml` or `/abs/pack.yml` emits `FS-PATH-ESCAPES-ROOT` / `POL-ROOT-ESCAPE` and denies load (no file read outside root). Symlink/junction escape via `realpath` also denied.
- [ ] Optional package-distributed pack `npm:acme-pack/ackit-packs/security.yml` loads only when `node_modules/acme-pack/package.json` exists on disk; missing package → `POL-OFFLINE-BLOCKED` diagnostic; URL `https://example.com/pack.yml` or `extends: "https://…"` → `POL-NETWORK-REFUSED` / `POL-OFFLINE-BLOCKED` (no fetch path).
- [ ] `packId` (kebab 3..64), `namespace` (DNS-like 2..64), `version` (semver), `severity` enum validated; `rule.id` as `packId:slug` or `ACKIT\d{3}` alias; global `ACKITxxx` cannot be redefined by a pack (diagnostic `POL-PACK-COLLISION`, builtin remains authoritative).
- [ ] Composition is deterministic DFS: two packs with same `packId` and overlapping `ruleId` produce last-wins after sorted `chain`; if winner `overrides[ruleId].locked===true`, earlier locked severity is retained and weakening emits `POL-PACK-LOCKED`. Fixture with `locked: true` base + conflicting severity-weakening override proves lock retains `critical`.
- [ ] `overrides` patch limited to `severity/remediation/enabled/locked` (no body rewrite); unknown `ruleId` in `overrides` emits `POL-PACK-UNKNOWN-OVERRIDE` without crash.
- [ ] Size/complexity limits: `maxRules 200` (`POL-PACK-LIMIT-RULES`), `maxPatternLen 500` (`POL-PACK-LIMIT-PATTERN`), `maxFileBytes 512KB` (`POL-PACK-LIMIT-BYTES`), `maxDepth 20` (`POL-PACK-LIMIT-DEPTH`) each refuse the offending pack with diagnostic and allow remaining packs to evaluate.
- [ ] ReDoS guard: `match` with catastrophic backtracking (e.g., `(a+)+b` over `"a".repeat(10_000)`) is rejected at load with `POL-PACK-REDOS`; normal regex `AKIA[0-9A-Z]{16}` loads and evaluates without guard firing.
- [ ] Types `presence|absence|pattern|config|dependency|instruction` each covered by a fixture that triggers exactly one finding: `presence` absence of `README.md` → finding at `"."`; `absence` match of `temp/*.tmp` → finding per file; `pattern` `match` over `src/**` → finding at line/column with redacted evidence; `config` dotted path mismatch → finding at `ackit.yml:1`; `dependency` missing `zod` → finding at `package.json:1`; `instruction` graph predicate → finding at `AGENTS.md:1`.
- [ ] `glob` and `scope` AND-filter works: rule `{ glob: "**/*.md", scope: ["docs/**"] }` matches `docs/readme.md` but not `src/readme.md` (integration temp repo proof).
- [ ] Evaluation `evaluateRulePacks(effectivePacks, repoFiles, config, instructionGraph)` is pure, bounded, offline, `AbortSignal`-aware (aborted mid-pack → returns partial findings + `POL-PACK-ABORTED` diagnostic within 200ms).
- [ ] Findings reuse scanner `Finding` schema (strict `FindingSchema.safeParse` passes), carry `fingerprint = sha256(packId|canonicalRuleId|relativePath|line|message)`, deterministic across win32/posix, and integrate into SARIF/JSON (`sarif.build` includes pack `ruleId`s). `Finding.evidence` is redacted (no raw secret).
- [ ] `ackit policy check --json` reports `effectivePacks: [{ packId, namespace, version, digest, ruleCount, chain }]` + `diagnostics: [{ code: "POL-..." }]`. `ackit diagnostics --json` includes `packs` summary. Machine stdout pure JSON (diagnostics on stderr).
- [ ] `scan --ci --threshold high` fails (`exit 1`) when a pack produces a `high` finding; passes when pack severity is `low` and threshold is `high`. Baseline compare includes pack fingerprints (machine-path independent).
- [ ] `pnpm lint` + `pnpm format:check` + `pnpm typecheck` green; no `fetch`/`eval`/`Function`/`child_process.exec` path in `src/core/policy/packs/**` (grep-gate proof).

## Tests

- **contract** — `tests/contract/rule-pack-schema/rule-pack-schema.test.ts`: valid minimal pack validates; oversize `rules: 201` rejected; `match: "a".repeat(501)` rejected; snapshot of `schemas/rule-pack.schema.json` stable. `tests/contract/api-surface/api-surface.test.ts` extended to allow `evaluateRulePacks`/`loadRulePacks` exports via `src/index.ts` (frozen allowlist update with ADR note).
- **unit** — `src/core/policy/packs/types.test.ts` (Zod schema: `packId` kebab, `namespace` DNS, semver, unique `rule.id`, `pattern` requires `glob`). `src/core/policy/packs/compose.test.ts` (deterministic DFS, `locked` retain, collision last-wins, overrides patch). `src/core/policy/packs/evaluate.test.ts` (one test per `RuleType` over in-memory `repoFiles`/`config`/`InstructionGraph`).
- **integration** — `tests/integration/rule-packs.test.ts` over temp real-fs repos (use `os.tmpdir()` + `mkdtemp`, POSIX normalization):
  - 2-pack collision fixture (`packA.yml` + `packB.yml` same `namespace:packId:slug` with different severity) → effective rule severity == packB's + diagnostic `POL-PACK-COLLISION`.
  - `locked: true` fixture → weakening override emits `POL-PACK-LOCKED` and retains original severity.
  - `presence` absence fixture → exactly 1 finding at `"."` with `ruleId: "acme:acme-security-baseline:readme-required"`.
  - `pattern` fixture + `scope` AND-filter fixture → correct per-file/line count.
  - `config`/`dependency`/`instruction` fixtures → each produces exactly 1 finding at expected `relativePath`.
  - Outside-root escape (`policy.rulePacks: ["../evil.yml"]` and symlink escape) → `FS-PATH-ESCAPES-ROOT`.
  - Package-distributed pack `npm:fixture-pack/ackit-packs/baseline.yml` installed in temp `node_modules` → loads; missing package → `POL-OFFLINE-BLOCKED`; URL entry → `POL-NETWORK-REFUSED`.
  - Size limits: 201-rule pack → `POL-PACK-LIMIT-RULES`; 501-char pattern → `POL-PACK-LIMIT-PATTERN`; 513KB file → `POL-PACK-LIMIT-BYTES`; depth 21 YAML → `POL-PACK-LIMIT-DEPTH`.
  - ReDoS catastrophic pattern → `POL-PACK-REDOS`.
- **security** — `tests/security/v020-rule-packs.test.ts`: traversal fixture, ReDoS sentinel, YAML limits, `fetch` absent grep, secret redaction in pack findings (`ACKIT001` shape in pattern match → `Finding.evidence === "[REDACTED]"`), `glob` URL-shape refusal.
- **cli-smoke** — `pnpm smoke:cli` + `node dist/cli/index.js policy check --json` + `node dist/cli/index.js scan --json` over pack fixture; `node dist/cli/index.js diagnostics --json` includes pack summary.
- **e2e** — tarball consumer `tests/e2e/pack-consumer.test.ts` (or `scripts/package-smoke.mjs` leg): `pnpm pack` → temp install → `import { loadRulePacks, evaluateRulePacks } from "@cynrath/agent-context-kit"` smoke (no `process.exit`).
- **perf** — `benchmarks/run.mjs` class `large-rule-pack` (100 rules) metrics `packLoadMs` + `packEvalMs` recorded; `check-thresholds.mjs` multiplier gate.
- **cross-platform** — Windows drive/space/Unicode/mixed EOL path normalization; `toPosix` stable fingerprint across win32/posix.
- **determinism** — same repo+config+engine ⇒ identical `Finding[]` order, JSON, fingerprints, `EffectiveRulePack.digest` (snapshot).

## Documentation

- Create `docs/guides/rule-packs.md` — pack authoring guide: format table, six `type` semantics with YAML snippets (presence, pattern + scope, config, dependency, instruction), `composition.extends` vs `ackit.yml` `policy.rulePacks`, package-distributed pack instructions (`pnpm add acme-pack` offline), namespace/ID conventions, overrides/locked/collision behavior with example, limits/ReDoS table, CI gating example, troubleshooting diagnostics table (`POL-PACK-*` → cause → remediation), link to live example fixture `examples/rule-pack-demo/`.
- Update `docs/architecture/overview.md` — policy engine section adds pack composition diagram (DFS → rules → overrides → digest → findings).
- Update `docs/security/THREAT_MODEL.md` — delta § "T6 Plugin boundary / Rule packs": traversal/ReDoS/size-limit/network-refusal threat matrix + mitigations.
- Update `docs/reference/cli.md` — `ackit policy check` / `ackit diagnostics` pack fields, `scan --threshold` counts pack findings.
- Update `docs/reference/sdk.md` — SDK surface `loadRulePacks`/`evaluateRulePacks` (after TASK-0013 allowlist extension) with ESM example.
- Example fixture `examples/rule-pack-demo/{ pack.yml, README.md, README.pack-demo.md }` — minimal demo pack (2 rules: presence + pattern) that `ackit scan --json` counts as 2 findings matching fingerprints deterministically (used by docs guide self-check).
- `CHANGELOG.md` — entry under `0.2.0 — Added: declarative rule packs`.

## Evidence

Record artifact paths + command outputs (all tasks must be evidence-based per GOV-012):

- `pnpm typecheck` + `pnpm lint` + `pnpm format:check` — green logs.
- `pnpm test` — pass counts: `tests/contract/rule-pack-schema` (snapshot), `src/core/policy/packs/*` unit, `tests/integration/rule-packs` (collision + locked + 6-type fixtures + limits + ReDoS + scope), `tests/security/v020-rule-packs` (traversal + ReDoS + limits + secret redaction).
- `pnpm build` — `dist/core/policy/packs/*.js` contains `loadRulePacks` + `evaluateRulePacks` (frozen allowlist leg), `schemas/rule-pack.schema.json` emitted to `dist/schemas/` (if applicable).
- `grep -R "fetch(|eval(|child_process.exec" src/core/policy/packs` — 0 hits (proof logged).
- `node dist/cli/index.js policy check --json` over demo fixture — `effectivePacks[0].digest` + `diagnostics` snapshot.
- `node dist/cli/index.js scan --json` over pack demo fixture — findings count == 2, fingerprints stable (hash printed), `--ci --threshold high` exit 1 proof.
- `node dist/cli/index.js diagnostics --json` — pack summary present.
- `pnpm gen:schemas` diff — `schemas/rule-pack.schema.json` + updated `schemas/ackit.schema.json` (`policy.rulePacks`).
- Benchmark run `node benchmarks/run.mjs --classes large-rule-pack --out /tmp/pack-bench.json` — `packLoadMs` + `packEvalMs` within `thresholds.json` multiplier.
- Before/after `grep -R "from.*src/core"` restricted excludes `src/index.ts` — still 0 (SDK reuse per TASK-0013).

## Completion gate

No `--force`. Dependencies `TASK-0013` must be `completed` before start (SDK frozen surface must exist to extend with pack exports). Task is not `completed` until:

- All Acceptance criteria checked with evidence recorded in Completion notes (command output + hash).
- `task doctor` clean (no cycle, deps satisfied, REQ ↔ task cross-ref unmapped = 0).
- Contract snapshot `schemas/rule-pack.schema.json` validated and committed; `pnpm gen:schemas` diff clean.
- No `fetch`/`eval`/`vm`/`child_process.exec` path in pack code (grep-gate proof attached).
- Next tasks `TASK-0009` (`optimize` v2, consumes packs) and `TASK-0014` (GitHub Action, packs participate in CI) remain blocked until this gate passes (see `docs/v0.2.0/EXECUTION_PLAN.md`).

Rollback: focused commit revert (`git revert <pack-merge-sha>`) restores previous `main` policy path (no data migration — packs are additive files). Packs already committed under `examples/rule-pack-demo/` are inert without `policy.rulePacks` entry so revert is non-destructive.

## Requirement IDs

REQ-V020-E-001, REQ-V020-E-002, REQ-V020-E-003, REQ-V020-GOV-001, REQ-V020-GOV-003, REQ-V020-GOV-007

## Risks

- **ReDoS / catastrophic regex** — mitigated by 500-char limit, 50ms sentinel, per-line evaluation; risk is guard false-negative on polyglot engine differences — tested with `"(a+)+b"` sentinel and CI matrix on 22+24.
- **YAML depth/billion-laughs** — mitigated by 512KB + depth 20 caps; parser configured without anchors expansion.
- **ID collision confusion** — mitigated by `POL-PACK-COLLISION` diagnostic and sorted deterministic merge; docs emphasize `namespace:packId:slug` canonical form.
- **Offline distribution friction** — package-distributed packs require pre-install; docs must make `pnpm add` step explicit to avoid `POL-OFFLINE-BLOCKED` surprise.

## Rollback plan

Focused commit revert as above. No DB, no migration. Remove `policy.rulePacks` entries from `ackit.yml` to disable packs instantly without code change.

## Completion notes

(placeholder — executor fills with evidence paths, pass counts, digests, and traceability re-check output)
