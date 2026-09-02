import { createHash } from "node:crypto";
import type { IntentMeta } from "./types.js";

/**
 * Deterministic normalization (ADR-0025 §4): canonical machine form with
 * sorted/deduped array fields and collapsed whitespace. Same semantic content
 * with different formatting normalizes to the same value, making the
 * fingerprint a stable reference key for tasks, packs and bundles.
 */
export interface NormalizedIntent {
  id: string;
  title: string;
  status: IntentMeta["status"];
  problem: string;
  desiredOutcome: string;
  constraints: string[];
  nonGoals: string[];
  affectedSystems: string[];
  acceptanceCriteria: { id: string; requirement: string }[];
  openQuestions: string[];
  risks: string[];
  source: string;
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collapseList(values: readonly string[]): string[] {
  return [...new Set(values.map(collapse).filter((value) => value.length > 0))].sort();
}

export function normalizeIntent(meta: IntentMeta): NormalizedIntent {
  return {
    id: meta.id,
    title: collapse(meta.title),
    status: meta.status,
    problem: collapse(meta.problem),
    desiredOutcome: collapse(meta.desiredOutcome),
    constraints: collapseList(meta.constraints),
    nonGoals: collapseList(meta.nonGoals),
    affectedSystems: collapseList(meta.affectedSystems),
    acceptanceCriteria: meta.acceptanceCriteria
      .map((criterion) => ({ id: criterion.id, requirement: collapse(criterion.requirement) }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    openQuestions: collapseList(meta.openQuestions),
    risks: collapseList(meta.risks),
    source: collapse(meta.source),
  };
}

/**
 * Machine-path-independent fingerprint (ADR-0025 §4): sha256 over the
 * canonical JSON serialization (sorted keys, LF endings) of the normalized
 * intent. Stable across machines and directory layouts (THREAT_MODEL
 * fingerprint invariants).
 */
export function intentFingerprint(meta: IntentMeta): string {
  const normalized = normalizeIntent(meta);
  const canonical = JSON.stringify(sortKeys(normalized));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }
  return value;
}
