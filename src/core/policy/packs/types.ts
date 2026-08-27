import { z } from "zod";

export const PACK_LIMITS = {
  maxRules: 200,
  maxPatternLen: 500,
  maxFileBytes: 512 * 1024,
  maxDepth: 20,
  maxScopeEntries: 20,
  maxGlobLen: 300,
  maxMessageLen: 500,
} as const;

const severityEnum = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof severityEnum>;

const packIdPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const namespacePattern = /^[a-z0-9]+([-.][a-z0-9]+)*$/;
const semverPattern = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const ruleIdPattern = /^([a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*|ACKIT\d{3})$/;

export const RuleV1Schema = z.strictObject({
  id: z.string().max(80).regex(ruleIdPattern),
  type: z.enum(["presence", "absence", "pattern", "config", "dependency", "instruction"]),
  glob: z.string().min(1).max(PACK_LIMITS.maxGlobLen).optional(),
  scope: z.array(z.string().min(1).max(200)).max(PACK_LIMITS.maxScopeEntries).optional(),
  match: z.string().min(1).max(PACK_LIMITS.maxPatternLen).optional(),
  message: z.string().min(1).max(PACK_LIMITS.maxMessageLen),
  severity: severityEnum.optional(),
  remediation: z.string().min(1).max(500).optional(),
  enabled: z.boolean().optional(),
  locked: z.boolean().optional(),
  // config / dependency / instruction extensions (optional, strict allows them explicitly)
  path: z.string().min(1).max(300).optional(),
  op: z.enum(["equals", "notEquals", "exists", "notExists", "contains", "matches"]).optional(),
  value: z.unknown().optional(),
  package: z.string().min(1).max(200).optional(),
  version: z.string().min(1).max(100).optional(),
});

export const RulePackSchemaV1 = z
  .strictObject({
    schemaVersion: z.literal(1),
    packId: z.string().min(3).max(64).regex(packIdPattern),
    namespace: z.string().min(2).max(64).regex(namespacePattern),
    version: z.string().regex(semverPattern),
    displayName: z.string().min(1).max(80).optional(),
    description: z.string().min(1).max(500).optional(),
    severity: severityEnum,
    rules: z.array(RuleV1Schema).min(1).max(PACK_LIMITS.maxRules),
    overrides: z
      .record(
        z.string(),
        z.strictObject({
          severity: severityEnum.optional(),
          remediation: z.string().min(1).max(500).optional(),
          enabled: z.boolean().optional(),
          locked: z.boolean().optional(),
        }),
      )
      .optional(),
    composition: z
      .strictObject({
        extends: z.array(z.string().min(1).max(300)).max(20).default([]),
      })
      .optional(),
  })
  .superRefine((pack, ctx) => {
    // unique rule ids per pack
    const seen = new Set<string>();
    for (const rule of pack.rules) {
      if (seen.has(rule.id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate rule id '${rule.id}'`,
          path: ["rules"],
        });
      }
      seen.add(rule.id);
    }
    for (const rule of pack.rules) {
      if (rule.type === "pattern" && (rule.match === undefined || rule.glob === undefined)) {
        ctx.addIssue({
          code: "custom",
          message: `pattern rule '${rule.id}' requires match and glob`,
          path: ["rules"],
        });
      }
    }
  });

export type RulePackV1 = z.infer<typeof RulePackSchemaV1>;
export type RuleV1 = z.infer<typeof RuleV1Schema>;

export type EffectiveRule = RuleV1 & {
  packId: string;
  namespace: string;
  effectiveSeverity: Severity;
  canonicalId: string;
};

export interface EffectiveRulePack {
  packId: string;
  namespace: string;
  version: string;
  severity: Severity;
  displayName?: string | undefined;
  description?: string | undefined;
  rules: EffectiveRule[];
  digest: string;
  chain: string[];
  diagnostics: import("../../scanner/types.js").ScanDiagnostic[];
}

export function severityRank(s: Severity): number {
  return (["low", "medium", "high", "critical"] as const).indexOf(s);
}

export function canonicalId(ruleId: string, namespace: string, packId: string): string {
  if (/^ACKIT\d{3}$/.test(ruleId)) return ruleId;
  const parts = ruleId.split(":");
  if (parts.length === 3) return ruleId; // already canonical
  if (parts.length === 2) {
    // alias packId:slug -> namespace:packId:slug
    return `${namespace}:${ruleId}`;
  }
  // slug only? treat as packId:slug
  if (parts.length === 1) {
    return `${namespace}:${packId}:${ruleId}`;
  }
  return ruleId;
}

export function isAckitId(id: string): boolean {
  return /^ACKIT\d{3}$/.test(id);
}
