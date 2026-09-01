import { z } from "zod";

/** Schema id for role contracts (ADR-0028 §4). */
export const ROLE_SCHEMA_ID = "ackit.role.v1";

const rolePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Artifact kinds a role may declare as required inputs. */
export const ROLE_INPUT_KINDS = [
  "intent",
  "spec",
  "plan",
  "task",
  "diff",
  "tests",
  "evidence",
  "verdict",
] as const;
export type RoleInputKind = (typeof ROLE_INPUT_KINDS)[number];

/**
 * Portable role contract (ackit.role.v1, ADR-0028 §4): data ONLY — validated,
 * never executed. Spawning/routing belongs to the provider; ACKit supplies
 * contracts. Strict: unknown fields rejected; all fields length-bounded
 * (untrusted repository content, THREAT_MODEL T25).
 */
export const RoleContractSchema = z.strictObject({
  schemaId: z.literal(ROLE_SCHEMA_ID),
  role: z.string().regex(rolePattern).max(64),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  requiredInputs: z.array(z.enum(ROLE_INPUT_KINDS)).max(8).default([]),
  allowedActions: z.array(z.string().trim().min(1).max(300)).max(16).default([]),
  forbiddenActions: z.array(z.string().trim().min(1).max(300)).max(16).default([]),
  requiredOutputs: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  outputSchema: z.string().trim().max(200).optional(),
});
export type RoleContract = z.infer<typeof RoleContractSchema>;

export interface RoleProblem {
  code: string;
  message: string;
}

export const ROLE_PROBLEM_CODES = {
  schema: "ROLE-INVALID",
  duplicate: "ROLE-DUPLICATE",
  shadow: "ROLE-SHADOW-REFUSED",
  notFound: "ROLE-NOT-FOUND",
} as const;
