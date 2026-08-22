import type { ScanRule } from "./types.js";

/**
 * Central rule registry (ADR-0009). Rule ids use the stable ACKIT<NNN>
 * namespace allocated here; semantic changes to an existing id follow
 * finding-schema versioning. TASK-0271 fills the catalog; the registry and
 * its invariants live here so the pipeline can depend on them already.
 */
export class RuleRegistry {
  private readonly rules = new Map<string, ScanRule>();

  register(rule: ScanRule): void {
    if (!/^ACKIT\d{3}$/.test(rule.id)) {
      throw new Error(`invalid rule id '${rule.id}': must match ACKIT<NNN>`);
    }
    if (this.rules.has(rule.id)) {
      throw new Error(`duplicate rule id '${rule.id}' in registry`);
    }
    this.rules.set(rule.id, rule);
  }

  unregister(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getAll(): ScanRule[] {
    return [...this.rules.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  get size(): number {
    return this.rules.size;
  }
}
