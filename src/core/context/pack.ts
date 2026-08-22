import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import picomatch from "picomatch";
import { estimateTokens } from "../../shared/tokens.js";
import { getPackageIdentity } from "../../shared/version.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { collectScanTargets } from "../filesystem/scan-targets.js";
import { GENERIC_ASSIGNMENT } from "../scanner/rules/secret-rules.js";

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

const SECRET_TOKEN_SHAPES: readonly RegExp[] = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  /\bghp_[A-Za-z0-9]{36}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
];

const ABSOLUTE_PATH_PATTERNS: readonly RegExp[] = [
  /\b[A-Z]:\\(?:Users|Documents and Settings)\\[^\s"'`)\]]*/g,
  /\/home\/[^\s/"'`)\]]+/g,
  /\/Users\/[^\s/"'`)\]]+/g,
];

export interface PackCandidateInput {
  relativePath: string;
  content: string;
}

export interface PackManifestEntry {
  relativePath: string;
  action: "included" | "excluded" | "scrubbed";
  reason: string;
  estimatedTokens: number;
  sha256: string;
  bytes: number;
}

export interface BuildPackOptions {
  maxTokens?: number | undefined;
  includeGlobs?: readonly string[] | undefined;
  changedFiles?: readonly string[] | undefined;
  activeTaskContent?: string | undefined;
  instructionReferenceTargets?: readonly string[] | undefined;
  limits?: import("../filesystem/types.js").TraversalLimits | undefined;
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
 * Same repo+config ⇒ byte-identical output (no timestamps in contract).
 */
export async function buildContextPack(
  root: RepositoryRoot,
  options: BuildPackOptions & { format?: "markdown" | "json" | undefined } = {},
): Promise<PackResult> {
  const maxTokens = options.maxTokens ?? 100_000;
  const collection = await collectScanTargets(root, {
    skipClassification: true,
  });

  const includeMatch =
    options.includeGlobs && options.includeGlobs.length > 0
      ? picomatch([...options.includeGlobs], { dot: true })
      : null;
  const changedSet = new Set((options.changedFiles ?? []).map(toPosix));
  const instructionRefs = new Set((options.instructionReferenceTargets ?? []).map(toPosix));
  const activeTaskText = options.activeTaskContent ?? "";

  interface Scored {
    relativePath: string;
    content: string;
    score: number;
    tokens: number;
    hash: string;
    bytes: number;
  }

  const scored: Scored[] = [];
  const manifestDraft: PackManifestEntry[] = [];
  const seenHashes = new Map<string, string>();

  for (const target of collection.targets) {
    let content: string;
    try {
      content = await fsp.readFile(target.absolutePath, "utf8");
    } catch {
      continue;
    }

    // Safety gate 1: secrets → hard exclusion (REQ-GOV-005).
    const secretShape = SECRET_TOKEN_SHAPES.find((pattern) => pattern.test(content));
    const credentialAssignment = GENERIC_ASSIGNMENT.exec(content);
    if (secretShape !== undefined || credentialAssignment !== null) {
      manifestDraft.push(
        entry(
          target.relativePath,
          "excluded",
          `potential secret detected (${secretShape !== undefined ? "ACKIT001-shape" : "ACKIT003-shape"})`,
          content,
        ),
      );
      continue;
    }

    // Safety gate 2: dedupe by content hash.
    const hash = createHash("sha256").update(content).digest("hex");
    const originalOwner = seenHashes.get(hash);
    if (originalOwner !== undefined) {
      manifestDraft.push(
        entry(target.relativePath, "excluded", `duplicate of ${originalOwner}`, content),
      );
      continue;
    }
    seenHashes.set(hash, target.relativePath);

    // Safety gate 3: scrub machine-local absolute paths (REQ-GOV-004).
    let scrubbed = 0;
    for (const pattern of ABSOLUTE_PATH_PATTERNS) {
      content = content.replace(pattern, () => {
        scrubbed += 1;
        return "<local-path>";
      });
    }

    const score =
      (includeMatch?.(target.relativePath) ? RANKING_WEIGHTS.explicitInclude : 0) +
      (changedSet.has(target.relativePath) ? RANKING_WEIGHTS.changed : 0) +
      (activeTaskText.length > 0 && activeTaskText.includes(target.relativePath)
        ? RANKING_WEIGHTS.activeTaskRef
        : 0) +
      (isInstructionScope(target.relativePath) ? RANKING_WEIGHTS.instructionScope : 0) +
      (instructionRefs.has(target.relativePath) ? RANKING_WEIGHTS.importProximity : 0) +
      (isReadmeOrArchitecture(target.relativePath) ? RANKING_WEIGHTS.readmeArchRelevance : 0) +
      typeWeight(target.relativePath);

    const penalty = Math.min(
      Math.floor(target.sizeBytes / 4096) * RANKING_WEIGHTS.sizePenaltyPer4k,
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
        ...entry(
          target.relativePath,
          "scrubbed",
          `${scrubbed} machine-local absolute path(s) scrubbed`,
          content,
        ),
        sha256: hash,
      });
    }
  }

  // Deterministic order: score desc, then path asc.
  scored.sort((a, b) => b.score - a.score || (a.relativePath < b.relativePath ? -1 : 1));

  const included: Scored[] = [];
  let used = 0;
  for (const candidate of scored) {
    if (used + candidate.tokens <= maxTokens) {
      included.push(candidate);
      used += candidate.tokens;
      manifestDraft.push(includedEntry(candidate));
    } else {
      manifestDraft.push(
        entry(
          candidate.relativePath,
          "excluded",
          `budget exhausted (needs ${candidate.tokens}, remaining ${maxTokens - used})`,
          candidate.content,
        ),
      );
    }
  }

  const manifest = finalizeManifest(manifestDraft);
  const identity = getPackageIdentity();
  const markdown = renderMarkdown(identity.version, maxTokens, used, included, manifest);
  const json = renderJson(identity.version, maxTokens, used, manifest);
  return {
    format: options.format ?? "markdown",
    markdown,
    json,
    manifest,
    totalIncludedTokens: used,
    maxTokens,
  };
}

function entry(
  relativePath: string,
  action: PackManifestEntry["action"],
  reason: string,
  content: string,
): PackManifestEntry {
  return {
    relativePath,
    action,
    reason,
    estimatedTokens: estimateTokens(content),
    sha256: createHash("sha256").update(content).digest("hex"),
    bytes: Buffer.byteLength(content),
  };
}

function includedEntry(candidate: Scored): PackManifestEntry {
  return {
    relativePath: candidate.relativePath,
    action: "included",
    reason: `score ${candidate.score}`,
    estimatedTokens: candidate.tokens,
    sha256: candidate.hash,
    bytes: candidate.bytes,
  };
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
  included: readonly Scored[],
  _manifest: readonly PackManifestEntry[],
): string {
  const lines: string[] = [
    `# ACKit Context Pack`,
    "",
    `ackit ${version}; budget ${used}/${maxTokens} tokens (${PACK_PREAMBLE_LABEL}).`,
    "",
  ];
  for (const item of included) {
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

interface Scored {
  relativePath: string;
  content: string;
  score: number;
  tokens: number;
  hash: string;
  bytes: number;
}

function renderJson(
  version: string,
  maxTokens: number,
  used: number,
  manifest: readonly PackManifestEntry[],
): string {
  return `${JSON.stringify(
    {
      schemaVersion: PACK_SCHEMA_VERSION,
      tool: "ackit",
      version,
      budget: { maxTokens, totalIncludedTokens: used, estimator: PACK_PREAMBLE_LABEL },
      manifest,
    },
    null,
    2,
  )}\n`;
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

/** Final defense-in-depth guard for emitted artifacts. */
export function assertNoSecretShapes(emitted: string): void {
  for (const pattern of SECRET_TOKEN_SHAPES) {
    if (pattern.test(emitted)) {
      throw new Error("internal error: secret-shaped value reached pack output");
    }
  }
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}
