---
id: "TASK-0052"
title: "verification bundle and verdict contract"
status: completed
schemaVersion: 2
dependencies: ["TASK-0049", "TASK-0050", "TASK-0051"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Implement the independent verification protocol (ADR-0026, §6): a deterministic, self-contained verification bundle any fresh-context agent can consume, plus the provider-independent `ackit.verdict.v1` contract with strict structure/reference validation — without ACKit pretending to judge semantic correctness itself.

## Scope

- `src/core/verification/bundle.ts`: `buildVerificationBundle(taskId, options)` — deterministic markdown bundle (bounded; never a repository dump) with header block carrying `ackit.verification-bundle.v1`, containing: intent (normalized summary + fingerprint), workflow profile/stage + required artifacts, spec/decision/plan refs (ids/paths only), full task document, acceptance criteria + evidence registry, latest checkpoint summary (if any), implementation surface (git changed files vs declared scope; diff-stat only, no full diff by default — `--diff` opt-in with byte cap), relevant instruction summary (active-task + policy digests), known failures/blockers from checkpoint/task, and explicit instructions to the verifier (role reference, verdict format, output location guidance). `--format json` variant with identical content, stable key order.
- `src/core/verification/verdict.ts`: `VERDICT_SCHEMA_ID = "ackit.verdict.v1"`; `VerdictSchema` (strict): `schemaId`, `taskId`, `verdict` (`PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED | BLOCKED`), `verifier` (`{ agent: string, context: "fresh" | "same", issuedAt: date-only ISO }`), `findings[]` (`{ severity: "blocking"|"warning"|"info", criterion?: AC-id, code: stable-upper-snake, message: bounded }`), `checkedCriteria[]` (AC-ids), `summary` (bounded). Validation: structure (strict), references (task exists; criterion ids exist in the task's evidence registry; checkedCriteria ⊆ registry criteria), and completion-compatibility (PASS/PASS_WITH_WARNINGS with no `blocking` findings).
- `src/core/verification/store.ts`: registered verdicts at `.ackit/workflow/TASK-####/verdicts/VR-####.yaml` (append-only: re-registering after a REWORK verdict keeps history; latest verdict governs); deterministic serialization; containment.
- CLI `ackit verification` (`src/cli/commands/verification.ts`): `bundle <TASK-ID> [--out file] [--diff] [--format md|json]`, `record <TASK-ID> --verdict <file>` (validate + register; refuses structurally invalid or reference-broken verdicts), `show <TASK-ID> [VR-ID]`.
- `schemas/verdict.schema.json` + `schemas/verification-bundle.schema.json` (header contract) generated.
- Tests: bundle determinism (same repo/task state → byte-identical), bundle content assertions (includes intent/criteria/evidence; excludes unrelated repository files), verdict validation matrix (each verdict value; blocking-finding rules; unknown criterion; unknown task; forged `schemaId`), CLI integration, security (secret gate over bundle output; no absolute paths).

## Out of scope

- Automatic verifier spawning (agents spawn their own verifiers; ACKit only supplies the bundle + contract).
- Completion-gate enforcement (TASK-0053).
- MCP exposure (TASK-0059).

## Affected files

- `src/core/verification/bundle.ts`, `verdict.ts`, `store.ts`, `index.ts` (new)
- `src/cli/commands/verification.ts` (new), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/verdict.schema.json` (new), `schemas/verification-bundle.schema.json` (new)
- `tests/unit/verification/*.ts`, `tests/integration/verification/*.ts` (new)

## Acceptance criteria

- [x] `ackit verification bundle TASK-XXXX` emits a deterministic, bounded bundle containing exactly the mandated material; JSON variant content-identical.
- [x] Verdict registration validates structure strictly and rejects: wrong schemaId, unknown task, unknown criterion ids, blocking findings on PASS, unknown fields — each with a stable error code.
- [x] Append-only verdict history with latest-verdict-governs semantics, deterministic file naming.
- [x] Secret gate + absolute-path scrubbing verified over bundle and verdict outputs.
- [x] Schemas committed and current; tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/verification tests/integration/verification`
4. Full `pnpm test`.

## Security considerations

- Verdict files are untrusted input: strict schema, bounded field lengths, no path interpretation beyond containment; `verifier.agent` is a free-form label never executed or resolved.
- Bundle is built from gated surfaces only (secret gate re-run on final bundle string — defense in depth identical to packs).
- Forged verdict attempts (wrong task, tampered criteria) rejected deterministically.

## Risks

- Bundle bloat on large diffs — mitigated by diff-stat default + `--diff` byte cap.

## Rollback plan

Focused revert; additive module.

## Completion notes

- Implemented `src/core/verification/` (verdict/store/bundle/index):
  - `ackit.verdict.v1` strict schema: PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED |
    BLOCKED; verifier {agent (bounded label), context fresh|same, issuedAt (calendar
    date)}; findings[] with severity blocking|warning|info + criterion + stable
    upper-snake code + bounded message; checkedCriteria[]; bounded summary.
  - `VerdictStore` at `.ackit/workflow/TASK-####/verdicts/VR-####.yaml`: append-only,
    sequential ids, latest governs; registration validates structure (strict, unknown
    fields rejected), task existence (`VERDICT-TASK-UNKNOWN` — cross-repo refused, T21),
    criterion references against the evidence registry (`VERDICT-CRITERION-UNKNOWN` —
    forged criteria refused, T18), and PASS-family/blocking consistency
    (`VERDICT-BLOCKING-ON-PASS`); tampered files rejected on read; traversal ids refused.
  - `buildVerificationBundle`: deterministic bounded markdown+json bundle with the
    mandated material — intent summary + fingerprint, workflow profile/stage, full task
    document, criteria+evidence, registered verdicts, latest checkpoint, implementation
    surface (declared scope vs changed files), capped optional diff (`--diff`, 32 KiB
    default), and explicit fresh-verifier instructions. Secret gate (canonical rules)
    runs over both emitted surfaces; `--out` paths reject traversal (exit 4).
- CLI `ackit verification bundle|record|show` registered; drift + workflow gates now
  resolve verdict presence via the real `VerdictStore` (replacing the TASK-0051
  placeholder — documented in TASK-0051 notes).
- Schemas: `schemas/verdict.schema.json` (from zod) +
  `schemas/verification-bundle.schema.json` (header contract) emitted and committed;
  `pnpm gen:schemas` idempotent.
- Tests: unit 8/8 (PASS registration, mandated REWORK_REQUIRED→superseded-by-PASS
  append-only flow, wrong-schemaId/unknown-fields/blocking-on-PASS rejections with stable
  codes, forged-criteria rejection, unknown-task/traversal refusal, tamper rejection,
  bundle determinism/content/JSON, unknown-task reporting) + CLI integration 2/2
  (bundle→record→show round-trip incl. --out traversal exit 4, blocking-on-PASS refusal,
  forged criteria refusal). Full sequential suite result recorded in the commit.
- Gates: typecheck clean; lint 0 problems (263 files); format:check clean.
