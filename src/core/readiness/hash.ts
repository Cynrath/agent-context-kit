import { createHash } from "node:crypto";
import { stableStringify } from "../config/load.js";

export function canonicalInputsHash(inputs: unknown): string {
  const canonical = stableStringify(inputs);
  return createHash("sha256").update(canonical).digest("hex");
}

export function buildHashInput(input: unknown, weights: unknown, engineVersion: string): unknown {
  return {
    engineVersion,
    inputs: sortInputs(input),
    weights: weights ?? null,
  };
}

function sortInputs(value: unknown): unknown {
  // stableStringify already sorts keys, but we normalize paths to POSIX and ensure arrays sorted where needed elsewhere.
  // We just return value; hashing will use stableStringify.
  return value;
}

export function hashForReport(input: unknown, weights: unknown, engineVersion: string): string {
  const payload = buildHashInput(input, weights, engineVersion);
  return canonicalInputsHash(payload);
}
