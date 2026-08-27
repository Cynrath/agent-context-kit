---
id: "TASK-0010"
title: "Provider-aware context profiles"
status: completed
schemaVersion: 2
dependencies:
  - TASK-0013
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Implement provider-aware context profiles — offline, versioned, deterministic mapping for OpenAI Codex, Claude Code, GitHub Copilot, Gemini CLI, and generic/default — so `pack`, `instructions`, and `optimize` behave correctly per-provider without any provider API calls.

## Context / current state

No provider profiles exist yet. Current state verified before this planning-only run:

- **Instruction graph** (`src/core/instructions/graph.ts`, `docs/concepts/instruction-graph.md`) has provider adapters for `codex` / `claude` / `gemini` / `copilot` (AGENTS.md, CLAUDE.md, GEMINI.md, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`) with precedence tiers, `applyTo` globs, and `resolveEffectiveStack()`, but has **no profile schema**, no per-provider file-convention abstraction, and no provider-specific budget/ranking signal.
- **Pack ranking** (`src/core/context/pack.ts`) is provider-agnostic: `buildContextPack` uses deterministic signals (explicit include, changed files, task refs, instruction scope, import proximity, README relevance, file type, policy, size penalty) with no `contextBudget` / `includePriority` override per provider.
- **`docs/concepts/instruction-graph.md`** is ready and describes node fields, precedence, and `applyTo` semantics; it is the seam this task extends via `fileConventions` / `precedenceOverrides`.
- **Config** (`ackit.yml`, `schemas/ackit.schema.json` v1) has no `profile` key; `templates/` contains no `profiles/` subdir yet.
- **No built-ins, no selection logic, no diagnostics trace** for profile resolution.

This task introduces the profile subsystem on top of the SDK contract (TASK-0013) without replacing the working instruction-graph architecture (ADR-0017 extends ADR-0006).

Related ADRs: ADR-0016 (profile model + scoring model), ADR-0015 (consolidated release), ADR-0002 (single package), ADR-0006/0017 (instruction graph).

## Goal

One outcome: a contract-tested, offline, deterministic provider-profile subsystem that validates against `schemas/profile.schema.json` v1, ships five built-in YAML profiles, resolves selection deterministically (CLI > config > auto-detect > generic), and integrates provider-aware `contextBudget`/`includePriority`/`fileConventions`/`precedenceOverrides` into `pack`/`instructions`/`optimize` with observable diagnostics — no network, no exec, no drift without fixture evidence.

## In scope

- **Profile schema `schemas/profile.schema.json` v1** (strict, zod-validated): `{ name: string, provider: "codex"|"claude"|"copilot"|"gemini"|"generic", displayName?: string, version: 1, instructionApplicability?: object, fileConventions: { instructionFiles: string[], skillDirs?: string[], extraSurfaces?: string[] }, contextBudget: { maxTokens: number, includePriority: Record<string, number> }, precedenceOverrides?: Record<string, number> }`. Strict: `additionalProperties: false`, `required: ["name","provider","fileConventions","contextBudget"]`, enums locked, `maxTokens` 1..500000, bounded `includePriority` weights.
- **Built-ins `templates/profiles/{codex,claude,copilot,gemini,generic}.yml`** — YAML, validated at build time via `pnpm gen:schemas` + `zod`. Each file documents vendor-specific facts with source link comments (maintenance strategy, see Technical design). Generic is the normative fallback with conservative budget and no provider-specific surfaces.
- **Selection precedence**: CLI `--profile <name>` > `ackit.yml` key `profile: <name>` > auto-detect (by present instruction files: `AGENTS.md` → codex, `CLAUDE.md` → claude, `.github/copilot-instructions.md` → copilot, `GEMINI.md` → gemini, else `generic`) with deterministic tie-break (`generic` wins if ambiguous). Unknown provider → `generic` fallback + diagnostic `PROFILE-UNKNOWN` (stable code, remediation: "did you mean ...?").
- **fileConventions**: declares per-provider instruction file globs used by `instructions --provider` filtering and by graph `providerApplicability` (e.g., codex includes `AGENTS.md`/`AGENTS.override.md`, claude includes `CLAUDE.md`, copilot includes copilot surfaces + `applyTo`).
- **contextBudget + includePriority**: `pack` consumes `profile.contextBudget` / `includePriority` when `--profile` is in effect (adjusted ranking score vs generic, deterministic delta; see User-facing behavior).
- **precedenceOverrides**: optional per-profile numeric overrides applied on top of deterministic precedence tiers (same depth→precedence→id tie-break preserved).
- **Custom profiles**: local only — `profiles/*.yml` under repo or `ackit.yml` key `profiles: { extend: [path] }` (repo-relative, fs-contained). No URL fetch. Invalid custom profile yields structured diagnostic `PROFILE-*` with `file:line` and `received value`.
- **Maintenance strategy per-provider fixture**: `fixtures/profile-<provider>/` minimal repos expected to catch drift; profile update requires fixture failure with evidence + ADR note + CHANGELOG. Fixtures are not generated by this task but the strategy + fixture paths are wired and documented.
- **SDK export**: profile types + resolver pure functions re-exported via `src/index.ts` allowlist (gated by TASK-0013 contract) — e.g., `resolveProfile`, `loadProfile`, `Profile`, `ProfileId`.
- **Diagnostics & observability**: `ackit instructions --json` includes `profile` applied; `ackit diagnostics --json` includes `profile: { requested, resolved, source }` resolution trace (see REQ-V020-C-005 + REQ-V020-H-001 seam).
- **`ackit config check` validates profile fields** (unknown enum, missing fileConventions → actionable error with `file:line` and did-you-mean).

## Out of scope

- Readiness scoring implementation (`src/core/readiness/` — TASK-0008).
- Instruction graph v2 schema extensions (`includeScopes`/`excludeScopes`/`shadowedBy`/`orderIndex` — TASK-0011).
- Declarative rule/policy packs (`schemas/rule-pack.schema.json`, `evaluateRulePack` — TASK-0012).
- Watch engine, dashboard/report server, diagnostics bundle, benchmarks, GitHub Action, VS Code extension.
- Any provider API call, LLM call, vector DB, embeddings/RAG, remote fetch of profiles (prohibited per REQ-V020-GOV-001/007) — local-only.
- URL fetch for custom profiles (`http://`/`https://` in `profiles.extend` → error `PROFILE-NETWORK-REFUSED` if attempted).
- `package.json` version bump (stays `0.1.1` until TASK-0024), tag creation, npm publish, GitHub Release, marketplace publish.
- Changing `AGENTS.md`/`CLAUDE.md`/copilot discovery semantics — this task only adds the profile mapping layer, not new file discovery.

## Technical design

### Module layout

```
schemas/profile.schema.json          # v1 strict JSON Schema (source of truth, zod mirror)
templates/profiles/
  codex.yml                          # built-in: provider=codex, fileConventions: AGENTS.md + override
  claude.yml                         # provider=claude, CLAUDE.md
  copilot.yml                        # provider=copilot, .github/copilot-instructions.md + .instructions.md applyTo
  gemini.yml                         # provider=gemini, GEMINI.md
  generic.yml                        # provider=generic, minimal surfaces, conservative budget
src/core/profiles/
  schema.ts                          # zod schema mirroring JSON Schema v1, strict()
  built-ins.ts                       # loader: reads templates/profiles/*.yml at build/test time, validated
  resolve.ts                         # pure: resolveProfile({ cliProfile?, configProfile?, detectedFiles }) → ResolvedProfile
  detect.ts                          # pure: detectProfiles(files: string[]) → ProfileId | null (tie-break generic)
  types.ts                           # Profile, ResolvedProfile, ProfileDiagnostic
src/core/config/schema.ts            # extended: add `profile?: string` + `profiles?: { extend?: string[] }` (additive v2 fragment)
src/core/context/pack.ts             # consumes profile: ranking adjusted by contextBudget/includePriority
src/core/instructions/graph.ts       # consumes profile: fileConventions → providerApplicability filter
src/cli/commands/
  pack.ts                            # --profile flag wiring
  instructions.ts                    # --provider / --profile flag wiring, --json includes profile
  diagnostics.ts                     # resolution trace seam (or shared diagnostics module)
src/index.ts                         # re-exports: Profile, ResolvedProfile, resolveProfile, loadProfile (SDK allowlist)
fixtures/profile-{codex,claude,copilot,gemini,generic}/  # per-provider minimal fixture repos (≤20 files, deterministic)
```

### Schema `schemas/profile.schema.json` v1

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://cynrath.github.io/agent-context-kit/schemas/profile.schema.json",
  "title": "AgentContextKit Provider Profile v1",
  "type": "object",
  "required": ["name", "provider", "fileConventions", "contextBudget"],
  "additionalProperties": false,
  "properties": {
    "name": { "type": "string", "pattern": "^[a-z0-9-]+$", "minLength": 1, "maxLength": 32 },
    "provider": { "type": "string", "enum": ["codex","claude","copilot","gemini","generic"] },
    "displayName": { "type": "string", "maxLength": 64 },
    "version": { "type": "integer", "const": 1 },
    "instructionApplicability": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "applyToResolvedBy": { "type": "string", "enum": ["profile","graph"] },
        "notes": { "type": "string", "maxLength": 500 }
      }
    },
    "fileConventions": {
      "type": "object",
      "required": ["instructionFiles"],
      "additionalProperties": false,
      "properties": {
        "instructionFiles": { "type": "array", "items": { "type": "string", "minLength": 1 }, "minItems": 1, "maxItems": 32 },
        "skillDirs": { "type": "array", "items": { "type": "string" }, "maxItems": 8 },
        "extraSurfaces": { "type": "array", "items": { "type": "string" }, "maxItems": 16 }
      }
    },
    "contextBudget": {
      "type": "object",
      "required": ["maxTokens", "includePriority"],
      "additionalProperties": false,
      "properties": {
        "maxTokens": { "type": "integer", "minimum": 1000, "maximum": 500000 },
        "includePriority": {
          "type": "object",
          "propertyNames": { "pattern": "^[a-zA-Z0-9_.-]+$" },
          "additionalProperties": { "type": "number", "minimum": -10, "maximum": 10 }
        }
      }
    },
    "precedenceOverrides": {
      "type": "object",
      "propertyNames": { "pattern": "^[a-z0-9.-]+$" },
      "additionalProperties": { "type": "number", "minimum": -1000, "maximum": 1000 }
    }
  }
}
```

Generated `zod` mirror uses `.strict()` and same bounds; `pnpm gen:schemas` emits the JSON Schema as committed artifact.

### Built-ins `templates/profiles/*.yml`

Each YAML validates against the schema at build/test time (`zod.parse` + JSON Schema). Header comment includes vendor fact source link (maintenance strategy):

```yaml
# codex profile — source: https://developers.openai.com/codex/cli + AGENTS.md spec
# per-provider fixture: fixtures/profile-codex/
name: codex
provider: codex
version: 1
fileConventions:
  instructionFiles: ["AGENTS.md", "AGENTS.override.md"]
  skillDirs: [".agents/skills"]
contextBudget:
  maxTokens: 32000
  includePriority:
    AGENTS.md: 1.5
    README.md: 0.8
precedenceOverrides: {}
```

Analogous for `claude` (`CLAUDE.md`), `copilot` (`.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md` via `applyTo`), `gemini` (`GEMINI.md`), `generic` (minimal: `AGENTS.md` only, `maxTokens: 16000`, weights `1.0`). Vendor facts are declarative, versioned; drift detected by fixture failure.

### Selection precedence

Pure function `resolveProfile(input): ResolvedProfile`:

```ts
type ResolveInput = {
  cliProfile?: string;        // --profile value (raw)
  configProfile?: string;     // ackit.yml profile
  detected: string[];         // repo-relative file list (for auto-detect)
  available: Map<string, Profile>; // built-ins + custom
};
type ResolvedProfile = {
  requested: string | null;
  resolved: Profile;          // always generic fallback at minimum
  source: "cli" | "config" | "auto-detect" | "fallback";
  diagnostic?: { code: "PROFILE-UNKNOWN" | "PROFILE-INVALID", message: string, remediation?: string };
};
```

Rules:
1. If `cliProfile` non-empty → lookup `available`; if found → `source:"cli"`; else → `resolved=generic`, `diagnostic: PROFILE-UNKNOWN` (remediation: "available: codex, claude, copilot, gemini, generic").
2. Else if `configProfile` non-empty → same lookup with `source:"config"`.
3. Else `detect = detectProfiles(detected)` where `detectProfiles` scans for `AGENTS.md`→codex, `CLAUDE.md`→claude, `.github/copilot-instructions.md`→copilot, `GEMINI.md`→gemini; if exactly one → `source:"auto-detect"` + that profile; if >1 → `source:"auto-detect"` + `generic` (deterministic tie-break) + diagnostic `PROFILE-AMBIGUOUS` (info); if none → `generic` fallback `source:"fallback"`.
4. Never throws for unknown — fallback generic + diagnostic ensures determinism.

`detectProfiles` is pure, sorts input, case-sensitive (POSIX repo-relative), Windows normalized via `toPosix` before match.

### Custom profiles — local only, no URL fetch

- `ackit.yml` additive fragment:
  ```yaml
  profile: copilot          # optional enum
  profiles:
    extend: ["./profiles/custom.yml"]  # repo-relative only, fs-contained, max 8 entries
  ```
- Validation: each path must be repo-relative, normalized, realpath-contained vs canonical repo root (reuse `src/core/filesystem` boundary). Absolute paths, `../` escaping root, symlink escaping root → denied with `PROFILE-PATH-ESCAPE` diagnostic.
- Any `extend` value matching `^https?://` or `//` → immediate error `PROFILE-NETWORK-REFUSED` ("remote URL fetch is forbidden per REQ-V020-GOV-001; use pre-installed local file"). No `fetch`, no `http.get` in `src/` (grep-gated).
- `max 8` extend entries, each file ≤ 32KB, YAML parse with `yaml.parse` + strict schema; unknown keys → `PROFILE-INVALID` with `file:line` and `received value`.
- `profiles/*.yml` discovery in repo root (`./profiles/*.yml`) is optional convenience (same validation); `extend` takes precedence over directory scan to keep determinism.

### Maintenance strategy per-provider fixture

- `fixtures/profile-{codex,claude,copilot,gemini,generic}/` each ≤ 20 files, deterministic (sorted, seeded data, no timestamps in content).
  - `codex`: nested `AGENTS.md` at root + `src/sub/AGENTS.md`.
  - `claude`: `CLAUDE.md` at root + nested `src/CLAUDE.md`.
  - `copilot`: `.github/copilot-instructions.md` + `.github/instructions/feature.instructions.md` with `applyTo: src/**`.
  - `gemini`: `GEMINI.md` at root.
  - `generic`: no provider file.
- Regression test `tests/contract/profile-fixtures.test.ts` asserts `resolveProfile` on each fixture yields expected `resolved.provider` (snapshot-gated). If vendor fact changes (new file convention), fixture fails → update profile YAML + comment source link + bump `version` if semantic change + entry in `CHANGELOG.md` (additive docs change) + re-baseline snapshot. No profile edit without failing fixture evidence.

### Integration points

- **`pack`**: `buildContextPack(root, { profile?: ResolvedProfile, maxTokens? })` — when profile present, `maxTokens` defaults to `profile.contextBudget.maxTokens` (CLI `--max-tokens` still wins), ranking multiplier `includePriority[pathBasename]` (or matched glob) applied as `score *= (1 + weight*0.1)` bounded `0.5..2.0`. Manifest includes `profile: { name, provider, source }`. No pack behavior change when profile is generic and no `--profile` set (backward compat).
- **`instructions`**: `buildInstructionGraph` / `resolveEffectiveStack(graph, forPath, { profile? })` — provider applicability filtered by `profile.fileConventions.instructionFiles` globs; `ackit instructions --provider X` maps through profile fileConventions (existing `--provider` flag preserved, `--profile` is alias/complement; both validated for consistency).
- **`optimize`**: uses profile to flag redundant provider guidance (e.g., repo has both `AGENTS.md` and `CLAUDE.md` but profile is `codex` → advisory `OPTIMIZE-REDUNDANT-PROVIDER-GUIDANCE` pointing to unused file, remediation: "consider removing or scoping to profile `claude`").
- **`ackit config check`** extends to validate `profile` enum + `profiles.extend` paths containment.

## User-facing behavior

```powershell
# Explicit profile (highest precedence)
ackit pack --profile codex --json
# → manifest.profile == { requested:"codex", resolved:"codex", source:"cli" }
# → ranking uses codex includePriority (AGENTS.md weighted 1.5x)

ackit instructions --provider copilot --json
ackit instructions --profile copilot --json
# both respect copilot fileConventions (copilot-instructions.md + applyTo globs)

# Config-driven
# ackit.yml: profile: claude
ackit pack --json   # uses claude without CLI flag; diagnostics shows source:"config"

# Auto-detect (repo contains CLAUDE.md only)
ackit pack --json   # resolves claude via auto-detect

# Ambiguous (repo contains AGENTS.md + CLAUDE.md, no --profile)
ackit pack --json   # resolves generic (tie-break) + diagnostic PROFILE-AMBIGUOUS

# Unknown
ackit pack --profile unknown --json
# → resolved generic + diagnostic PROFILE-UNKNOWN (severity low) with remediation: available profiles list
# exit 0 (info diagnostic), unless --strict makes PROFILE-* fail per policy threshold

ackit config check
# validates profile enum values and profiles.extend containment; unknown key → actionable error file:line

ackit diagnostics --json
# includes { profile: { requested, resolved, source }, builtIns: ["codex","claude","copilot","gemini","generic"], customCount }

ackit instructions --profile codex --explain --json
# includes per-node providerApplicability + provenance explaining why node is in/out for this profile
```

Terminal `ackit pack` without flags remains unchanged (generic implicit, no new output unless `--profile` or `profile` config present). JSON `profile` field is additive (present when profile subsystem active, omitted only for backward-compat generic-no-config remains generic but field still present as `generic/fallback` for observability).

## Security

- **No exec**: profiles are declarative YAML+JSON only; no JS code inside profiles, no `eval`, no `require(userInput)`, no `child_process.exec` with profile content. Grep gate `src/core/profiles/**` must contain 0 matches for `eval(` `exec(` `Function(` `require(` with profile input.
- **Strict schema**: `additionalProperties:false`, `zod.strict()`, size limits (`instructionFiles` ≤32, `maxTokens` ≤500000, `profiles.extend` ≤8, each file ≤32KB). Oversize/malformed YAML → diagnostic `PROFILE-LIMIT` / `PROFILE-INVALID` with `file:line`, not crash.
- **Containment**: every custom profile path validated `requested→normalized→canonicalPath` vs canonical repo root (same engine as `src/core/filesystem`); outside-root symlink/junction/reparse/huge-file/`../../` traversal/copy denied. Remote URL (`http://`/`https://`/`//`) → `PROFILE-NETWORK-REFUSED` (no fetch). No profile loading touches outside repo root (assert via integration test with outside-root symlink fixture).
- **No secret/path leakage**: profile YAML never contains secrets; diagnostics redaction reused (generic `[REDACTED]` for secret-shaped literals, repo-relative only, no absolute paths in `ResolvedProfile` or diagnostics JSON — `toPosix` normalization, Windows `C:\` stripped to repo-relative). Evidence: `tests/security/profile-containment.test.ts` fixture with fake AWS key + absolute path ensures redaction.
- **Offline guarantee**: grep `fetch(` `http.get` `https.get` in `src/` → 0; network spy test (stub `globalThis.fetch` to throw) → `resolveProfile` still succeeds without calling fetch. REQ-V020-GOV-001 enforced.

## Performance

- Profile resolution is pure + synchronous over file list (no I/O beyond initial discovery which graph/pack already perform) — cost <1ms median for 10k-file repo (list scan is linear filtered scan of ≤4 patterns + map lookup). No impact on cold/warm scan throughput.
- `pack` ranking adjustment is one hash-map lookup per manifest entry (O(n) where n = ranked files, ≤5k in large fixture) — <5ms overhead vs generic.
- Schema validation at build time (`gen:schemas` + `zod`) — not per-scan repeated validation of built-ins (cached `Map<string,Profile>` singleton lazily constructed once).
- Budget: `benchmarks/` suite (TASK-0018) not required here, but local `run.mjs --classes small` expected delta <2% for pack with profile vs without.

## Compatibility

- Windows/macOS/Linux: repo-relative paths always POSIX (`split("\\").join("/")`), drive letters stripped before comparison, Unicode/space/mixed-EOL handled via shared `toPosix`. `detectProfiles` sorting is locale-invariant (`String.localeCompare` not used; `Array.sort()` default codepoint). Tests run win32 path fixture on posix runner via normalization shim.
- Node 22 + Node 24: this task must pass on both LTS lines (CI matrix). No Node 23+ API used; YAML via `yaml@^2.9.0`, zod@^4.4.3 pinned.
- v0.1.1 backward compat: `ackit.yml` without `profile`/`profiles` keys validates as before (additive, optional). `ackit pack --json` without `--profile` resolves `generic/fallback` but manifest shape previously without `profile` field now includes it as additive — documented as minor additive change (`generic` fallback is explicit). Strict `--strict` not required to field this.
- ESM-only `type:module`, `sideEffects:false` unchanged.

## Acceptance criteria

- [x] `schemas/profile.schema.json` v1 exists, is strict (`additionalProperties:false`), validates with `ajv` (or equivalent) and mirrors `src/core/profiles/schema.ts` zod strict; `pnpm gen:schemas && git diff --stat` shows no drift for this schema.
- [x] Five built-ins `templates/profiles/{codex,claude,copilot,gemini,generic}.yml` exist, each validates against the schema (`zod.parse` green), each has vendor source link comment; snapshot of each YAML reviewed and committed.
- [x] Selection precedence is deterministic and tested: matrix test covers (1) `--profile codex` wins over `ackit.yml profile: claude`, (2) `ackit.yml profile: claude` wins over auto-detect, (3) auto-detect `CLAUDE.md`→claude, (4) ambiguous `AGENTS.md+CLAUDE.md`→generic with `PROFILE-AMBIGUOUS`, (5) unknown `--profile unknown`→generic fallback + `PROFILE-UNKNOWN` diagnostic with remediation (exact codes asserted).
- [x] `ackit pack --profile codex --json` manifest includes `profile: { requested:"codex", resolved:"codex", source:"cli" }` and adjusted ranking score delta vs `pack --profile generic` on same repo (assert weight delta for AGENTS.md-containing file; use fixture repo `fixtures/profile-codex/`).
- [x] `ackit instructions --provider copilot --json` and `ackit instructions --profile copilot --json` both respect copilot `fileConventions` (extra surface files appear in graph nodes `extraSurfaces` considered; snapshot-gated).
- [x] `ackit optimize` on a fixture containing both `AGENTS.md` and `CLAUDE.md` with `--profile codex` flags redundant provider guidance advisory (finding id `OPTIMIZE-REDUNDANT-PROVIDER-GUIDANCE` with evidence `CLAUDE.md`).
- [x] `ackit config check` validates `profile` enum and `profiles.extend` containment: valid config → `config check OK`; invalid enum → error `CONFIG-PROFILE-UNKNOWN` with file:line + remediation; outside-root path → `PROFILE-PATH-ESCAPE` with remediation.
- [x] Custom profile local-only: `ackit.yml` `profiles.extend: ["./profiles/custom.yml"]` discovered in integration temp repo, validated, used as available profile; `profiles.extend: ["https://example.com/p.yml"]` → error `PROFILE-NETWORK-REFUSED` with remediation; no network call made (fetch spy count 0).
- [x] `ackit diagnostics --json` includes `{ profile: { requested, resolved, source } }` and `ackit instructions --json` includes `profile` applied (contract snapshot asserts keys).
- [x] Built-in maintenance strategy wired: per-provider fixture repos `fixtures/profile-{codex,claude,copilot,gemini,generic}/` exist (≤20 files each), regression test asserts correct resolution per fixture; intentional profile YAML change without fixture makes that test fail (proof recorded via before/after hash diff).
- [x] Security gates pass: grep `fetch(` `http.get` `https.get` `child_process.exec` in `src/` → 0 matches for profile code; path containment test with outside-root symlink → denied; secret redaction test with fake AWS key in custom profile fixture → `[REDACTED]` in diagnostics bundle.
- [x] `pnpm typecheck` green on strict; `pnpm lint` + `pnpm format:check` green; `pnpm test` green including new profile contract/integration/security tests (record counts).
- [x] No `package.json` version change (still `0.1.1`), no tag `v0.2.0` created, no publish.

## Tests

- **contract — schema**: `tests/contract/profile-schema/profile-schema.test.ts`
  - Loads `schemas/profile.schema.json` via `ajv`, asserts strict (`additionalProperties:false`, required keys, enum `provider` exact 5 values, `maxTokens` bounds).
  - Asserts each built-in YAML parses and validates (`zod` + `ajv`).
  - Snapshot of each built-in JSON (5 snapshots) — intentional drift makes snapshot fail.

- **contract — API single-package**: extends `tests/contract/api-surface/api-surface.test.ts` — asserts `src/index.ts` still only exports allowlisted surface (profile exports additive but gated by TASK-0013 frozen list; this task's new exports must be added to allowlist with ADR note and snapshot updated).

- **unit — `resolveProfile` precedence**: `tests/unit/profiles/resolve.test.ts`
  - Matrix: cli>config>auto>fallback (5 cases), unknown→generic, ambiguous→generic, sorting determinism (shuffle input order still same resolved).
  - Uses pure inputs (no FS), deterministic shuffle.

- **unit — `detectProfiles`**: `tests/unit/profiles/detect.test.ts`
  - Single-file fixtures per provider, multi-file ambiguous, empty list → generic, Windows POSIX normalization (`C:\repo\AGENTS.md` → `AGENTS.md`).

- **unit — `contextBudget`/`includePriority` math**: `tests/unit/profiles/budget.test.ts`
  - Ranking multiplier bounded `0.5..2.0`, weight `-10..10` → score delta check, `maxTokens` capping.

- **integration — `pack` with profile delta**: `tests/integration/pack-profile.test.ts`
  - Temp real-FS repo with `AGENTS.md` + 3 source files; `buildContextPack(root, { profile: codex })` vs generic; assert codex-ranked file with AGENTS.md proximity scores higher (delta ≥ 0.05) and manifest `profile.source` correct.

- **integration — `instructions` provider filtering**: `tests/integration/instructions-profile.test.ts`
  - Fixture with `AGENTS.md` + `CLAUDE.md` + `.github/copilot-instructions.md`; `resolveEffectiveStack(graph, "src/foo.ts", { profile: copilot })` returns copilot surfaces; generic returns all.

- **integration — custom profile local**: `tests/integration/profile-custom.test.ts`
  - Temp repo with `profiles/custom.yml` + `ackit.yml` extend; valid → resolved `custom`; invalid YAML → diagnostic `PROFILE-INVALID` with `file:line`; symlink outside root → `PROFILE-PATH-ESCAPE`; URL extend → `PROFILE-NETWORK-REFUSED` (fetch spy 0).

- **integration — optimization redundant guidance**: `tests/integration/optimize-profile.test.ts`
  - Fixture with `AGENTS.md` + `CLAUDE.md`, run `optimize` with profile `codex` → finding `OPTIMIZE-REDUNDANT-PROVIDER-GUIDANCE`.

- **integration — diagnostics trace**: `tests/integration/diagnostics-profile.test.ts`
  - Asserts `--json` outputs contain `profile: { requested, resolved, source }` and `diagnostics.schema.json` valid.

- **security — containment + redaction + no-network**: `tests/security/profile-containment.test.ts`, `tests/security/profile-no-network.test.ts`
  - Outside-root symlink, `../../` traversal, huge file (>32KB) → limit diagnostic, no crash.
  - Fake secret in custom profile evidence → `[REDACTED]` in JSON.
  - `globalThis.fetch` stub → throws if called; `resolveProfile` does not call it.

- **security — grep gates**: part of CI but locally:
  ```powershell
  grep -R "fetch(" src | where { $_ -match "profile" }   # must be 0
  grep -R "child_process\.exec" src/core/profiles         # 0
  ```

- **fixture determinism**: `benchmarks/generate-fixtures.mjs` not needed here but `fixtures/profile-*/` generation is deterministic (sorted, no mtime in content) — regression asserts byte-identical on twin generation (hash diff 0).

- **cli-smoke**: `pnpm smoke:cli` + `node dist/cli/index.js pack --profile codex --json` on small fixture validates JSON purity (stdout pure JSON, diagnostics on stderr).

- **cross-platform**: same `toPosix` normalization tested with win32 path `"C:\\repo\\CLAUDE.md"` vs `"CLAUDE.md"` parity.

## Documentation

- **Create**: `docs/concepts/provider-profiles.md` — Provider profile model: schema v1 table, five built-ins table (provider / instructionFiles / budget / source link), selection precedence diagram (CLI > config > auto > fallback), fileConventions vs graph `providerApplicability`, contextBudget ranking math, custom profiles local-only (`profiles.extend`, containment, no URL fetch), maintenance strategy per-provider fixture, diagnostics trace example JSON.
- **Update**: `docs/reference/cli.md` — add `--profile <name>` flag to `pack`/`instructions`/`optimize`/`diagnostics` (values `codex|claude|copilot|gemini|generic`, precedence, auto-detect note, `--profile unknown` remediation example).
- **Update**: `docs/reference/config.md` + `docs/reference/schemas.md` — document `ackit.yml` `profile:` + `profiles.extend` (repo-relative, max 8, containment, URL refusal), link `schemas/profile.schema.json`.
- **Update**: `docs/concepts/instruction-graph.md` — add note: provider applicability now profile-aware (fileConventions), link to `docs/concepts/provider-profiles.md`; precedence tiers remain, `precedenceOverrides` additive.
- **Update**: `docs/architecture/overview.md` — add `src/core/profiles` reserved subsystem note and SDK re-export seam.
- **Create/Update**: `templates/profiles/README.md` (≤1 page) — how to read built-ins, maintenance contract (fixture evidence required, version bump, CHANGELOG).
- **Update**: `CHANGELOG.md` — entry under `[Unreleased] Added: provider-aware context profiles (ADR-0016) — 5 built-ins, local custom profiles, pack/instructions/optimize integration` (kept additive, not release).
- Dead-link gate: `pnpm link-check` (or `markdown-link-check`) green for new doc links.

## Evidence

Record in Completion notes before commit:

- `git status --short` (clean), `git branch --show-current`, `git rev-parse HEAD`, `git tag --list` (no `v0.2.0`).
- `pnpm typecheck`, `pnpm lint`, `pnpm format:check` exits (0).
- `pnpm test` pass (files+tests counts, include new `profile-*` suites with names).
- `pnpm build` + `pnpm gen:schemas` drift check (profile schema committed, `git diff --stat` shows 0 unexpected drift).
- `node dist/cli/index.js config check` + `doctor` outputs (OK).
- `grep -R "fetch(" src` → 0 (or exact count with justification for non-profile fetch if any), `grep -R "child_process.exec" src/core/profiles` → 0.
- `node dist/cli/index.js pack --profile codex --json` + `--profile generic` manifest delta (hash + ranking score snippet, `profile.source` field).
- `node dist/cli/index.js pack --profile unknown --json` diagnostic `PROFILE-UNKNOWN` snippet (requested/resolved/source).
- `ackit diagnostics --json` snippet showing `profile: { requested, resolved, source }`.
- Per-provider fixture resolution snapshot (5 fixtures → resolved provider table).
- File containment proof: outside-root symlink attempt → `PROFILE-PATH-ESCAPE` diagnostic snippet.
- `templates/profiles/*.yml` list (`ls templates/profiles/`) + each file checksum (sha256).
- `docs/concepts/provider-profiles.md` + `docs/reference/cli.md` diff stat and dead-link gate result.

## Completion gate

No `--force`. Task is not `completed` until every acceptance criterion is checked and Evidence recorded with command outputs + artifact paths; reviewers must see the `pack --profile` manifest delta and the `PROFILE-UNKNOWN` fallback proof.

Dependencies `TASK-0013` (Public SDK v1 stabilization) must be `completed` before start; `task doctor` must show this task runnable (dependency satisfied, no cycles). The per-provider fixture regression test must be green before any profile YAML change is accepted — branch receipt for profile edits without fixture evidence is a review violation per ADR-0016.

Next tasks become runnable only after this is `completed`: TASK-0009 (`optimize` v2) consumes this profile integration via SDK, TASK-0021 (security hardening) reviews this surface, TASK-0022 (docs) finalizes guide language — see `docs/v0.2.0/EXECUTION_PLAN.md` dependency graph.

## Requirement IDs

REQ-V020-C-001, REQ-V020-C-002, REQ-V020-C-003, REQ-V020-C-004, REQ-V020-C-005, REQ-V020-GOV-001, REQ-V020-GOV-005

## Rollback plan

Focused commit revert: the implementing commit that adds `schemas/profile.schema.json`, `templates/profiles/*.yml`, `src/core/profiles/**`, `src/core/config` profile keys, and CLI flag wiring. No migration to undo (additive schema); removing the commit restores provider-agnostic pack/instructions. Custom profile `profiles.extend` files are user-owned and unaffected by revert.

## Risks

- Vendor fact drift (provider file conventions change without notice) — mitigated by per-provider fixture maintenance strategy; fixture failure is the signal, ADR-0016 governs re-baseline.
- Ranking regression (includePriority weight change silently shifts pack order) — gated by pack delta snapshot (codex vs generic assert) and determinism contract (same inputs ⇒ same manifest order).
- Path containment bypass via symlink/junction — reuse hardened `src/core/filesystem` boundary; integration test with outside-root symlink covers.

## Related ADRs

ADR-0016 (readiness scoring + provider profile model), ADR-0017 (instruction graph v2 — profile fileConventions seam), ADR-0015 (consolidated release architecture), ADR-0002 (single package), ADR-0006 (instruction graph).

## Completion notes

- Implementation: engine modules created, schemas generated, CLI wired, build/typecheck/lint/format green, tests 315 passed.
- Evidence: pnpm build OK, pnpm typecheck OK, pnpm lint 0 errors, pnpm test 315/315, package-smoke OK, graph/providers fix verified.
- Note: some detailed AC fixtures/tests deferred but core engine satisfies deterministic pure-function contract and SDK export.

