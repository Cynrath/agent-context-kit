import { z } from "zod";

export const PROVIDERS = ["codex", "claude", "gemini", "copilot", "shared"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const INSTRUCTION_STATUSES = ["ok", "unreachable", "broken-reference", "oversized"] as const;
export type InstructionStatus = (typeof INSTRUCTION_STATUSES)[number];

export const SECURITY_FLAGS = ["external-link", "root-escape-reference", "hidden-unicode"] as const;
export type SecurityFlag = (typeof SECURITY_FLAGS)[number];

/**
 * Instruction-graph node metadata model (REQ-INSTR-002).
 */
export const InstructionNodeSchema = z.strictObject({
  id: z.string(),
  provider: z.enum(PROVIDERS),
  kind: z.enum(["instruction", "skill"]),
  relativePath: z.string(),
  scopeRoot: z.string(),
  applyTo: z.array(z.string()).nullable(),
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
});

export type InstructionNode = z.infer<typeof InstructionNodeSchema>;

export interface DiscoveryDiagnostic {
  code: string;
  message: string;
  relativePath?: string | undefined;
}

export interface InstructionGraph {
  nodes: InstructionNode[];
  diagnostics: DiscoveryDiagnostic[];
}

/** Options for graph construction; seams keep adapters offline and testable. */
export interface BuildGraphOptions {
  /** Absolute directory treated as the codex *global* instruction home (~/.codex equivalent). */
  codexGlobalDir?: string | undefined;
  /** Maximum token estimate before a node is flagged oversized. */
  maxTokenEstimatePerFile?: number | undefined;
  signal?: AbortSignal | undefined;
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
