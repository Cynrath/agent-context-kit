import { runSecretGateOnContent } from "../intent/gate.js";
import {
  EVIDENCE_PROBLEM_CODES,
  type EvidenceProblem,
  type EvidenceRegistry,
  type EvidenceType,
  type EvidenceValidationResult,
} from "./types.js";

export interface EvidenceRequirements {
  /**
   * Evidence types that satisfy a criterion. Default: every type except
   * `manual` (manual-only evidence is insufficient unless explicitly
   * configured — ADR-0026 §2).
   */
  allowedTypes?: readonly EvidenceType[] | undefined;
}

const DEFAULT_ALLOWED: readonly EvidenceType[] = [
  "test",
  "build",
  "lint",
  "typecheck",
  "benchmark",
  "runtime",
  "e2e",
  "ci",
  "git",
  "static-analysis",
  "security-scan",
  "external",
  "verifier-verdict",
];

/**
 * Deterministic completeness validation (ADR-0026 §2): structure and coverage
 * only — ACKit never executes evidence or judges semantic satisfaction.
 * Stable finding codes; per-criterion problems; ordered by criterion id.
 */
export function validateEvidence(
  registry: EvidenceRegistry,
  requirements: EvidenceRequirements = {},
): EvidenceValidationResult {
  const allowed = requirements.allowedTypes ?? DEFAULT_ALLOWED;
  const problems: EvidenceProblem[] = [];
  const seen = new Map<string, number>();
  for (const criterion of registry.criteria) {
    const count = seen.get(criterion.id) ?? 0;
    seen.set(criterion.id, count + 1);
    if (count > 0) {
      problems.push({
        code: "EVIDENCE-CRITERION-DUPLICATE",
        criterionId: criterion.id,
        message: `duplicate criterion id ${criterion.id}`,
      });
    }
    for (const entry of criterion.evidence) {
      if (entry.ref.trim().length === 0) {
        problems.push({
          code: EVIDENCE_PROBLEM_CODES.evidenceRefInvalid,
          criterionId: criterion.id,
          message: `${criterion.id}: evidence ref must not be empty`,
        });
      }
      if (runSecretGateOnContent(entry.ref).length > 0) {
        problems.push({
          code: EVIDENCE_PROBLEM_CODES.secretRef,
          criterionId: criterion.id,
          message: `${criterion.id}: evidence ref contains secret-shaped content — redact before recording`,
        });
      }
    }
    const qualifying = criterion.evidence.filter(
      (entry) => allowed.includes(entry.type) && entry.ref.trim().length > 0,
    );
    if (criterion.status !== "verified") {
      problems.push({
        code: EVIDENCE_PROBLEM_CODES.criterionUnverified,
        criterionId: criterion.id,
        message: `${criterion.id}: acceptance criterion is not verified`,
      });
    }
    if (qualifying.length === 0) {
      problems.push({
        code: EVIDENCE_PROBLEM_CODES.requiredEvidenceMissing,
        criterionId: criterion.id,
        message:
          criterion.evidence.length > 0
            ? `${criterion.id}: recorded evidence does not satisfy the allowed types (${criterion.evidence.map((e) => e.type).join(", ")}) — manual-only evidence is insufficient unless configured`
            : `${criterion.id}: no qualifying evidence recorded`,
      });
    }
  }
  problems.sort(
    (a, b) =>
      (a.criterionId ?? "").localeCompare(b.criterionId ?? "") || a.code.localeCompare(b.code),
  );
  return { ok: problems.length === 0, problems };
}
