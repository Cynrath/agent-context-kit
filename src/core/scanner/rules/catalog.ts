import { RuleRegistry } from "../rules.js";
import type { ScanRule } from "../types.js";
import {
  ackit010AbsolutePathLeakage,
  ackit020TodoMarkers,
  ackit040LargeContextFile,
  ackit050ConfigSchemaProblem,
  ackit070UnpinnedAction,
  ackit080FloatingDependency,
} from "./repo-rules.js";
import {
  ackit001TokenFormats,
  ackit002PrivateKeyBlock,
  ackit003GenericCredentialAssignment,
  ackit004ConnectionString,
  ackit005EntropyAssisted,
} from "./secret-rules.js";

/**
 * Built-in rule catalog (REQ-SCAN-003/004, ADR-0009).
 *
 * ID allocation table — ids are permanent; semantic changes to an existing id
 * require a finding-schema version bump and a docs/reference/rules.md entry.
 * New rules append the next free number in their block:
 *   ACKIT001-099 secrets            ACKIT100-199 path safety
 *   ACKIT200-299 hygiene            ACKIT300-399 instruction integrity (TASK-0273)
 *   ACKIT400-499 context/config     ACKIT500-599 task/docs workflow
 *   ACKIT600-699 CI/release hygiene ACKIT700-799 dependency advisory
 *   ACKIT900-999 internal/advisory (ACKIT099 suppression-bypass advisory)
 */
export const BUILTIN_RULES: readonly ScanRule[] = [
  // Secrets (ACKIT001..005)
  ackit001TokenFormats,
  ackit002PrivateKeyBlock,
  ackit003GenericCredentialAssignment,
  ackit004ConnectionString,
  ackit005EntropyAssisted,

  // Path safety / leakage (ACKIT010 block, 100-series reserved)
  ackit010AbsolutePathLeakage,

  // Hygiene
  ackit020TodoMarkers,

  // Context/config
  ackit040LargeContextFile,
  ackit050ConfigSchemaProblem,

  // CI/release hygiene
  ackit070UnpinnedAction,

  // Dependency advisory
  ackit080FloatingDependency,
];

/** Advisory emitted whenever an inline suppression is applied. */
export const SUPPRESSION_ADVISORY_ID = "ACKIT099";

let cachedRegistry: RuleRegistry | undefined;

export function builtinRegistry(): RuleRegistry {
  cachedRegistry ??= buildBuiltinRegistry();
  return cachedRegistry;
}

export function buildBuiltinRegistry(): RuleRegistry {
  const registry = new RuleRegistry();
  for (const rule of BUILTIN_RULES) {
    registry.register(rule);
  }
  return registry;
}
