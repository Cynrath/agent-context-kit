import { z } from "zod";

export const POLICY_SCHEMA_VERSION = 1;

const ruleIdPattern = /^ACKIT\d{3}$/;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}/);

export const PolicyRuleSchema = z.object({
  ruleId: z.string().regex(ruleIdPattern),
  enabled: z.boolean().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  locked: z.boolean().default(false),
});

export const PolicySuppressionSchema = z.object({
  ruleId: z.string().regex(ruleIdPattern),
  pathGlobs: z.array(z.string()).default(["**"]),
  reason: z.string().min(1),
  expiresAt: isoDate.optional(),
});

export const ForbiddenPatternSchema = z.object({
  id: z.string().regex(ruleIdPattern),
  pattern: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  message: z.string().min(1),
});

export const PolicyDocumentSchema = z.strictObject({
  schemaVersion: z.literal(POLICY_SCHEMA_VERSION),
  org: z.string().optional(),
  repo: z.string().optional(),
  pathScopes: z.array(z.string()).default([]),
  extends: z.array(z.string()).default([]),
  rules: z.array(PolicyRuleSchema).default([]),
  thresholds: z
    .object({
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    })
    .default({}),
  suppressions: z.array(PolicySuppressionSchema).default([]),
  forbiddenPatterns: z.array(ForbiddenPatternSchema).default([]),
  // Policy v2 additions (ADR-0028 §1/§2): risk-tiered autonomy + review
  // policy. Additive optional sections — existing documents unaffected
  // (digest-stable for documents without them).
  autonomy: z
    .strictObject({
      tier0: z.enum(["allow", "ask", "deny"]).optional(),
      tier1: z.enum(["allow", "ask", "deny"]).optional(),
      tier2: z.enum(["allow", "ask", "deny"]).optional(),
      tier3: z.enum(["allow", "ask", "deny"]).optional(),
      tier4: z.enum(["allow", "ask", "deny"]).optional(),
    })
    .optional(),
  review: z
    .strictObject({
      required: z
        .array(
          z.enum([
            "correctness",
            "regression",
            "security",
            "tests",
            "architecture",
            "plan-compliance",
            "documentation",
          ]),
        )
        .max(7)
        .optional(),
      blockingSeverity: z
        .array(z.enum(["critical", "high", "medium"]))
        .max(3)
        .optional(),
    })
    .optional(),
});

export type PolicyDocument = z.infer<typeof PolicyDocumentSchema>;
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;
export type PolicySuppression = z.infer<typeof PolicySuppressionSchema>;

export interface EffectivePolicy {
  documents: PolicyDocument[];
  chain: string[];
  digest: string;
  diagnostics: string[];
}

export interface PolicyResolutionContext {
  /** repository name for scope matching (from git remote or directory name) */
  repoName?: string | undefined;
}
