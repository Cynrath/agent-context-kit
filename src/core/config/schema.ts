import { z } from "zod";

export const CONFIG_SCHEMA_VERSION = 1;

const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();

/**
 * Canonical ackit.yml configuration surface (REQ-CFG-002, ADR-0004).
 * Every object is strict: unknown keys are validation errors, preventing
 * typo-driven insecure defaults.
 */
export const AckitConfigSchema = z.object({
  schemaVersion: z.literal(CONFIG_SCHEMA_VERSION),
  scan: z
    .object({
      include: z.array(z.string()).default([]),
      exclude: z.array(z.string()).default([]),
      severityThreshold: z.enum(["low", "medium", "high", "critical"]).default("low"),
    })
    .default({ include: [], exclude: [], severityThreshold: "low" }),
  limits: z
    .object({
      maxFiles: positiveInt.optional(),
      maxFileBytes: positiveInt.optional(),
      maxTotalBytes: positiveInt.optional(),
      maxDepth: nonNegativeInt.optional(),
      deadlineMs: positiveInt.optional(),
    })
    .default({}),
  instructions: z
    .object({
      enabled: z.boolean().default(true),
      maxTokenEstimatePerFile: positiveInt.default(20000),
    })
    .default({ enabled: true, maxTokenEstimatePerFile: 20000 }),
  skills: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
  context: z
    .object({
      maxTokens: positiveInt.default(100_000),
    })
    .default({ maxTokens: 100_000 }),
  policy: z
    .object({
      extends: z.array(z.string()).default([]),
      rulePacks: z.array(z.string()).default([]),
    })
    .default({ extends: [], rulePacks: [] }),
  baseline: z.string().optional(),
  output: z
    .object({
      format: z.enum(["terminal", "json", "markdown", "html", "sarif"]).default("terminal"),
    })
    .default({ format: "terminal" }),
  cache: z
    .object({
      enabled: z.boolean().default(true),
    })
    .default({ enabled: true }),
  workspaces: z
    .object({
      enabled: z.boolean().default(false),
    })
    .default({ enabled: false }),
  profile: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(1)
    .max(32)
    .optional(),
  profiles: z
    .object({
      extend: z.array(z.string().min(1)).max(8).default([]),
    })
    .default({ extend: [] }),
  readiness: z
    .object({
      weights: z
        .object({
          instructions: z.number().nonnegative().optional(),
          security: z.number().nonnegative().optional(),
          contextEfficiency: z.number().nonnegative().optional(),
          taskHygiene: z.number().nonnegative().optional(),
          skills: z.number().nonnegative().optional(),
          policy: z.number().nonnegative().optional(),
        })
        .strict()
        .optional(),
      strictThreshold: z.number().int().min(0).max(100).optional(),
    })
    .strict()
    .optional(),
  workflow: z
    .object({
      /** Default profile applied by `ackit workflow set` without --profile. */
      defaultProfile: z.enum(["quick", "standard", "high-risk"]).optional(),
      /** Require an independent verifier verdict for standard/high-risk. */
      requireVerifier: z.boolean().optional(),
      /** Per-profile requirement tuning (additive; stage orders stay fixed). */
      profiles: z
        .object({
          requireEvidence: z.boolean().optional(),
          requireVerdict: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .optional(),
});

export type AckitConfig = z.infer<typeof AckitConfigSchema>;

/** Deep-partial view used for policy layers and CLI overrides. */
export type AckitConfigLayer = {
  [K in keyof AckitConfig]?: AckitConfig[K] extends object
    ? Partial<AckitConfig[K]>
    : AckitConfig[K];
};

export const DEFAULT_CONFIG: AckitConfig = AckitConfigSchema.parse({
  schemaVersion: CONFIG_SCHEMA_VERSION,
});
