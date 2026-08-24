import process from "node:process";

/**
 * Emits one machine-readable JSON document to stdout with the canonical
 * formatting shared by every CLI command (REQ-DX-003 stdout purity).
 */
export function writeJson(payload: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
