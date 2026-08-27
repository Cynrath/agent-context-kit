import { z } from "zod";

export const PROVIDERS = ["codex", "claude", "gemini", "copilot", "shared"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const INSTRUCTION_STATUSES = ["ok", "unreachable", "broken-reference", "oversized"] as const;
export type InstructionStatus = (typeof INSTRUCTION_STATUSES)[number];

export const SECURITY_FLAGS = ["external-link", "root-escape-reference", "hidden-unicode"] as const;
export type SecurityFlag = (typeof SECURITY_FLAGS)[number];

export const ProvenanceEntrySchema = z.object({
  source: z.string(),
  reason: z.string(),
  line: z.number().int().nonnegative().optional(),
});
export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>;

/**
 * Instruction-graph node metadata model v2 (REQ-V020-D-001, ADR-0017).
 * Extended additively from v1; v1 JSON validates via defaults (migration shim).
 */
export const InstructionNodeSchema = z.object({
  id: z.string(),
  provider: z.enum(PROVIDERS),
  kind: z.enum(["instruction", "skill"]),
  relativePath: z.string(),
  scopeRoot: z.string(),
  applyTo: z.array(z.string().max(500)).nullable().default(null),
  depth: z.number().int().nonnegative(),
  precedence: z.number().int().nonnegative(),
  managed: z.boolean(),
  checksum: z.string(),
  tokenEstimate: z.number().int().nonnegative(),
  status: z.enum(INSTRUCTION_STATUSES),
  conflicts: z.array(z.string()).default([]),
  duplicates: z.array(z.string()).default([]),
  references: z.array(z.string()).default([]),
  securityFlags: z.array(z.enum(SECURITY_FLAGS)).default([]),
  // v2 additions
  includeScopes: z.array(z.string().max(500)).nullable().default(null),
  excludeScopes: z.array(z.string().max(500)).nullable().default(null),
  providerApplicability: z.array(z.enum(PROVIDERS)).nullable().default(null),
  provenance: z.array(ProvenanceEntrySchema).default([]),
  orderIndex: z.number().int().nonnegative().default(0),
  shadowedBy: z.string().nullable().default(null),
  duplicateOf: z.string().nullable().default(null),
});

export type InstructionNode = z.infer<typeof InstructionNodeSchema>;
// Alias for v2 explicit naming
export const InstructionNodeSchemaV2 = InstructionNodeSchema;
export type InstructionNodeV2 = InstructionNode;

export interface DiscoveryDiagnostic {
  code: string;
  message: string;
  relativePath?: string | undefined;
}

export const INSTRUCTION_GRAPH_SCHEMA_VERSION = 2 as const;

export interface InstructionGraph {
  schemaVersion: typeof INSTRUCTION_GRAPH_SCHEMA_VERSION;
  nodes: InstructionNode[];
  diagnostics: DiscoveryDiagnostic[];
}

/** Options for graph construction; seams keep adapters offline and testable. */
export interface BuildGraphOptions {
  /** Absolute directory treated as the codex *global* instruction home (~/.codex equivalent). */
  codexGlobalDir?: string | undefined;
  /** Maximum token estimate before a node is flagged oversized. */
  maxTokenEstimatePerFile?: number | undefined;
  maxNodes?: number | undefined; // default 2000
  maxDepth?: number | undefined; // default 64
  maxApplyToGlobs?: number | undefined; // default 100
  signal?: AbortSignal | undefined;
  /** Provider-aware profile for fileConventions/precedenceOverrides (TASK-0010). */
  profile?:
    | import("../profiles/types.js").ResolvedProfile
    | import("../profiles/types.js").Profile
    | undefined;
}

/**
 * Effective instruction stack for one provider at one repository-relative
 * path (may be "" for repo-level queries). Ordered from lowest to highest
 * precedence: base/root first, closer scopes and path-specific matches last.
 */
export interface EffectiveStack {
  provider: ProviderId;
  forPath: string;
  /** Node ids ordered weakest→strongest precedence. */
  chain: string[];
}

export interface EffectiveStackInfo extends EffectiveStack {
  perNode: Record<
    string,
    {
      why: string;
      provenance: ProvenanceEntry[];
      shadowedBy?: string | null;
      duplicateOf?: string | null;
    }
  >;
  diagnostics: DiscoveryDiagnostic[];
}
