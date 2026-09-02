import { z } from "zod";

/** Autonomy contract schema version (ADR-0028 §1). */
export const AUTONOMY_SCHEMA_VERSION = 1;

/** Action risk tiers (ADR-0028 §1): provider-independent classification. */
export const ACTION_TIERS = ["tier0", "tier1", "tier2", "tier3", "tier4"] as const;
export type ActionTier = (typeof ACTION_TIERS)[number];

/** Per-tier decisions. Safe defaults are deny-leaning at high tiers. */
export const TIER_DECISIONS = ["allow", "ask", "deny"] as const;
export type TierDecision = (typeof TIER_DECISIONS)[number];

export const AUTONOMY_DEFAULTS: Record<ActionTier, TierDecision> = {
  tier0: "allow",
  tier1: "allow",
  tier2: "ask",
  tier3: "ask",
  tier4: "deny",
};

const tierDecision = z.enum(TIER_DECISIONS);

/** Optional autonomy section on policy documents and ackit.yml (ADR-0028 §1). */
export const AutonomySchema = z
  .strictObject({
    tier0: tierDecision.optional(),
    tier1: tierDecision.optional(),
    tier2: tierDecision.optional(),
    tier3: tierDecision.optional(),
    tier4: tierDecision.optional(),
  })
  .optional();

export type Autonomy = z.infer<typeof AutonomySchema>;

/** Review dimensions a verdict can be checked against (ADR-0028 §2). */
export const REVIEW_DIMENSIONS = [
  "correctness",
  "regression",
  "security",
  "tests",
  "architecture",
  "plan-compliance",
  "documentation",
] as const;
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];

export const REVIEW_SEVERITIES = ["critical", "high", "medium"] as const;
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];

export const ReviewSchema = z
  .strictObject({
    required: z.array(z.enum(REVIEW_DIMENSIONS)).max(7).optional(),
    blockingSeverity: z.array(z.enum(REVIEW_SEVERITIES)).max(3).optional(),
  })
  .optional();

export type Review = z.infer<typeof ReviewSchema>;

/** Resolved (merged) autonomy table — always complete, defaults filled. */
export interface ResolvedAutonomy {
  tier0: TierDecision;
  tier1: TierDecision;
  tier2: TierDecision;
  tier3: TierDecision;
  tier4: TierDecision;
}

/**
 * Which tiers were EXPLICITLY set by any active layer (vs inherited from
 * AUTONOMY_DEFAULTS). Boundary enforcement (ADR-0028 §1) fires deny/ask
 * behavior only for explicitly-set tiers so that repositories without any
 * autonomy configuration keep exact pre-policy behavior (compatibility).
 */
export interface ResolvedAutonomyReport {
  autonomy: ResolvedAutonomy;
  explicitTiers: ActionTier[];
  diagnostics: string[];
}

/** Documented map of ACKit-owned boundaries to their tier (ADR-0028 §1). */
export const ACKIT_BOUNDARY_TIERS = {
  /** task complete --force: explicit gate override = controlled state change. */
  forceCompletion: "tier2",
  /** checkpoint/handoff export: writes a state-bearing artifact to disk. */
  checkpointExport: "tier2",
  /** verdict registration: appends verification state. */
  verdictRegistration: "tier2",
} as const;

export type AckitBoundary = keyof typeof ACKIT_BOUNDARY_TIERS;

/**
 * Resolve the effective autonomy table: document layers merge over config over
 * defaults; DENY IN ANY ACTIVE LAYER DENIES (deny wins — never bypassable via
 * a later allow). Returns the merged table plus diagnostics.
 */
export function resolveAutonomy(layers: readonly unknown[]): ResolvedAutonomyReport {
  const merged: Partial<Record<ActionTier, TierDecision>> = {};
  const explicit = new Set<ActionTier>();
  const diagnostics: string[] = [];
  for (const [index, layer] of layers.entries()) {
    if (layer === null || layer === undefined) continue;
    if (typeof layer !== "object") {
      diagnostics.push(`autonomy layer ${index} ignored (not an object)`);
      continue;
    }
    const record = layer as Record<string, unknown>;
    for (const tier of ACTION_TIERS) {
      const value = record[tier];
      if (value === "allow" || value === "ask" || value === "deny") {
        // DENY is sticky: once any layer denies a tier, later allows cannot
        // reopen it (deny wins — policy bypass prevention, THREAT_MODEL T23).
        explicit.add(tier);
        if (merged[tier] === "deny") continue;
        merged[tier] = value;
      } else if (value !== undefined) {
        diagnostics.push(`autonomy layer ${index}: invalid '${tier}' value ignored`);
      }
    }
  }
  return {
    autonomy: {
      tier0: merged.tier0 ?? AUTONOMY_DEFAULTS.tier0,
      tier1: merged.tier1 ?? AUTONOMY_DEFAULTS.tier1,
      tier2: merged.tier2 ?? AUTONOMY_DEFAULTS.tier2,
      tier3: merged.tier3 ?? AUTONOMY_DEFAULTS.tier3,
      tier4: merged.tier4 ?? AUTONOMY_DEFAULTS.tier4,
    },
    explicitTiers: [...explicit].sort(),
    diagnostics,
  };
}

/**
 * Evaluate an ACKit-owned boundary against the resolved autonomy table.
 * tier4-class boundaries are refused outright regardless of policy (ADR-0028 §1:
 * publish/deploy/destructive actions are never agent-authorized here).
 */
/**
 * Evaluate an ACKit-owned boundary against the resolved autonomy table.
 * Note: tier4-class boundaries (publish/deploy/destructive) do not exist as
 * ACKit-owned boundaries today — they are refused by product governance
 * (ADR-0028 §1) and can never be agent-authorized through this table.
 */
export function evaluateBoundary(
  boundary: AckitBoundary,
  autonomy: ResolvedAutonomy,
): { decision: TierDecision; tier: ActionTier; reason: string } {
  const tier = ACKIT_BOUNDARY_TIERS[boundary];
  const decision = autonomy[tier];
  return {
    decision,
    tier,
    reason:
      decision === "allow"
        ? `boundary '${boundary}' is tier ${tier} (allow)`
        : decision === "ask"
          ? `boundary '${boundary}' is tier ${tier} (ask)`
          : `boundary '${boundary}' is tier ${tier} (deny)`,
  };
}

/**
 * Enforcement decision for an ACKit-owned boundary (ADR-0028 §1) that
 * preserves compatibility for unconfigured repositories: when no active
 * layer explicitly set the boundary's tier, the boundary proceeds with
 * today's behavior (the defaults are advisory for unconfigured repos);
 * an explicit deny always refuses, and an explicit ask behaves as the
 * documented --force precedent (non-interactive contexts treat ask as
 * deny — no silent bypass).
 */
export function enforceBoundary(
  boundary: AckitBoundary,
  report: ResolvedAutonomyReport,
): { enforce: boolean; decision: TierDecision; tier: ActionTier; reason: string } {
  const evaluation = evaluateBoundary(boundary, report.autonomy);
  const tier = ACKIT_BOUNDARY_TIERS[boundary];
  const explicitlySet = report.explicitTiers.includes(tier);
  return {
    enforce: explicitlySet && evaluation.decision !== "allow",
    decision: evaluation.decision,
    tier,
    reason: evaluation.reason,
  };
}

/** Review-policy resolution: document over config, defaults empty. */
export function resolveReview(layers: readonly unknown[]): {
  review: { required: ReviewDimension[]; blockingSeverity: ReviewSeverity[] };
  diagnostics: string[];
} {
  const required = new Set<ReviewDimension>();
  const blockingSeverity = new Set<ReviewSeverity>();
  const diagnostics: string[] = [];
  for (const [index, layer] of layers.entries()) {
    if (layer === null || layer === undefined || typeof layer !== "object") continue;
    const record = layer as { required?: unknown; blockingSeverity?: unknown };
    if (Array.isArray(record.required)) {
      for (const dimension of record.required) {
        if ((REVIEW_DIMENSIONS as readonly string[]).includes(String(dimension))) {
          required.add(dimension as ReviewDimension);
        } else {
          diagnostics.push(
            `review layer ${index}: unknown dimension '${String(dimension)}' ignored`,
          );
        }
      }
    }
    if (Array.isArray(record.blockingSeverity)) {
      for (const severity of record.blockingSeverity) {
        if ((REVIEW_SEVERITIES as readonly string[]).includes(String(severity))) {
          blockingSeverity.add(severity as ReviewSeverity);
        } else {
          diagnostics.push(`review layer ${index}: unknown severity '${String(severity)}' ignored`);
        }
      }
    }
  }
  return {
    review: {
      required: [...required].sort(),
      blockingSeverity: [...blockingSeverity].sort(),
    },
    diagnostics,
  };
}

/**
 * Review-dimension code prefix registry: maps verdict finding codes to the
 * review dimensions they evidence (documented in docs/reference/policy.md).
 */
const DIMENSION_PREFIXES: Readonly<Record<ReviewDimension, readonly string[]>> = {
  correctness: ["CORRECTNESS", "SEMANTIC", "LOGIC"],
  regression: ["REGRESSION", "BEHAVIOR"],
  security: ["SECURITY", "SECRETS", "INJECTION", "TRAVERSAL"],
  tests: ["TEST", "EVIDENCE", "COVERAGE"],
  architecture: ["ARCHITECTURE", "DESIGN", "STRUCTURE"],
  "plan-compliance": ["PLAN", "SCOPE", "UNPLANNED"],
  documentation: ["DOC", "DOCUMENTATION"],
};

/** Check a registered verdict's findings against the resolved review policy. */
export function checkVerdictAgainstReview(
  verdict: {
    verdict: string;
    findings: { severity: string; code: string }[];
  },
  review: { required: ReviewDimension[]; blockingSeverity: ReviewSeverity[] },
): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const covered = new Set<ReviewDimension>();
  // Verdict finding severities (ackit.verdict.v1) are blocking|warning|info;
  // review-policy severities are critical|high|medium (the scanner scale).
  // Deterministic mapping for the cross-check: blocking → critical, warning
  // → medium, info → below every blocking threshold.
  const reviewRankOf = (findingSeverity: string): number =>
    findingSeverity === "blocking" ? 3 : findingSeverity === "warning" ? 1 : 0;
  for (const finding of verdict.findings) {
    for (const [dimension, prefixes] of Object.entries(DIMENSION_PREFIXES)) {
      if (prefixes.some((prefix) => finding.code.startsWith(prefix))) {
        covered.add(dimension as ReviewDimension);
      }
    }
    // blockingSeverity enforcement (ADR-0028 §2): a verdict finding at or
    // above a configured blocking severity fails the review. Note that a
    // literal `blocking` finding on a PASS-family verdict is already
    // rejected structurally at registration (VERDICT-BLOCKING-ON-PASS) —
    // this check covers the mapped severities of the remaining findings.
    if (review.blockingSeverity.length > 0) {
      const thresholdRank = Math.min(
        ...review.blockingSeverity.map((sev) => (sev === "critical" ? 3 : sev === "high" ? 2 : 1)),
      );
      if (reviewRankOf(finding.severity) >= thresholdRank) {
        problems.push(
          `REVIEW-BLOCKING-SEVERITY: finding '${finding.code}' has severity '${finding.severity}', at or above the configured blocking severity`,
        );
      }
    }
  }
  for (const dimension of review.required) {
    if (!covered.has(dimension)) {
      problems.push(
        `REVIEW-DIMENSION-MISSING: required review dimension '${dimension}' has no covering finding in the verdict`,
      );
    }
  }
  return { ok: problems.length === 0, problems };
}
