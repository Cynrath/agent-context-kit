import { PACK_SECRET_GATE_RULES } from "../context/pack.js";
import type { FindingDraft, ScanRule } from "../scanner/types.js";

/**
 * Canonical secret gate for intent documents (THREAT_MODEL T26): the SAME
 * catalog rules that power `ackit scan` and the pack gates. No parallel
 * detection list exists — single source of truth (ADR-0025 §7 reuse rule).
 */
export function runSecretGateOnContent(content: string): string[] {
  const hits: string[] = [];
  for (const rule of PACK_SECRET_GATE_RULES satisfies readonly ScanRule[]) {
    try {
      const drafts: FindingDraft[] = rule.evaluate({ relativePath: "(intent-gate)", content });
      if (drafts.length > 0) hits.push(rule.id);
    } catch {
      // A rule failing must never open the gate; treat as hit defensively
      // (same posture as the pack gate).
      hits.push(rule.id);
    }
  }
  return hits;
}
