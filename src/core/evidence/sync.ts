import type { TaskDoc } from "../tasks/types.js";
import { extractSection } from "../tasks/types.js";
import { type AcceptanceCriterion, EVIDENCE_SCHEMA_ID, type EvidenceRegistry } from "./types.js";

/**
 * Criterion sync (ADR-0026 §1): the task document's `## Acceptance criteria`
 * section is the source of truth. Criterion ids are assigned in document order
 * (AC-001…) — checkbox state is NOT copied (implementation ≠ verified).
 */
export function criteriaFromTaskDoc(taskDoc: TaskDoc): AcceptanceCriterion[] {
  const section = extractSection(taskDoc.body, "Acceptance criteria") ?? "";
  const criteria: AcceptanceCriterion[] = [];
  let index = 0;
  for (const line of section.split("\n")) {
    const trimmed = line.trim();
    const match = /^-\s*\[[ x~!]\]\s*(.*)$/.exec(trimmed);
    if (match === null || match[1] === undefined) continue;
    const requirement = match[1].trim();
    if (requirement.length === 0) continue;
    index += 1;
    criteria.push({
      id: `AC-${String(index).padStart(3, "0")}`,
      requirement,
      status: "unverified",
      evidence: [],
    });
  }
  return criteria;
}

/**
 * Create/refresh the registry from the task doc while preserving already
 * recorded evidence for criteria whose requirement text is unchanged
 * (deterministic match by requirement equality — ids alone can shift when
 * items are inserted above).
 */
export function syncRegistry(
  taskDoc: TaskDoc,
  existing: EvidenceRegistry | null,
  today: string,
): EvidenceRegistry {
  const fresh = criteriaFromTaskDoc(taskDoc);
  if (existing === null) {
    return {
      schemaId: EVIDENCE_SCHEMA_ID,
      taskId: taskDoc.meta.id,
      criteria: fresh,
      updatedAt: today,
    };
  }
  const byRequirement = new Map(existing.criteria.map((c) => [c.requirement, c]));
  const criteria = fresh.map((criterion) => {
    const prior = byRequirement.get(criterion.requirement);
    if (prior === undefined) return criterion;
    // Preserve recorded evidence + verification only when the requirement is
    // unchanged; a changed requirement invalidates prior evidence.
    return { ...criterion, status: prior.status, evidence: prior.evidence };
  });
  return {
    schemaId: EVIDENCE_SCHEMA_ID,
    taskId: taskDoc.meta.id,
    criteria,
    updatedAt: today,
  };
}
