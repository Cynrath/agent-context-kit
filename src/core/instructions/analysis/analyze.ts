import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import type { RepositoryRoot } from "../../filesystem/root.js";
import { GENERIC_ASSIGNMENT } from "../../scanner/rules/secret-rules.js";
import { iterLines } from "../../scanner/rules/shared.js";
import type { InstructionGraph, InstructionNode } from "../types.js";

/**
 * Deterministic instruction analysis (REQ-INSTR-006, REQ-SCAN-006).
 * Policy: conservative patterns only — MISSES are acceptable, WRONG conflicts
 * are not. No rule in this module emits critical severity: every check here
 * is either a structural fact (references, hashes) or an advisory pattern
 * match with captured evidence (MS§12.5 no-critical-without-evidence rule).
 */

export type AnalysisSeverity = "high" | "medium" | "low";

export interface InstructionAnalysisFinding {
  ruleId: string;
  severity: AnalysisSeverity;
  message: string;
  relativePath: string;
  relatedRelativePath?: string | undefined;
  documentationKey: string;
}

export interface AnalyzeInstructionsOptions {
  /** Tracked-file relative paths, used for unreachable-glob detection. */
  knownFiles?: readonly string[] | undefined;
}

const VIRTUAL_GLOBAL_PREFIX = "codex-global/";

export async function analyzeInstructions(
  root: RepositoryRoot,
  graph: InstructionGraph,
  options: AnalyzeInstructionsOptions = {},
): Promise<InstructionAnalysisFinding[]> {
  const contents = await loadNodeContents(root, graph.nodes);
  const findings: InstructionAnalysisFinding[] = [];
  findings.push(...detectConventionConflicts(graph.nodes, contents));
  findings.push(...detectDuplicates(graph.nodes, contents));
  findings.push(...detectStaleReferences(graph.nodes, contents, root));
  findings.push(...detectUnreachableGlobs(graph.nodes, options.knownFiles));
  findings.push(...detectAdvisorySecurity(graph.nodes, contents));
  return findings;
}

// ---------------------------------------------------------------------------
// Conventions (explicit key/value statements only)
// ---------------------------------------------------------------------------

interface ConventionHit {
  key: string;
  value: string;
}

const KNOWN_PACKAGE_MANAGERS = new Set(["pnpm", "npm", "yarn", "bun"]);

function extractConventions(content: string): ConventionHit[] {
  const hits: ConventionHit[] = [];
  for (const view of iterLines(content)) {
    const explicit = /package manager\s*[:=]\s*([A-Za-z]+)/i.exec(view.text);
    if (explicit !== null && explicit[1] !== undefined) {
      pushIfKnown(hits, "package-manager", explicit[1]);
      continue;
    }
    const imperative =
      /\b(?:use|prefer|always use|stick to)\s+([A-Za-z]+)\s+(?:as\s+)?(?:the\s+)?package manager/i.exec(
        view.text,
      );
    if (imperative !== null && imperative[1] !== undefined) {
      pushIfKnown(hits, "package-manager", imperative[1]);
    }
  }
  return hits;

  function pushIfKnown(target: ConventionHit[], key: string, rawValue: string): void {
    const value = rawValue.toLowerCase();
    if (key === "package-manager" && !KNOWN_PACKAGE_MANAGERS.has(value)) return;
    target.push({ key, value });
  }
}

function detectConventionConflicts(
  nodes: readonly InstructionNode[],
  contents: Map<string, string>,
): InstructionAnalysisFinding[] {
  const byKey = new Map<string, Map<string, string>>();
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    const content = contents.get(node.id);
    if (content === undefined) continue;
    for (const hit of extractConventions(content)) {
      const valueMap = byKey.get(hit.key) ?? new Map<string, string>();
      if (!valueMap.has(hit.value)) valueMap.set(hit.value, node.relativePath);
      byKey.set(hit.key, valueMap);
    }
  }
  const findings: InstructionAnalysisFinding[] = [];
  for (const [key, valueMap] of byKey) {
    if (valueMap.size < 2) continue;
    const entries = [...valueMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    const first = entries[0];
    const second = entries[1];
    if (first === undefined || second === undefined) continue;
    findings.push({
      ruleId: "ACKIT300",
      severity: "high",
      message: `conflicting '${key}' conventions: '${first[0]}' (${first[1]}) vs '${second[0]}' (${second[1]})`,
      relativePath: first[1],
      relatedRelativePath: second[1],
      documentationKey: "rules/ACKIT300",
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Duplicates: exact-normalized hash tier + near-duplicate similarity tier
// ---------------------------------------------------------------------------

export function normalizeForDuplicateCheck(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarity(left: string, right: string): number {
  if (left.length === 0 || right.length === 0) return left === right ? 1 : 0;
  const grams = (text: string): Set<string> => {
    const set = new Set<string>();
    for (let index = 0; index < text.length - 2; index += 1) {
      set.add(text.slice(index, index + 3));
    }
    return set;
  };
  const a = grams(left);
  const b = grams(right);
  let intersection = 0;
  for (const gram of a) if (b.has(gram)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export const EXACT_DUPLICATE_THRESHOLD = 1.0;
export const NEAR_DUPLICATE_THRESHOLD = 0.9;

function detectDuplicates(
  nodes: readonly InstructionNode[],
  contents: Map<string, string>,
): InstructionAnalysisFinding[] {
  const instructions = nodes.filter((node) => node.kind === "instruction");
  const findings: InstructionAnalysisFinding[] = [];
  const seenExact = new Map<string, string>();
  const reportedPairs = new Set<string>();
  for (const node of instructions) {
    const content = contents.get(node.id);
    if (content === undefined) continue;
    const normalized = normalizeForDuplicateCheck(content);
    if (normalized.length === 0) continue;
    const hash = createHash("sha256").update(normalized).digest("hex");
    const existingExact = seenExact.get(hash);
    if (existingExact !== undefined) {
      findings.push({
        ruleId: "ACKIT301",
        severity: "medium",
        message: `exact duplicate of ${existingExact} after normalization`,
        relativePath: node.relativePath,
        relatedRelativePath: existingExact,
        documentationKey: "rules/ACKIT301",
      });
      reportedPairs.add(pairKey(node.relativePath, existingExact));
      continue;
    }
    seenExact.set(hash, node.relativePath);
  }
  // Near-duplicate tier over distinct contents.
  for (let i = 0; i < instructions.length; i += 1) {
    for (let j = i + 1; j < instructions.length; j += 1) {
      const a = instructions[i];
      const b = instructions[j];
      if (a === undefined || b === undefined) continue;
      const ca = contents.get(a.id);
      const cb = contents.get(b.id);
      if (ca === undefined || cb === undefined) continue;
      const na = normalizeForDuplicateCheck(ca);
      const nb = normalizeForDuplicateCheck(cb);
      if (na.length === 0 || nb.length === 0 || na === nb) continue;
      const score = similarity(na, nb);
      if (score < NEAR_DUPLICATE_THRESHOLD) continue;
      const pair = pairKey(a.relativePath, b.relativePath);
      if (reportedPairs.has(pair)) continue;
      reportedPairs.add(pair);
      findings.push({
        ruleId: "ACKIT302",
        severity: "low",
        message: `near-duplicate content (similarity ${score.toFixed(2)})`,
        relativePath: a.relativePath,
        relatedRelativePath: b.relativePath,
        documentationKey: "rules/ACKIT302",
      });
    }
  }
  return findings;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

// ---------------------------------------------------------------------------
// Staleness: broken local markdown references recorded during discovery
// ---------------------------------------------------------------------------

function detectStaleReferences(
  nodes: readonly InstructionNode[],
  contents: Map<string, string>,
  root: RepositoryRoot,
): InstructionAnalysisFinding[] {
  void contents;
  void root;
  const findings: InstructionAnalysisFinding[] = [];
  for (const node of nodes) {
    if (node.status !== "broken-reference") continue;
    findings.push({
      ruleId: "ACKIT303",
      severity: "medium",
      message: "stale reference target missing or moved",
      relativePath: node.relativePath,
      documentationKey: "rules/ACKIT303",
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Unreachable path-specific instructions (glob matches nothing tracked)
// ---------------------------------------------------------------------------

function detectUnreachableGlobs(
  nodes: readonly InstructionNode[],
  knownFiles: readonly string[] | undefined,
): InstructionAnalysisFinding[] {
  if (knownFiles === undefined) return [];
  const findings: InstructionAnalysisFinding[] = [];
  for (const node of nodes) {
    if (node.applyTo === null || node.applyTo.length === 0) continue;
    const matcher = picomatch(node.applyTo, { dot: true });
    const anyMatch = knownFiles.some((file) => matcher(file));
    if (!anyMatch) {
      findings.push({
        ruleId: "ACKIT304",
        severity: "low",
        message: `applyTo globs [${node.applyTo.join(", ")}] match no tracked file`,
        relativePath: node.relativePath,
        documentationKey: "rules/ACKIT304",
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Advisory prompt-security checks (REQ-SCAN-006) — deterministic evidence only
// ---------------------------------------------------------------------------

const HIDDEN_UNICODE = /[\u200B-\u200F\u2060-\u2064\uFEFF]/u;
const EXTERNAL_REF = /\[[^\]]*\]\((https?:\/\/[^)]+)\)/i;
const MASSIVE_DATA_RUN = /[A-Za-z0-9+/=]{8192,}/;

function detectAdvisorySecurity(
  nodes: readonly InstructionNode[],
  contents: Map<string, string>,
): InstructionAnalysisFinding[] {
  const findings: InstructionAnalysisFinding[] = [];
  for (const node of nodes) {
    const content = contents.get(node.id);
    if (content === undefined) continue;

    if (HIDDEN_UNICODE.test(content)) {
      findings.push(advisory(node, "ACKIT310", "hidden Unicode control characters present"));
    }
    const external = EXTERNAL_REF.exec(content);
    if (external !== null) {
      findings.push({
        ...advisory(node, "ACKIT311", `references external URL ${external[1] ?? ""}`),
        severity: "low",
      });
    }
    if (MASSIVE_DATA_RUN.test(content)) {
      findings.push(advisory(node, "ACKIT313", "massive embedded data run detected"));
    }
    for (const view of iterLines(content)) {
      const match = GENERIC_ASSIGNMENT.exec(view.text);
      if (match !== null) {
        findings.push({
          ruleId: "ACKIT314",
          severity: "high",
          message: "credential-style literal embedded in instruction file",
          relativePath: node.relativePath,
          documentationKey: "rules/ACKIT314",
        });
        break;
      }
    }
    if (node.securityFlags.includes("root-escape-reference")) {
      findings.push({
        ruleId: "ACKIT312",
        severity: "high",
        message: "reference escapes the repository root",
        relativePath: node.relativePath,
        documentationKey: "rules/ACKIT312",
      });
    }
  }
  return findings;
}

function advisory(
  node: InstructionNode,
  ruleId: string,
  message: string,
): InstructionAnalysisFinding {
  return {
    ruleId,
    severity: "medium",
    message,
    relativePath: node.relativePath,
    documentationKey: `rules/${ruleId}`,
  };
}

async function loadNodeContents(
  root: RepositoryRoot,
  nodes: readonly InstructionNode[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const node of nodes) {
    if (node.relativePath.startsWith(VIRTUAL_GLOBAL_PREFIX)) continue;
    try {
      const buffer = await fsp.readFile(
        path.join(root.canonicalPath, ...node.relativePath.split("/")),
        "utf8",
      );
      map.set(node.id, buffer);
    } catch {
      // Unreadable nodes simply participate in no content-based checks.
    }
  }
  return map;
}
