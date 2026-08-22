import { RuleRegistry } from "./rules.js";

/**
 * Default ACKit rule registry instance used by the CLI. Populated by the
 * rule catalog task (TASK-0271); the pipeline and tests may register
 * additional scoped instances.
 */
export const defaultRegistry = new RuleRegistry();
