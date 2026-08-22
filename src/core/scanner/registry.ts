import { builtinRegistry } from "./rules/catalog.js";
import type { RuleRegistry } from "./rules.js";

/**
 * Default ACKit rule registry used by the CLI scan command: the built-in
 * catalog. Tests may create scoped registries instead of mutating this one.
 */
function buildDefault(): RuleRegistry {
  return builtinRegistry();
}

export const defaultRegistry: RuleRegistry = buildDefault();
