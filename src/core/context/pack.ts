import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import picomatch from "picomatch";
import { estimateTokens } from "../../shared/tokens.js";
import { getPackageIdentity } from "../../shared/version.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { collectScanTargets } from "../filesystem/scan-targets.js";
import {
  ackit001TokenFormats,
  ackit002PrivateKeyBlock,
  ackit003GenericCredentialAssignment,
  ackit004ConnectionString,
} from "../scanner/rules/secret-rules.js";
import type { FindingDraft, ScanRule } from "../scanner/types.js";

export const PACK_SCHEMA_VERSION = "ackit.pack.v0";
export const PACK_PREAMBLE_LABEL = "token counts are estimates";

/** Ranking weight table (REQ-CTX-003 / ADR-0012) — transparent and documented. */
export const RANKING_WEIGHTS = {
  explicitInclude: 100,
  changed: 60,
  activeTaskRef: 50,
  instructionScope: 40,
  importProximity: 30,
  readmeArchRelevance: 20,
  baseByType: 10,
  sizePenaltyPer4k: 5,
  sizePenaltyCap: 40,
} as const;

const ABSOLUTE_PATH_PATTERNS: readonly RegExp[] = [
  /\b[A-Z]:\\(?:Users|Documents and Settings)\\[^\s"'`)\]]*/g,
  /\/home\/[^\s/"'`)\]]+/g,
  /\/Users\/[^\s/"'`)\]]+/g,
];

/**
 * Canonical secret safety gate for emitted artifacts.
 *
 * Single source of truth: the SAME catalog rules that power `ackit scan`
 * (ACKIT001 token shapes, ACKIT002 private keys, ACKIT003 credential
 * assignments, ACKIT004 connection strings) evaluate candidate content AND
 * every emitted surface. No parallel/divergent detection list exists.
 */
export const PACK_SECRET_GATE_RULES: readonly ScanRule[] = [
  ackit001TokenFormats,
  ackit002PrivateKeyBlock,
  ackit003GenericCredentialAssignment,
  ackit004ConnectionString,
];

function runSecretGate(content: string): string[] {
  const hits: string[] = [];
  for (const rule of PACK_SECRET_GATE_RULES) {
    try {
      if (rule.evaluate({ relativePath: "(gate)", content }).some((_draft: FindingDraft) => true)) {
        hits.push(rule.id);
      }
    } catch {
      // A rule failing must never open the gate; treat as hit defensively.
      hits.push(rule.id);
    }
  }
  return hits;
}

export interface PackManifestEntry {
  relativePath: string;
  action: "included" | "excluded" | "scrubbed" | "context-section";
  reason: string;
  estimatedTokens: number;
  sha256: string;
  bytes: number;
}

/** Canonical context sections required by REQ-CTX-001 (deterministic order). */
export interface PackContextSection {
  id:
    | "instruction-graph"
    | "active-tasks"
    | "skills-catalog"
    | "policy-summary"
    | "repository-metadata";
  title: string;
  body: string;
}

export interface BuildPackOptions {
  maxTokens?: number | undefined;
  includeGlobs?: readonly string[] | undefined;
  /** Restrict file candidates to exactly this set (git-changed mode). */
  restrictToFiles?: readonly string[] | undefined;
  activeTaskContent?: string | undefined;
  instructionReferenceTargets?: readonly string[] | undefined;
  limits?: import("../filesystem/types.js").TraversalLimits | undefined;
  /** REQ-CTX-001 canonical context sections, pre-rendered by the caller. */
  contextSections?: readonly PackContextSection[] | undefined;
  /** Cancellation signal (REQ-MCP-004 / audit 6C). */
  signal?: AbortSignal | undefined;
}

export interface PackResult {
  format: "markdown" | "json";
  markdown: string;
  json: string;
  manifest: PackManifestEntry[];
  totalIncludedTokens: number;
  maxTokens: number;
}

/**
 * Deterministic, budgeted context pack (REQ-CTX-001..004).
 *
 * Safety gates, in order:
 *   G1 binary content excluded via the CANONICAL filesystem classifier
 *      (extension-agnostic; unknown-extension binaries included in that);
 *   G2 secret detection delegated to the canonical catalog rules — a file
 *      matching any secret rule is excluded with the rule ids in the reason;
 *   G3 content-hash dedupe;
 *   G4 machine-local absolute paths scrubbed to `<local-path>`.
 * The same secret rules re-verify every EMITTED surface as a final guard.
 * Same repo+config ⇒ byte-identical output (no timestamps in contract).
 */
export async function buildContextPack(
  root: RepositoryRoot,
  options: BuildPackOptions & { format?: "markdown" | "json" | undefined } = {},
): Promise<PackResult> {
  const maxTokens = options.maxTokens ?? 100_000;
  const collection = await collectScanTargets(root, { skipClassification: false });

  const includeMatch =
    options.includeGlobs && options.includeGlobs.length > 0
      ? picomatch([...options.includeGlobs], { dot: true })
      : null;
  const restrictSet =
    options.restrictToFiles === undefined
      ? null
      : new Set(options.restrictToFiles.map((file) => file.split("\\").join("/")));
  const instructionRefs = new Set((options.instructionReferenceTargets ?? []).map(toPosix));
  const activeTaskText = options.activeTaskContent ?? "";

  const scored: Scored[] = [];
  const manifestDraft: PackManifestEntry[] = [];
  const seenHashes = new Map<string, string>();

  // ---- Canonical context sections first (REQ-CTX-001), budget-prioritized.
  let usedTokens = 0;
  const sectionBodies = new Map<string, string>();
  for (const section of options.contextSections ?? []) {
    const tokens = estimateTokens(section.body);
    const rel = `(context)/${section.id}`;
    if (usedTokens + tokens <= maxTokens) {
      usedTokens += tokens;
      sectionBodies.set(rel, section.body);
      manifestDraft.push({
        relativePath: rel,
        action: "context-section",
        reason: `REQ-CTX-001 canonical context section (${section.title})`,
        estimatedTokens: tokens,
        sha256: createHash("sha256").update(section.body).digest("hex"),
        bytes: Buffer.byteLength(section.body),
      });
    } else {
      manifestDraft.push({
        relativePath: rel,
        action: "excluded",
        reason: `budget exhausted (needs ${tokens}, remaining ${maxTokens - usedTokens})`,
        estimatedTokens: tokens,
        sha256: createHash("sha256").update(section.body).digest("hex"),
        bytes: Buffer.byteLength(section.body),
      });
    }
  }

  for (const target of collection.targets) {
    // G1: binary exclusion via the CANONICAL classifier (extension-agnostic).
    if (target.kind !== "text") {
      manifestDraft.push({
        relativePath: target.relativePath,
        action: "excluded",
        reason: "binary content excluded by canonical classifier",
        estimatedTokens: 0,
        sha256: createHash("sha256").update(`${target.relativePath}:binary`).digest("hex"),
        bytes: target.sizeBytes,
      });
      continue;
    }

    let content: string;
    try {
      content = await fsp.readFile(target.absolutePath, "utf8");
    } catch {
      continue;
    }

    // G2: canonical catalog secret gate (single source of truth with scan).
    const secretRuleIds = runSecretGate(content);
    if (secretRuleIds.length > 0) {
      manifestDraft.push({
        relativePath: target.relativePath,
        action: "excluded",
        reason: `potential secret detected (${secretRuleIds.join(", ")})`,
        estimatedTokens: 0,
        sha256: createHash("sha256").update(content).digest("hex"),
        bytes: Buffer.byteLength(content),
      });
      continue;
    }

    // G3: dedupe by content hash.
    const hash = createHash("sha256").update(content).digest("hex");
    const originalOwner = seenHashes.get(hash);
    if (originalOwner !== undefined) {
      manifestDraft.push({
        relativePath: target.relativePath,
        action: "excluded",
        reason: `duplicate of ${originalOwner}`,
        estimatedTokens: 0,
        sha256: hash,
        bytes: Buffer.byteLength(content),
      });
      continue;
    }
    seenHashes.set(hash, target.relativePath);

    // Restrictive git-changed mode: candidates limited to the changed set.
    if (restrictSet !== null && !restrictSet.has(target.relativePath)) {
      manifestDraft.push({
        relativePath: target.relativePath,
        action: "excluded",
        reason: "outside requested changed-file set",
        estimatedTokens: 0,
        sha256: hash,
        bytes: Buffer.byteLength(content),
      });
      continue;
    }

    // G4: scrub machine-local absolute paths (REQ-GOV-004).
    let scrubbed = 0;
    for (const pattern of ABSOLUTE_PATH_PATTERNS) {
      content = content.replace(pattern, () => {
        scrubbed += 1;
        return "<local-path>";
      });
    }

    const score =
      (includeMatch?.(target.relativePath) ? RANKING_WEIGHTS.explicitInclude : 0) +
      (restrictSet !== null ? RANKING_WEIGHTS.changed : 0) +
      (changedSetHas(options.restrictToFiles, target.relativePath) ? RANKING_WEIGHTS.changed : 0) +
      (activeTaskText.length > 0 && activeTaskText.includes(target.relativePath)
        ? RANKING_WEIGHTS.activeTaskRef
        : 0) +
      (isInstructionScope(target.relativePath) ? RANKING_WEIGHTS.instructionScope : 0) +
      (instructionRefs.has(target.relativePath) ? RANKING_WEIGHTS.importProximity : 0) +
      (isReadmeOrArchitecture(target.relativePath) ? RANKING_WEIGHTS.readmeArchRelevance : 0) +
      typeWeight(target.relativePath);

    const penalty = Math.min(
      Math.floor(Buffer.byteLength(content) / 4096) * RANKING_WEIGHTS.sizePenaltyPer4k,
      RANKING_WEIGHTS.sizePenaltyCap,
    );

    scored.push({
      relativePath: target.relativePath,
      content,
      score: score - penalty,
      tokens: estimateTokens(content),
      hash,
      bytes: Buffer.byteLength(content),
    });
    if (scrubbed > 0) {
      manifestDraft.push({
        relativePath: target.relativePath,
        action: "scrubbed",
        reason: `${scrubbed} machine-local absolute path(s) scrubbed`,
        estimatedTokens: estimateTokens(content),
        sha256: hash,
        bytes: Buffer.byteLength(content),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score || (a.relativePath < b.relativePath ? -1 : 1));

  const included: Scored[] = [];
  for (const candidate of scored) {
    if (usedTokens + candidate.tokens <= maxTokens) {
      included.push(candidate);
      usedTokens += candidate.tokens;
      manifestDraft.push({
        relativePath: candidate.relativePath,
        action: "included",
        reason: `score ${candidate.score}`,
        estimatedTokens: candidate.tokens,
        sha256: candidate.hash,
        bytes: candidate.bytes,
      });
    } else {
      manifestDraft.push({
        relativePath: candidate.relativePath,
        action: "excluded",
        reason: `budget exhausted (needs ${candidate.tokens}, remaining ${maxTokens - usedTokens})`,
        estimatedTokens: candidate.tokens,
        sha256: candidate.hash,
        bytes: candidate.bytes,
      });
    }
  }

  const manifest = finalizeManifest(manifestDraft);
  const identity = getPackageIdentity();
  const markdown = renderMarkdown(identity.version, maxTokens, usedTokens, sectionBodies, included);
  const json = renderJson(
    identity.version,
    maxTokens,
    usedTokens,
    manifest,
    sectionBodies,
    included,
  );

  // Final defense-in-depth: the same catalog rules verify EMITTED surfaces.
  assertNoSecretShapes(markdown);
  assertNoSecretShapes(json);

  return {
    format: options.format ?? "markdown",
    markdown,
    json,
    manifest,
    totalIncludedTokens: usedTokens,
    maxTokens,
  };
}

interface Scored {
  relativePath: string;
  content: string;
  score: number;
  tokens: number;
  hash: string;
  bytes: number;
}

function changedSetHas(
  restrictToFiles: readonly string[] | undefined,
  relativePath: string,
): boolean {
  if (restrictToFiles === undefined) return false;
  return restrictToFiles.includes(relativePath);
}

function isInstructionScope(relativePath: string): boolean {
  return (
    /^(AGENTS|CLAUDE|GEMINI)\.md$/.test(relativePath) ||
    relativePath.startsWith(".agents/") ||
    relativePath.startsWith(".github/") ||
    relativePath.startsWith("docs/tasks/")
  );
}

function isReadmeOrArchitecture(relativePath: string): boolean {
  const base = relativePath.split("/").pop() ?? "";
  return (
    /^(README\.md|ARCHITECTURE\.md|CONTRIBUTING\.md)$/i.test(base) ||
    relativePath.startsWith("docs/")
  );
}

function typeWeight(relativePath: string): number {
  if (/\.md$/i.test(relativePath)) return RANKING_WEIGHTS.baseByType;
  if (/\.(ts|tsx|js|mjs|cjs|py|go|rs|java|cs)$/.test(relativePath)) return 8;
  if (/\.(json|ya?ml|toml)$/.test(relativePath)) return 6;
  return 2;
}

function finalizeManifest(draft: readonly PackManifestEntry[]): PackManifestEntry[] {
  return [...draft].sort((a, b) =>
    a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0,
  );
}

function renderMarkdown(
  version: string,
  maxTokens: number,
  used: number,
  sections: Map<string, string>,
  files: readonly Scored[],
): string {
  const lines: string[] = [
    "# ACKit Context Pack",
    "",
    `ackit ${version}; budget ${used}/${maxTokens} tokens (${PACK_PREAMBLE_LABEL}).`,
    "",
  ];
  for (const [rel, body] of sections) {
    lines.push(`## ${rel}`, "", body.trim(), "");
  }
  for (const item of files) {
    lines.push(
      `## ${item.relativePath}`,
      "",
      "````",
      item.content.replace(/````/g, "`'`'`'"),
      "````",
      "",
    );
  }
  return lines.join("\n");
}

function renderJson(
  version: string,
  maxTokens: number,
  used: number,
  manifest: readonly PackManifestEntry[],
  sections: Map<string, string>,
  files: readonly Scored[],
): string {
  const contextSectionEntries = [...sections.entries()].map(([rel, body]) => ({
    id: rel.replace("(context)/", ""),
    content: body,
    estimatedTokens: estimateTokens(body),
    sha256: createHash("sha256").update(body).digest("hex"),
  }));
  const fileEntries = files.map((f) => ({
    relativePath: f.relativePath,
    content: f.content,
    estimatedTokens: f.tokens,
    sha256: f.hash,
    bytes: f.bytes,
  }));
  return `${JSON.stringify(
    {
      schemaVersion: PACK_SCHEMA_VERSION,
      tool: "ackit",
      version,
      budget: { maxTokens, totalIncludedTokens: used, estimator: PACK_PREAMBLE_LABEL },
      contextSections: contextSectionEntries,
      files: fileEntries,
      manifest,
    },
    null,
    2,
  )}\n`;
}

/**
 * Real guard: runs the CANONICAL secret catalog over emitted output. Throws
 * if any secret-shaped value leaked past the exclusion gates.
 */
export function assertNoSecretShapes(emitted: string): void {
  const hits = runSecretGate(emitted);
  if (hits.length > 0) {
    throw new Error(`internal error: secret-shaped value reached pack output (${hits.join(", ")})`);
  }
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}
