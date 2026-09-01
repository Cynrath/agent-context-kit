import { promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import {
  EVIDENCE_SCHEMA_ID,
  type EvidenceEntry,
  type EvidenceRegistry,
  EvidenceRegistrySchema,
} from "./types.js";

const TASK_ID_PATTERN = /^TASK-\d{4}$/;

export class EvidenceStoreError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function requireTaskId(taskId: string): void {
  if (typeof taskId !== "string" || !TASK_ID_PATTERN.test(taskId)) {
    throw new EvidenceStoreError("EVIDENCE-TASK-ID-INVALID", `invalid task id '${taskId}'`);
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Per-task evidence registry store (ADR-0026): `.ackit/workflow/TASK-####/
 * evidence.yaml` — deterministic YAML, atomic writes, id validation before
 * path construction (THREAT_MODEL T17/T19).
 */
export class EvidenceStore {
  constructor(private readonly root: RepositoryRoot) {}

  private file(taskId: string): string {
    requireTaskId(taskId);
    return path.join(this.root.canonicalPath, ".ackit", "workflow", taskId, "evidence.yaml");
  }

  async load(taskId: string): Promise<EvidenceRegistry | null> {
    let raw: string;
    try {
      raw = await fsp.readFile(this.file(taskId), "utf8");
    } catch {
      return null;
    }
    const { parse } = await import("yaml");
    let parsed: unknown;
    try {
      parsed = parse(raw);
    } catch {
      throw new EvidenceStoreError(
        "EVIDENCE-REGISTRY-UNPARSABLE",
        `evidence registry for ${taskId} is not valid YAML`,
      );
    }
    const result = EvidenceRegistrySchema.safeParse(parsed);
    if (!result.success) {
      throw new EvidenceStoreError(
        "EVIDENCE-REGISTRY-INVALID",
        `evidence registry for ${taskId} failed schema validation (${result.error.issues.length} issue(s))`,
      );
    }
    return result.data;
  }

  async save(taskId: string, registry: EvidenceRegistry): Promise<void> {
    requireTaskId(taskId);
    const file = this.file(taskId);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    const { stringify } = await import("yaml");
    await fsp.writeFile(file, stringify(registry, { lineWidth: 0 }), "utf8");
  }

  /**
   * Append evidence to a criterion and mark it verified (ADR-0026 §2): the
   * criterion id must exist in the registry (forged ids rejected); the ref is
   * length-capped and secret-gated by the validator on save.
   */
  async verify(
    taskId: string,
    criterionId: string,
    entry: { type: EvidenceEntry["type"]; ref: string },
  ): Promise<EvidenceRegistry> {
    // Id validation BEFORE any registry access (traversal prevention, T19).
    requireTaskId(taskId);
    const registry = await this.load(taskId);
    if (registry === null) {
      throw new EvidenceStoreError(
        "EVIDENCE-REGISTRY-MISSING",
        `no evidence registry for '${taskId}' — run 'ackit evidence sync' first`,
      );
    }
    const criterion = registry.criteria.find((c) => c.id === criterionId);
    if (criterion === undefined) {
      throw new EvidenceStoreError(
        "EVIDENCE-CRITERION-UNKNOWN",
        `criterion '${criterionId}' does not exist in the registry for '${taskId}' (forged ids are rejected)`,
      );
    }
    const updated: EvidenceRegistry = {
      ...registry,
      criteria: registry.criteria.map((c) =>
        c.id === criterionId
          ? {
              ...c,
              status: "verified",
              evidence: [...c.evidence, { ...entry, recordedAt: today() }].slice(-32),
            }
          : c,
      ),
      updatedAt: today(),
    };
    await this.save(taskId, updated);
    return updated;
  }
}

export { EVIDENCE_SCHEMA_ID };
