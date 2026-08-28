import { createHash } from "node:crypto";
import picomatch from "picomatch";
import { extractFrontmatter } from "../frontmatter.js";
import type { InstructionNode } from "../types.js";

export function detectConflicts(
  nodes: InstructionNode[],
  contents?: Map<string, string>,
): Array<{ nodeId: string; ruleId: "INSTR-CONFLICT"; key: string; values: [string, string] }> {
  const keyValues = new Map<string, Map<string, string>>();
  const contentMap = contents ?? new Map<string, string>();
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    // Prefer provided contents, fallback to empty
    const raw = contentMap.get(node.id) ?? "";
    if (raw.length === 0) continue;
    const { frontmatter } = extractFrontmatter(raw);
    if (frontmatter === null) continue;
    for (const [key, value] of Object.entries(frontmatter)) {
      if (
        [
          "applyTo",
          "includeScopes",
          "excludeScopes",
          "providerApplicability",
          "include_scopes",
          "exclude_scopes",
          "providers",
        ].includes(key)
      )
        continue;
      if (typeof value !== "string" && typeof value !== "boolean" && typeof value !== "number")
        continue;
      const vStr = String(value).toLowerCase();
      let map = keyValues.get(key);
      if (!map) {
        map = new Map();
        keyValues.set(key, map);
      }
      if (!map.has(vStr)) map.set(vStr, node.id);
    }
  }
  const out: Array<{
    nodeId: string;
    ruleId: "INSTR-CONFLICT";
    key: string;
    values: [string, string];
  }> = [];
  for (const [key, valMap] of keyValues) {
    if (valMap.size < 2) continue;
    const entries = [...valMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    const first = entries[0];
    const second = entries[1];
    if (!first || !second) continue;
    out.push({ nodeId: first[1], ruleId: "INSTR-CONFLICT", key, values: [first[0], second[0]] });
  }
  return out;
}

export function detectDuplicates(
  nodes: InstructionNode[],
  contents?: Map<string, string>,
): Array<{
  nodeId: string;
  duplicateOf: string;
  ruleId: "INSTR-DUPLICATE";
  kind: "exact" | "near";
}> {
  if (!contents) return [];
  const out: Array<{
    nodeId: string;
    duplicateOf: string;
    ruleId: "INSTR-DUPLICATE";
    kind: "exact" | "near";
  }> = [];
  const normalize = (c: string) =>
    c
      .replace(/^---[\s\S]*?---/, "")
      .replace(/\r\n/g, "\n")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  const seenExact = new Map<string, string>();
  const reported = new Set<string>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);
  // exact
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    const raw = contents.get(node.id);
    if (!raw) continue;
    const n = normalize(raw);
    if (n.length === 0) continue;
    const hash = createHash("sha256").update(n).digest("hex");
    const existing = seenExact.get(hash);
    if (existing) {
      out.push({
        nodeId: node.id,
        duplicateOf: existing,
        ruleId: "INSTR-DUPLICATE",
        kind: "exact",
      });
      reported.add(pairKey(node.id, existing));
    } else {
      seenExact.set(hash, node.id);
    }
  }
  // near
  const instructions = nodes.filter((n) => n.kind === "instruction");
  for (let i = 0; i < instructions.length; i++) {
    for (let j = i + 1; j < instructions.length; j++) {
      const a = instructions[i];
      const b = instructions[j];
      if (!a || !b) continue;
      const ca = contents.get(a.id);
      const cb = contents.get(b.id);
      if (!ca || !cb) continue;
      const na = normalize(ca);
      const nb = normalize(cb);
      if (na.length === 0 || nb.length === 0 || na === nb) continue;
      const pair = pairKey(a.id, b.id);
      if (reported.has(pair)) continue;
      const score = similarityInternal(na, nb);
      if (score >= 0.9) {
        // decide duplicateOf as earlier sorted id lexicographic (deterministic)
        const duplicateOf = a.id < b.id ? a.id : b.id;
        const nodeId = duplicateOf === a.id ? b.id : a.id;
        out.push({ nodeId, duplicateOf, ruleId: "INSTR-DUPLICATE", kind: "near" });
        reported.add(pair);
      }
    }
  }
  return out;
}

function similarityInternal(left: string, right: string): number {
  if (left.length === 0 || right.length === 0) return left === right ? 1 : 0;
  const grams = (text: string): Set<string> => {
    const set = new Set<string>();
    for (let i = 0; i < text.length - 2; i++) set.add(text.slice(i, i + 3));
    return set;
  };
  const a = grams(left);
  const b = grams(right);
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

export function detectShadowed(
  nodes: InstructionNode[],
): Array<{ nodeId: string; shadowedBy: string; ruleId: "INSTR-SHADOWED" }> {
  const out: Array<{ nodeId: string; shadowedBy: string; ruleId: "INSTR-SHADOWED" }> = [];
  const isStrictSubset = (candidate: string, container: string): boolean => {
    if (candidate === container) return false;
    if (container === "." || container === "") return candidate !== "." && candidate !== "";
    const nc = container.replace(/\/+$/, "");
    const nd = candidate.replace(/\/+$/, "");
    return nd === nc || nd.startsWith(`${nc}/`);
  };
  for (const weak of nodes) {
    if (weak.kind !== "instruction") continue;
    for (const strong of nodes) {
      if (strong.id === weak.id) continue;
      if (strong.kind !== "instruction") continue;
      if (!isStrictSubset(strong.scopeRoot, weak.scopeRoot)) continue;
      if (strong.precedence <= weak.precedence) continue;
      out.push({ nodeId: weak.id, shadowedBy: strong.id, ruleId: "INSTR-SHADOWED" });
      break;
    }
  }
  return out;
}

export function detectDead(
  nodes: InstructionNode[],
  repoFiles: string[],
): Array<{ nodeId: string; ruleId: "INSTR-UNREACHABLE" }> {
  const out: Array<{ nodeId: string; ruleId: "INSTR-UNREACHABLE" }> = [];
  const isAncestor = (scopeRoot: string, targetDir: string): boolean => {
    if (scopeRoot === "." || scopeRoot === "") return true;
    const ns = scopeRoot.replace(/\/+$/, "");
    return targetDir === ns || targetDir.startsWith(`${ns}/`);
  };
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    let matches = 0;
    if (node.applyTo !== null && node.applyTo.length > 0) {
      const matcher = picomatch(node.applyTo, { dot: true });
      for (const f of repoFiles)
        if (matcher(f)) {
          matches++;
          break;
        }
    } else if (node.includeScopes !== null && node.includeScopes.length > 0) {
      const matcher = picomatch(node.includeScopes, { dot: true });
      for (const f of repoFiles)
        if (matcher(f)) {
          matches++;
          break;
        }
    } else {
      for (const file of repoFiles) {
        const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : ".";
        if (isAncestor(node.scopeRoot, dir === "" ? "." : dir) || file === node.relativePath) {
          matches = 1;
          break;
        }
      }
      if (node.scopeRoot === "." || node.scopeRoot === "") matches = repoFiles.length > 0 ? 1 : 0;
    }
    if (matches === 0) out.push({ nodeId: node.id, ruleId: "INSTR-UNREACHABLE" });
  }
  return out;
}

export function analyzeGraph(
  graph: {
    nodes: InstructionNode[];
    diagnostics: { code: string; message: string; relativePath?: string }[];
  },
  repoFiles: string[],
  contents?: Map<string, string>,
): { code: string; message: string; relativePath?: string }[] {
  const diags: { code: string; message: string; relativePath?: string }[] = [];
  for (const c of detectConflicts(graph.nodes, contents)) {
    diags.push({
      code: c.ruleId,
      message: `conflicting '${c.key}': ${c.values.join(" vs ")}`,
      relativePath: graph.nodes.find((n) => n.id === c.nodeId)?.relativePath,
    });
  }
  for (const d of detectDuplicates(graph.nodes, contents)) {
    diags.push({
      code: d.ruleId,
      message: `duplicate ${d.kind} of ${d.duplicateOf}`,
      relativePath: graph.nodes.find((n) => n.id === d.nodeId)?.relativePath,
    });
  }
  for (const s of detectShadowed(graph.nodes)) {
    diags.push({
      code: s.ruleId,
      message: `shadowed by ${s.shadowedBy}`,
      relativePath: graph.nodes.find((n) => n.id === s.nodeId)?.relativePath,
    });
  }
  for (const dead of detectDead(graph.nodes, repoFiles)) {
    diags.push({
      code: dead.ruleId,
      message: "unreachable",
      relativePath: graph.nodes.find((n) => n.id === dead.nodeId)?.relativePath,
    });
  }
  return diags;
}
