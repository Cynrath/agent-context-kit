# ADR-0018: Declarative Rule Packs / Policy Packs — Format & Security Boundary

Status: Accepted · Date: 2026-08-27

## Context

EPIC E needs safe extensibility without arbitrary JS execution (REQ-V020-GOV-007). The existing policy engine (ADR-0011, `src/core/policy/{types,resolve,apply}.ts`) already supports local declarative policy with `extends` (DFS), locked rules, scoped suppressions, and digest — but it is rule-id–centric (ACKITxxx overrides) and does not support full pack-level composition, glob/scope matching for generic presence/pattern rules, or package-distributed packs. Rule packs must be pack-authorable without code.

## Decision

1. **Format (REQ-V020-E-001)**:
   - Schema: `schemas/rule-pack.schema.json` v1 validated via `zod` (strict). Top-level:
     ```ts
     { schemaVersion: 1
     , packId: string            // kebab-case, namespaced e.g. "acme-security-baseline"
     , namespace: string         // DNS-like or org prefix
     , version: string           // semver, informational
     , displayName?: string
     , severity: "low"|"medium"|"high"|"critical" // default pack severity
     , rules: RuleV1[]           // 1..200 entries
     , overrides?: { ruleId: Patch }  // limited severity/remediation patch, no body rewrite
     , composition?: { extends: string[] } // local refs, resolved offline
     }
     RuleV1 = PresenceRule | AbsenceRule | ContentPatternRule | ConfigAssertion | DependencyAssertion | InstructionAssertion
       { id: `ACKIT\\d{3}`-compatible or `${packId}:${slug}` (namespaced id, stable)
       , type: "presence"|"absence"|"pattern"|"config"|"dependency"|"instruction"
       , glob?: string           // picomatch, optional
       , scope?: string[]        // path globs limiting evaluation
       , match?: string          // regex source (ECMAScript, bounded length 500)
       , message: string         // human remediation
       , severity?: Severity
       , remediation?: string
       }
     ```
   - Size/complexity limits enforced at parse: maxRules 200, maxPatternLen 500, maxFileBytes 512KB, maxDepth 20 (YAML/JSON). Exceeding emits `POL-PACK-LIMIT-*` and refuses to load.
   - `pattern` rules compile with timeout guard (ReDoS defense): if regex outstrips 50ms / 10k steps on a sentinel fixture, it is rejected (`POL-PACK-REDOS`).

2. **Loading & composition (REQ-V020-E-002)**:
   - **Local/repo only**: `ackit.yml` key `policy.rulePacks: ["./packs/acme.yml", "./acme-pack.json"]` — paths repo-relative, validated through the fs containment engine (normalize→realpath→inside-root). Outside-root denied (`FS-PATH-ESCAPES-ROOT`).
   - **Package-distributed packs**: allowed ONLY from already-installed npm packages in `node_modules/<pkg>/ackit-packs/*` (offline). No `https://` fetch, no `extends: "url"` (refused with `POL-NETWORK-REFUSED`). External packages require a pre-install step (`pnpm install`), keeping the product offline by construction (REQ-V020-GOV-001).
   - **Namespaces/IDs**: stable namespaced ids `namespace:packId:ruleSlug` (alias `packId:slug`); global `ACKITxxx` ids remain singletons and cannot be redefined by packs (diagnostic `POL-PACK-COLLISION`); pack-vs-pack same namespaced id → last `extends` wins deterministically (sorted) unless `locked: true` on the winner's `overrides`.
   - **Composition**: deterministic DFS over `extends` (local files/packages), then top-level `rules`, then `overrides`. Merge is pure and produces an `EffectiveRulePack` with `digest` (sha256 of canonical JSON).

3. **Evaluation (REQ-V020-E-003)**:
   - Evaluator `evaluateRulePacks(effectivePacks, repoFiles, config, instructionGraph) → Finding[]` is pure, offline, bounded. Types: presence (glob must match ≥1 file), absence (must not), pattern/content (file glob + regex against content lines), config (zod-like path `scan.exclude` assertions), dependency (presence in `package.json` deps), instruction (graph node count/property assertions).
   - Pack findings reuse `Finding` schema (`ruleId`, `fingerprint`, `severity`, `evidence` redacted) so SARIF/JSON/pack manifest pipelines are uniform. Findings fingerprint is hash of `(packId, ruleId, relativePath, line? || message)`, deterministic.
   - CI behavior: pack findings count toward `scan --ci --threshold` and `--fail-below` gates.

4. **Security boundary** (hard gate):
   - **No exec**: packs never evaluate JS/expressions/shell; patterns are regex only, bounded.
   - **No network**: any URL-shaped `extends`/`glob` is refused.
   - **No traversal**: pack `glob`/`include` paths validated, outside-root prohibited.
   - **Digest pinning** (optional P2): `ackit.yml` may list `policy.rulePacks[*].digest` and pack load fails if digest mismatch (supply-chain pin, not required for v0.2.0 gate but spec leaves the field).
   - **Validation**: `ackit policy check --json` reports effective packs+digest+diagnostics; `ackit diagnostics` reports pack status.

## Rationale

Declarative packs cover audits/policies without opening executable plugin surface (T15/MCP plugin threat). Strict schemas, bounded regex, offline loading, and reuse of the existing finding pipeline keep the product small, deterministic, and security-reviewable.

## Alternatives considered

- JS plugin system (`ackit.plugins: ["./plugin.js"]`): rejected — violates REQ-V020-GOV-007; would require sandboxing, provenance, and is out-of-scope.
- Rego/OPA: rejected — too heavy, extra dependency; our DSL is narrower (file-presence/pattern/config/instruction), implementable via existing `picomatch`/`zod` primitives.
- Remote pack registry auto-fetch: rejected — conflicts with offline-first; reserved for explicit future ADR.

## Consequences

- New modules: `src/core/policy/packs/{types,load,compose,evaluate}.ts` (or `src/core/rule-packs/`); scanner wiring in `executeConfiguredScan` merges builtin rules + effective packs.
- New schemas `schemas/rule-pack.schema.json` + `schemas/policy.v2.schema.json` (policy add `rulePacks` field). `pnpm gen:schemas` updated.
- Documentation `docs/guides/rule-packs.md` + `THREAT_MODEL.md` delta.

## Related requirements

REQ-V020-E-001..003, REQ-V020-GOV-001/003/007.

## References

- `src/core/policy/types.ts` (existing PolicyDocumentSchema)
- `docs/security/THREAT_MODEL.md` (T6 plugin boundary)
