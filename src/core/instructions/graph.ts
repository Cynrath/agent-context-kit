import { createHash } from "node:crypto";
import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import { estimateTokens } from "../../shared/tokens.js";
import {
  isInsideRoot,
  normalizeRelativePath as normalizeRelativePathFs,
} from "../filesystem/paths.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { extractFrontmatter, normalizeApplyTo } from "./frontmatter.js";
import { checksumContent, scanReferences } from "./references.js";
import type {
  BuildGraphOptions,
  DiscoveryDiagnostic,
  EffectiveStackInfo,
  InstructionGraph,
  InstructionNode,
  ProvenanceEntry,
  ProviderId,
} from "./types.js";
import { INSTRUCTION_GRAPH_SCHEMA_VERSION, InstructionNodeSchema, PROVIDERS } from "./types.js";

export const MANAGED_START_MARKER = "ackit:managed:start";
export const MANAGED_END_MARKER = "ackit:managed:end";

interface SurfaceMatch {
  provider: ProviderId | "shared";
  kind: "instruction" | "skill";
  relativePath: string;
  skillName?: string | undefined;
}

const CODEX_OVERRIDE_BASENAME = "AGENTS.override.md";
const CODEX_BASENAME = "AGENTS.md";

const DEFAULT_MAX_NODES = 2000;
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_APPLYTO_GLOBS = 100;

const PROVIDER_ORDER: Record<string, number> = {
  codex: 0,
  claude: 1,
  gemini: 2,
  copilot: 3,
  shared: 4,
};

function classifySurface(relativePath: string): SurfaceMatch | null {
  const posixPath = toPosix(relativePath);
  const segments = posixPath.split("/");
  const basename = segments[segments.length - 1] ?? "";

  const skillMatch = /^\.agents\/skills\/([^/]+)\/SKILL\.md$/.exec(posixPath);
  if (skillMatch !== null) {
    return { provider: "shared", kind: "skill", relativePath: posixPath, skillName: skillMatch[1] };
  }
  if (posixPath.startsWith(".github/instructions/") && basename.endsWith(".instructions.md")) {
    return { provider: "copilot", kind: "instruction", relativePath: posixPath };
  }
  if (posixPath === ".github/copilot-instructions.md") {
    return { provider: "copilot", kind: "instruction", relativePath: posixPath };
  }
  if (basename === CODEX_OVERRIDE_BASENAME || basename === CODEX_BASENAME) {
    return { provider: "codex", kind: "instruction", relativePath: posixPath };
  }
  if (basename === "CLAUDE.md")
    return { provider: "claude", kind: "instruction", relativePath: posixPath };
  if (basename === "GEMINI.md")
    return { provider: "gemini", kind: "instruction", relativePath: posixPath };
  return null;
}

/**
 * Builds the resolved instruction graph v2 (REQ-V020-D-001..003, ADR-0017).
 * Discovery never escapes the repository root; every read goes through the
 * canonical root boundary. Provider adapters implement only documented
 * semantics: codex (AGENTS family incl. override + nesting + optional
 * global dir seam), claude (CLAUDE.md), gemini (GEMINI.md), copilot
 * (repo-wide + applyTo path-specific *.instructions.md).
 */
export async function buildInstructionGraph(
  root: RepositoryRoot,
  options: BuildGraphOptions = {},
): Promise<InstructionGraph> {
  if (options.signal?.aborted) {
    throw new DOMException("buildInstructionGraph aborted", "AbortError");
  }
  const maxTokens = options.maxTokenEstimatePerFile ?? 20000;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxApplyToGlobs = options.maxApplyToGlobs ?? DEFAULT_MAX_APPLYTO_GLOBS;
  const diagnostics: DiscoveryDiagnostic[] = [];
  const nodes: InstructionNode[] = [];

  const walkRoot = await fsp.realpath(root.canonicalPath);
  if (options.signal?.aborted) {
    throw new DOMException("buildInstructionGraph aborted", "AbortError");
  }
  const allFiles = await listFiles(walkRoot);
  const repoFilesPosix: string[] = [];

  for (const absoluteFile of allFiles) {
    if (options.signal?.aborted) {
      throw new DOMException("buildInstructionGraph aborted", "AbortError");
    }
    // Symlink canonicalization before scope match (REQ-V020-D-002)
    let canonicalAbsolute: string;
    try {
      canonicalAbsolute = await fsp.realpath(absoluteFile);
    } catch {
      canonicalAbsolute = absoluteFile;
    }
    // Outside-root check via isInsideRoot
    if (!isInsideRoot(walkRoot, canonicalAbsolute)) {
      diagnostics.push({
        code: "FS-PATH-ESCAPES-ROOT",
        message: `realpath escapes repository root: ${toPosix(path.relative(walkRoot, canonicalAbsolute))}`,
        relativePath: toPosix(path.relative(walkRoot, absoluteFile)),
      });
      continue;
    }
    const relativePathRaw = toPosix(path.relative(walkRoot, canonicalAbsolute));
    // POSIX normalization + drive/UNC rejection already handled by realpath; but also
    // validate via normalizeRelativePathFs
    const norm = normalizeRelativePathFs(relativePathRaw);
    if (!norm.ok) {
      diagnostics.push({
        code: "FS-PATH-OUTSIDE-ROOT",
        message: `rejected absolute/outside path: ${relativePathRaw}`,
        relativePath: relativePathRaw,
      });
      continue;
    }
    const relativePath = norm.value;
    // Collect repoFiles for dead detection (posix relative, all files not just instruction surfaces)
    repoFilesPosix.push(relativePath);

    const surface = classifySurface(relativePath);
    if (surface === null) continue;

    // Track provenance for realpath
    const provenance: ProvenanceEntry[] = [];
    if (canonicalAbsolute !== absoluteFile) {
      provenance.push({ source: "realpath", reason: "realpath-resolved" });
    }

    try {
      const content = await fsp.readFile(canonicalAbsolute, "utf8");
      const node = await buildNode(
        root,
        surface,
        content,
        maxTokens,
        provenance,
        maxApplyToGlobs,
        diagnostics,
      );
      // Depth limit diagnostic
      if (node.depth > maxDepth) {
        diagnostics.push({
          code: "INSTR-LIMIT-DEPTH",
          message: `depth ${node.depth} exceeds maxDepth ${maxDepth}`,
          relativePath: node.relativePath,
        });
      }
      // ApplyTo globs limit already handled inside buildNode
      nodes.push(node);
    } catch (error) {
      diagnostics.push({
        code: "INSTR-READ-FAILED",
        message: (error as Error).message,
        relativePath,
      });
    }
  }

  if (options.codexGlobalDir !== undefined) {
    if (options.signal?.aborted)
      throw new DOMException("buildInstructionGraph aborted", "AbortError");
    const globalNode = await readCodexGlobalNode(options.codexGlobalDir);
    if (globalNode !== null) nodes.push(globalNode);
  }

  // Deterministic initial ordering by id before orderIndex assignment (per ADR-0017)
  nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // Assign orderIndex
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    if (n) n.orderIndex = i;
  }

  // Size limit: maxNodes truncation deterministically (sorted order keep first N)
  let truncatedNodes = nodes;
  if (nodes.length > maxNodes) {
    diagnostics.push({
      code: "INSTR-LIMIT-NODES",
      message: `truncated ${nodes.length}→${maxNodes}`,
      relativePath: undefined,
    });
    truncatedNodes = nodes.slice(0, maxNodes);
  }

  // Deterministic final order: depth ASC → precedence ASC → provider tie-break → id → orderIndex
  truncatedNodes.sort(compareNodes);

  // Re-assign orderIndex after final sort? Keep original insertion order for stability, but per spec
  // orderIndex is stable insertion order (0..N-1) after initial id sort. So we keep earlier index.

  // Run analysis passes (conflict/duplicate/shadow/dead/cycle)
  // We need contents for duplicate detection
  const contentsMap = new Map<string, string>();
  for (const node of truncatedNodes) {
    if (node.relativePath.startsWith("codex-global/")) continue;
    try {
      const buf = await fsp.readFile(path.join(walkRoot, ...node.relativePath.split("/")), "utf8");
      contentsMap.set(node.id, buf);
    } catch {
      // virtual or unreadable
    }
  }

  // Duplicate detection (INSTR-DUPLICATE) — populate duplicateOf
  const duplicateDiagnostics = detectDuplicatesPure(truncatedNodes, contentsMap);
  for (const d of duplicateDiagnostics) {
    const target = truncatedNodes.find((n) => n.id === d.nodeId);
    if (target) target.duplicateOf = d.duplicateOf;
    diagnostics.push({ code: d.ruleId, message: d.message, relativePath: d.relativePath });
  }

  // Shadow detection (INSTR-SHADOWED)
  const shadowed = detectShadowedPure(truncatedNodes);
  for (const s of shadowed) {
    const target = truncatedNodes.find((n) => n.id === s.nodeId);
    if (target) target.shadowedBy = s.shadowedBy;
    diagnostics.push({
      code: s.ruleId,
      message: `shadowed by ${s.shadowedBy}`,
      relativePath: s.relativePath,
    });
  }

  // Conflict detection (INSTR-CONFLICT) — frontmatter literal conflicts
  const conflicts = detectConflictsPure(truncatedNodes, contentsMap);
  for (const c of conflicts) {
    diagnostics.push({ code: c.ruleId, message: c.message, relativePath: c.relativePath });
    const aNode = truncatedNodes.find((n) => n.relativePath === c.relativePath);
    const bNode = truncatedNodes.find((n) => n.relativePath === c.relatedRelativePath);
    if (aNode && !aNode.conflicts.includes(c.relatedRelativePath ?? ""))
      aNode.conflicts.push(c.relatedRelativePath ?? "");
    if (bNode && !bNode.conflicts.includes(c.relativePath ?? ""))
      bNode.conflicts.push(c.relativePath);
  }

  // Dead/unreachable detection (INSTR-UNREACHABLE)
  const dead = detectDeadPure(truncatedNodes, repoFilesPosix);
  for (const d of dead) {
    diagnostics.push({
      code: d.ruleId,
      message: "scope matches zero files",
      relativePath: d.relativePath,
    });
    const target = truncatedNodes.find((n) => n.id === d.nodeId);
    if (target) target.status = "unreachable";
  }

  // Cycle detection on references graph (INSTR-CYCLE-SKIPPED)
  const cycleDiag = detectReferenceCycles(truncatedNodes);
  if (cycleDiag) diagnostics.push(cycleDiag);

  // Validate each node via zod (migration shim defaults fill missing)
  for (const node of truncatedNodes) {
    InstructionNodeSchema.parse(node);
  }

  return { schemaVersion: INSTRUCTION_GRAPH_SCHEMA_VERSION, nodes: truncatedNodes, diagnostics };
}

async function buildNode(
  root: RepositoryRoot,
  surface: SurfaceMatch,
  content: string,
  maxTokens: number,
  provenanceBase: ProvenanceEntry[],
  maxApplyToGlobs: number,
  diagnostics: DiscoveryDiagnostic[],
): Promise<InstructionNode> {
  const depth = surface.relativePath.split("/").length - 1;
  let applyTo: string[] | null = null;
  let includeScopes: string[] | null = null;
  let excludeScopes: string[] | null = null;
  let providerApplicability: ProviderId[] | null = null;
  const provenance: ProvenanceEntry[] = [...provenanceBase];

  // Extract frontmatter for applyTo / includeScopes / excludeScopes / providerApplicability
  // All instruction files may carry these; copilot applyTo is primary but we generalize.
  const { frontmatter } = extractFrontmatter(content);
  if (frontmatter !== null) {
    // applyTo for copilot path-specific or any file that declares it
    if (
      surface.provider === "copilot" &&
      surface.relativePath.startsWith(".github/instructions/")
    ) {
      applyTo = normalizeApplyTo(frontmatter["applyTo"]);
      if (applyTo !== null)
        provenance.push({ source: "applyTo", reason: `applyTo ${applyTo.join(",")}` });
    } else if (frontmatter["applyTo"] !== undefined) {
      const v = normalizeApplyTo(frontmatter["applyTo"]);
      if (v !== null) {
        applyTo = v;
        provenance.push({ source: "applyTo", reason: `applyTo ${v.join(",")}` });
      }
    }
    // includeScopes / excludeScopes (globs)
    const inc = frontmatter["includeScopes"] ?? frontmatter["include_scopes"];
    if (inc !== undefined) {
      const norm = normalizeGlobArray(inc);
      if (norm !== null) {
        includeScopes = norm;
        provenance.push({ source: "includeScopes", reason: `includeScopes ${norm.join(",")}` });
      }
    }
    const exc = frontmatter["excludeScopes"] ?? frontmatter["exclude_scopes"];
    if (exc !== undefined) {
      const norm = normalizeGlobArray(exc);
      if (norm !== null) {
        excludeScopes = norm;
        provenance.push({ source: "excludeScopes", reason: `excludeScopes ${norm.join(",")}` });
      }
    }
    const pa = frontmatter["providerApplicability"] ?? frontmatter["providers"];
    if (pa !== undefined) {
      const arr = normalizeProviderApplicability(pa);
      if (arr !== null) {
        providerApplicability = arr;
        provenance.push({
          source: "providerApplicability",
          reason: `providerApplicability ${arr.join(",")}`,
        });
      }
    }
  }

  // Apply glob length cap and maxApplyToGlobs
  if (applyTo !== null && applyTo.length > maxApplyToGlobs) {
    diagnostics.push({
      code: "INSTR-LIMIT-GLOBS",
      message: `applyTo globs ${applyTo.length} exceeds maxApplyToGlobs ${maxApplyToGlobs}`,
      relativePath: surface.relativePath,
    });
    applyTo = applyTo.slice(0, maxApplyToGlobs);
  }
  if (includeScopes !== null && includeScopes.length > maxApplyToGlobs) {
    diagnostics.push({
      code: "INSTR-LIMIT-GLOBS",
      message: `includeScopes globs ${includeScopes.length} exceeds maxApplyToGlobs ${maxApplyToGlobs}`,
      relativePath: surface.relativePath,
    });
    includeScopes = includeScopes.slice(0, maxApplyToGlobs);
  }
  if (excludeScopes !== null && excludeScopes.length > maxApplyToGlobs) {
    diagnostics.push({
      code: "INSTR-LIMIT-GLOBS",
      message: `excludeScopes globs ${excludeScopes.length} exceeds maxApplyToGlobs ${maxApplyToGlobs}`,
      relativePath: surface.relativePath,
    });
    excludeScopes = excludeScopes.slice(0, maxApplyToGlobs);
  }

  const managed = content.includes(MANAGED_START_MARKER) && content.includes(MANAGED_END_MARKER);

  const refScan = scanReferences({
    relativePath: surface.relativePath,
    content,
    isInsideRoot: () => true,
  });

  let status: InstructionNode["status"] = "ok";
  const tokenEstimate = estimateTokens(content);
  if (tokenEstimate > maxTokens) status = "oversized";
  else if (await hasBrokenReference(root, surface.relativePath, refScan.references)) {
    status = "broken-reference";
  }

  const id =
    surface.kind === "skill"
      ? `skill:${surface.skillName}`
      : `instr:${surface.provider}:${surface.relativePath}`;

  // Provenance: scopeRoot
  provenance.push({
    source: "scopeRoot",
    reason: `scopeRoot ${path.posix.dirname(surface.relativePath)} depth ${depth}`,
  });

  return InstructionNodeSchema.parse({
    id,
    provider: surface.provider,
    kind: surface.kind,
    relativePath: surface.relativePath,
    scopeRoot: path.posix.dirname(surface.relativePath),
    applyTo,
    depth,
    precedence: computePrecedence(surface, depth, applyTo !== null),
    managed,
    checksum: checksumContent(content),
    tokenEstimate,
    status,
    conflicts: [],
    duplicates: [],
    references: refScan.references,
    securityFlags: refScan.securityFlags,
    includeScopes,
    excludeScopes,
    providerApplicability,
    provenance,
    orderIndex: 0,
    shadowedBy: null,
    duplicateOf: null,
  });
}

function normalizeGlobArray(value: unknown): string[] | null {
  if (typeof value === "string" && value.trim().length > 0) {
    const v = value.trim();
    if (v.length > 500) return null;
    return [v];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const e of value) {
      if (typeof e !== "string") continue;
      const trimmed = e.trim();
      if (trimmed.length === 0 || trimmed.length > 500) continue;
      out.push(trimmed);
    }
    return out.length > 0 ? out : null;
  }
  return null;
}

function normalizeProviderApplicability(value: unknown): ProviderId[] | null {
  const allowed = new Set(PROVIDERS);
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (allowed.has(v as ProviderId)) return [v as ProviderId];
    return null;
  }
  if (Array.isArray(value)) {
    const out: ProviderId[] = [];
    for (const e of value) {
      if (typeof e !== "string") continue;
      const v = e.trim().toLowerCase();
      if (allowed.has(v as ProviderId)) out.push(v as ProviderId);
    }
    return out.length > 0 ? [...new Set(out)] : null;
  }
  return null;
}

/**
 * Precedence tiers (documented, deterministic):
 *   0–999   codex AGENTS family: depth*10 (+50 for AGENTS.override.md closer-scope override)
 *   100–199 single-provider roots (claude/gemini/copilot repo-wide): 100 + depth*10
 *   1000+   path-specific applyTo instructions: 1000 + depth*10
 *   Global codex AGENTS.md (outside repo) is always weakest: precedence 0 handled via dedicated node below.
 * Ordering (v2 canonical): depth ASC → precedence ASC → provider tie-break (codex<claude<gemini<copilot<shared) → id lexicographic → orderIndex ASC
 */
function computePrecedence(surface: SurfaceMatch, depth: number, pathSpecific: boolean): number {
  if (pathSpecific) return 1000 + depth * 10;
  if (surface.provider === "copilot") return 100 + depth * 10;
  if (surface.provider === "claude" || surface.provider === "gemini") return 100 + depth * 10;
  const overrideBonus = surface.relativePath.endsWith(CODEX_OVERRIDE_BASENAME) ? 50 : 0;
  return depth * 10 + 1 + overrideBonus;
}

function compareNodes(a: InstructionNode, b: InstructionNode): number {
  if (a.depth !== b.depth) return a.depth - b.depth;
  if (a.precedence !== b.precedence) return a.precedence - b.precedence;
  const pa = PROVIDER_ORDER[a.provider] ?? 99;
  const pb = PROVIDER_ORDER[b.provider] ?? 99;
  if (pa !== pb) return pa - pb;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.orderIndex - b.orderIndex;
}

async function hasBrokenReference(
  root: RepositoryRoot,
  relativePath: string,
  references: readonly string[],
): Promise<boolean> {
  for (const reference of references) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) continue;
    if (!reference.endsWith(".md")) continue;
    const containingDir = path.posix.dirname(relativePath);
    const joined = containingDir === "." ? reference : `${containingDir}/${reference}`;
    const normalized = normalizeRelative(joined);
    if (normalized === null) continue;
    try {
      await fsp.access(path.join(root.canonicalPath, ...normalized.split("/")));
    } catch {
      return true;
    }
  }
  return false;
}

function normalizeRelative(input: string): string | null {
  const segments: string[] = [];
  for (const part of input.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments.join("/");
}

/** Codex global instructions live outside the repo; modeled as a stable virtual path. */
async function readCodexGlobalNode(codexGlobalDir: string): Promise<InstructionNode | null> {
  const globalFilePath = path.join(codexGlobalDir, "AGENTS.md");
  let content: string;
  try {
    content = await fsp.readFile(globalFilePath, "utf8");
  } catch {
    return null;
  }
  const refScan = scanReferences({
    relativePath: "AGENTS.md",
    content,
    isInsideRoot: () => true,
  });
  const tokenEstimate = estimateTokens(content);
  return InstructionNodeSchema.parse({
    id: "instr:codex:codex-global",
    provider: "codex",
    kind: "instruction",
    relativePath: "codex-global/AGENTS.md",
    scopeRoot: "codex-global",
    applyTo: null,
    depth: 0,
    precedence: 0,
    managed: false,
    checksum: checksumContent(content),
    tokenEstimate,
    status: tokenEstimate > 20000 ? "oversized" : "ok",
    conflicts: [],
    duplicates: [],
    references: refScan.references,
    securityFlags: refScan.securityFlags,
    includeScopes: null,
    excludeScopes: null,
    providerApplicability: null,
    provenance: [{ source: "codex-global", reason: "global seam" }],
    orderIndex: 0,
    shadowedBy: null,
    duplicateOf: null,
  });
}

async function listFiles(dirRoot: string): Promise<string[]> {
  const out: string[] = [];
  const skip = new Set([".git", "node_modules", ".ackit", "artifacts", "dist", "coverage"]);
  async function visit(dir: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        // Avoid following symlink directories to prevent cycles; but still need to handle
        // symlinked files. For directories that are symlinks, we will attempt realpath check later.
        try {
          const stat = await fsp.lstat(absolute);
          if (stat.isSymbolicLink()) {
            // Resolve and check if directory symlink points inside root and not visited
            const real = await fsp.realpath(absolute);
            if (!isInsideRoot(dirRoot, real)) continue;
            // For symlinked directories, we still want to visit the real target but avoid loops
            // We use a simple visited set via out path dedup; skip if already visited real path
            // To keep determinism, visit the real path's contents as if they were here, but record
            // actual symlink absolute paths for files? For simplicity, visit real target.
            await visit(real);
            continue;
          }
        } catch {
          // fall through to normal
        }
        await visit(absolute);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        out.push(absolute);
      }
    }
  }
  await visit(dirRoot);
  return out.sort();
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

// ---------------------------------------------------------------------------
// Analysis pure functions (deterministic, no LLM)
// ---------------------------------------------------------------------------

function normalizeForDuplicate(content: string): string {
  return content
    .replace(/^---[\s\S]*?---/, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\s+/g, " ");
}

function detectDuplicatesPure(
  nodes: InstructionNode[],
  contents: Map<string, string>,
): Array<{
  nodeId: string;
  duplicateOf: string;
  ruleId: string;
  message: string;
  relativePath: string;
}> {
  const out: Array<{
    nodeId: string;
    duplicateOf: string;
    ruleId: string;
    message: string;
    relativePath: string;
  }> = [];
  const seenExact = new Map<string, InstructionNode>();
  const reportedPairs = new Set<string>();
  // Exact SHA-256 normalized content identical → INSTR-DUPLICATE exact
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    const raw = contents.get(node.id);
    if (raw === undefined) continue;
    const normalized = normalizeForDuplicate(raw);
    if (normalized.length === 0) continue;
    const hash = createHash("sha256").update(normalized).digest("hex");
    const existing = seenExact.get(hash);
    if (existing !== undefined) {
      // Weaker node = higher orderIndex / higher precedence? Use compareNodes ordering: stronger is earlier.
      // For deterministic, the earlier sorted node is stronger.
      const stronger = compareNodes(existing, node) <= 0 ? existing : node;
      const weaker = stronger === existing ? node : existing;
      out.push({
        nodeId: weaker.id,
        duplicateOf: stronger.id,
        ruleId: "INSTR-DUPLICATE",
        message: `exact duplicate of ${stronger.id}`,
        relativePath: weaker.relativePath,
      });
      reportedPairs.add(pairKey(weaker.id, stronger.id));
    } else {
      seenExact.set(hash, node);
    }
  }
  // Near duplicate: trigram similarity >0.90
  const instructionNodes = nodes.filter((n) => n.kind === "instruction");
  for (let i = 0; i < instructionNodes.length; i += 1) {
    for (let j = i + 1; j < instructionNodes.length; j += 1) {
      const a = instructionNodes[i]!;
      const b = instructionNodes[j]!;
      const ca = contents.get(a.id);
      const cb = contents.get(b.id);
      if (ca === undefined || cb === undefined) continue;
      const na = normalizeForDuplicate(ca);
      const nb = normalizeForDuplicate(cb);
      if (na.length === 0 || nb.length === 0 || na === nb) continue;
      const score = trigramSimilarity(na.toLowerCase(), nb.toLowerCase());
      if (score < 0.9) continue;
      const pair = pairKey(a.id, b.id);
      if (reportedPairs.has(pair)) continue;
      reportedPairs.add(pair);
      // Weaker is later in sorted order
      const stronger = compareNodes(a, b) <= 0 ? a : b;
      const weaker = stronger === a ? b : a;
      out.push({
        nodeId: weaker.id,
        duplicateOf: stronger.id,
        ruleId: "INSTR-DUPLICATE",
        message: `near-duplicate similarity ${score.toFixed(2)} of ${stronger.id}`,
        relativePath: weaker.relativePath,
      });
    }
  }
  return out;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

function trigramSimilarity(left: string, right: string): number {
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

function detectShadowedPure(
  nodes: InstructionNode[],
): Array<{ nodeId: string; shadowedBy: string; ruleId: string; relativePath: string }> {
  const out: Array<{ nodeId: string; shadowedBy: string; ruleId: string; relativePath: string }> =
    [];
  for (const weak of nodes) {
    if (weak.kind !== "instruction") continue;
    for (const strong of nodes) {
      if (strong.id === weak.id) continue;
      if (strong.kind !== "instruction") continue;
      // Strict subset: strong scope is strict subset of weak's effective scope AND precedence higher
      // For codex family, scopeRoot containment defines scope.
      // For others, we use same logic: if strong's scopeRoot is descendant of weak's scopeRoot, it's more specific.
      if (!isStrictSubset(strong.scopeRoot, weak.scopeRoot)) continue;
      if (strong.precedence <= weak.precedence) continue;
      // Also require that both would apply to some common path (overlap). Approximation: if strong's scope is subset, they overlap.
      out.push({
        nodeId: weak.id,
        shadowedBy: strong.id,
        ruleId: "INSTR-SHADOWED",
        relativePath: weak.relativePath,
      });
      break; // only first shadower
    }
  }
  return out;
}

function isStrictSubset(candidate: string, container: string): boolean {
  // candidate is stricter (more specific) if container is ancestor of candidate and not equal and depth larger
  if (candidate === container) return false;
  if (container === "." || container === "") return candidate !== "." && candidate !== "";
  const normContainer = container.replace(/\/+$/, "");
  const normCandidate = candidate.replace(/\/+$/, "");
  if (normCandidate === normContainer) return false;
  return normCandidate === normContainer || normCandidate.startsWith(`${normContainer}/`);
}

function detectConflictsPure(
  nodes: InstructionNode[],
  contents: Map<string, string>,
): Array<{ ruleId: string; message: string; relativePath: string; relatedRelativePath?: string }> {
  const out: Array<{
    ruleId: string;
    message: string;
    relativePath: string;
    relatedRelativePath?: string;
  }> = [];
  // Simple frontmatter key/value conflict heuristic: look for same key with opposite literal values
  // We check for keys where frontmatter values differ literally.
  const keyValues = new Map<string, Map<string, string>>(); // key -> value -> relativePath
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    const raw = contents.get(node.id);
    if (raw === undefined) continue;
    const { frontmatter } = extractFrontmatter(raw);
    if (frontmatter === null) continue;
    for (const [key, value] of Object.entries(frontmatter)) {
      // Only scalar values, skip arrays/objects, and skip known graph keys handled elsewhere
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
      let valMap = keyValues.get(key);
      if (!valMap) {
        valMap = new Map<string, string>();
        keyValues.set(key, valMap);
      }
      if (!valMap.has(vStr)) valMap.set(vStr, node.relativePath);
    }
  }
  for (const [key, valMap] of keyValues) {
    if (valMap.size < 2) continue;
    const entries = [...valMap.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    const first = entries[0]!;
    const second = entries[1]!;
    out.push({
      ruleId: "INSTR-CONFLICT",
      message: `conflicting '${key}': '${first[0]}' (${first[1]}) vs '${second[0]}' (${second[1]})`,
      relativePath: first[1],
      relatedRelativePath: second[1],
    });
  }
  return out;
}

function detectDeadPure(
  nodes: InstructionNode[],
  repoFiles: string[],
): Array<{ nodeId: string; ruleId: string; relativePath: string }> {
  const out: Array<{ nodeId: string; ruleId: string; relativePath: string }> = [];
  for (const node of nodes) {
    if (node.kind !== "instruction") continue;
    let matches = 0;
    // Build match set logic: if applyTo non-null → count files matching any applyTo glob; else if includeScopes → match those; else default to scopeRoot ancestor check.
    if (node.applyTo !== null && node.applyTo.length > 0) {
      const matcher = picomatch(node.applyTo, { dot: true });
      for (const file of repoFiles) {
        if (matcher(file)) {
          matches += 1;
          break;
        }
      }
    } else if (node.includeScopes !== null && node.includeScopes.length > 0) {
      const matcher = picomatch(node.includeScopes, { dot: true });
      for (const file of repoFiles) {
        if (matcher(file)) {
          matches += 1;
          break;
        }
      }
    } else {
      // scopeRoot ancestor check: any file under scopeRoot
      for (const file of repoFiles) {
        const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/")) : ".";
        if (
          isAncestorOrSelf(node.scopeRoot, dir === "" ? "." : dir) ||
          file === node.relativePath
        ) {
          matches += 1;
          break;
        }
      }
      // If scopeRoot is "." it matches any file, so not dead unless repo empty
      if (node.scopeRoot === "." || node.scopeRoot === "") matches = 1;
    }
    // Also respect excludeScopes: if all matches are excluded, then considered dead.
    // For simplicity, if excludeScopes matches every file that includeScopes matched, count as zero.
    if (matches > 0 && node.excludeScopes !== null && node.excludeScopes.length > 0) {
      const excludeMatcher = picomatch(node.excludeScopes, { dot: true });
      const allExcluded = repoFiles.every(
        (f) =>
          !picomatch(node.includeScopes ?? node.applyTo ?? [], { dot: true })(f) ||
          excludeMatcher(f),
      );
      // If node has no includeScopes/applyTo, then check if scope files are all excluded?
      // Simplified: if excludeScopes matches the node's own relative dir, still not dead; ignore fine-grained.
      void allExcluded;
    }
    if (matches === 0) {
      out.push({ nodeId: node.id, ruleId: "INSTR-UNREACHABLE", relativePath: node.relativePath });
    }
  }
  return out;
}

function detectReferenceCycles(nodes: InstructionNode[]): DiscoveryDiagnostic | null {
  // Build adjacency from node references that point to instruction files (relativePath -> node id)
  const pathToId = new Map<string, string>();
  for (const n of nodes) pathToId.set(n.relativePath, n.id);
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    const targets: string[] = [];
    for (const ref of node.references) {
      // Normalize ref relative to node
      const containingDir = path.posix.dirname(node.relativePath);
      const joined = containingDir === "." ? ref : `${containingDir}/${ref}`;
      const normalized = normalizeRelative(joined);
      if (normalized === null) continue;
      const targetId = pathToId.get(normalized);
      if (targetId) targets.push(targetId);
    }
    if (targets.length > 0) adj.set(node.id, targets);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();
  function dfs(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const neighbors = adj.get(id) ?? [];
    for (const nb of neighbors) {
      if (dfs(nb)) return true;
    }
    stack.delete(id);
    return false;
  }
  for (const node of nodes) {
    if (dfs(node.id)) {
      return {
        code: "INSTR-CYCLE-SKIPPED",
        message: `circular reference involving ${node.id}`,
        relativePath: node.relativePath,
      };
    }
  }
  return null;
}

/** Effective-stack resolution v2 (REQ-V020-D-002, REQ-INSTR-003). */
export function resolveEffectiveStack(
  graph: InstructionGraph,
  provider: ProviderId,
  forPath?: string,
  opts?: {
    detailed?: boolean;
    signal?: AbortSignal;
    profile?:
      | import("../profiles/types.js").ResolvedProfile
      | import("../profiles/types.js").Profile
      | undefined;
  },
): string[] | EffectiveStackInfo {
  const detailed = opts?.detailed ?? false;
  if (opts?.signal?.aborted) throw new DOMException("resolveEffectiveStack aborted", "AbortError");
  const forPathPosix = forPath !== undefined ? toPosix(forPath) : undefined;
  // Path normalization and rejection of absolute/drive/UNC via normalizeRelativePathFs
  if (forPathPosix !== undefined && forPathPosix.length > 0) {
    const norm = normalizeRelativePathFs(forPathPosix);
    if (!norm.ok) {
      if (detailed) {
        return {
          provider,
          forPath: forPathPosix,
          chain: [],
          perNode: {},
          diagnostics: [
            {
              code: "FS-PATH-OUTSIDE-ROOT",
              message: `rejected path ${forPathPosix}`,
              relativePath: forPathPosix,
            },
          ],
        };
      }
      return [];
    }
  }
  const dirOf =
    forPathPosix === undefined || forPathPosix.length === 0 ? null : posixDirname(forPathPosix);

  const candidates: InstructionNode[] = [];
  const perNode: Record<
    string,
    {
      why: string;
      provenance: ProvenanceEntry[];
      shadowedBy?: string | null;
      duplicateOf?: string | null;
    }
  > = {};
  const diagnostics: DiscoveryDiagnostic[] = [];

  // Profile fileConventions + precedenceOverrides
  const profileData = opts?.profile as unknown as
    | {
        resolved?: import("../profiles/types.js").Profile;
        provider?: string;
        fileConventions?: unknown;
        precedenceOverrides?: unknown;
      }
    | undefined;
  const profileObj: import("../profiles/types.js").Profile | undefined =
    profileData !== undefined
      ? "resolved" in profileData && profileData.resolved !== undefined
        ? (profileData.resolved as import("../profiles/types.js").Profile)
        : (profileData as import("../profiles/types.js").Profile)
      : undefined;
  const instructionFilesGlobs: string[] | undefined = profileObj?.fileConventions.instructionFiles;
  const precedenceOverrides = profileObj?.precedenceOverrides;
  // Precompute matcher for profile fileConventions (if present)
  const profileFileMatcher: ((p: string) => boolean) | null =
    instructionFilesGlobs !== undefined && instructionFilesGlobs.length > 0
      ? picomatch(instructionFilesGlobs, { dot: true, bash: true })
      : null;

  for (const node of graph.nodes) {
    if (opts?.signal?.aborted)
      throw new DOMException("resolveEffectiveStack aborted", "AbortError");
    if (node.kind !== "instruction") continue;
    // Profile fileConventions filter: only surfaces matching profile globs pass
    if (profileFileMatcher !== null) {
      const matchesProfile =
        profileFileMatcher(node.relativePath) ||
        profileFileMatcher(node.relativePath.split("/").pop() ?? "") ||
        profileObj?.fileConventions.extraSurfaces?.some((g) => {
          try {
            return picomatch(g, { dot: true })(node.relativePath);
          } catch {
            return false;
          }
        });
      if (!matchesProfile) continue;
    }
    // providerApplicability filtering
    if (node.providerApplicability !== null && !node.providerApplicability.includes(provider)) {
      continue;
    }
    if (node.provider !== provider && node.provider !== "shared") {
      // provider isolation: only nodes whose provider matches queried provider are considered
      // But providerApplicability already filters; for normal case, require exact provider match
      // Shared nodes are not returned for specific provider stacks (preserve providers.test isolation)
      continue;
    }
    let why = "";
    let matches = false;

    if (node.applyTo !== null) {
      if (dirOf === null || forPathPosix === undefined) {
        continue;
      }
      const matcher = picomatch(node.applyTo, { dot: true });
      if (!matcher(forPathPosix)) continue;
      why = `applyTo ${node.applyTo.join(",")} matched ${forPathPosix}`;
      matches = true;
    } else {
      // Codex-family nesting: a node applies when its scope directory is ancestor of queried path's directory.
      if (provider === "codex" && node.relativePath !== "codex-global/AGENTS.md") {
        if (dirOf !== null && !isAncestorOrSelf(node.scopeRoot, dirOf)) continue;
        why =
          dirOf === null
            ? `repo-wide scopeRoot ${node.scopeRoot}`
            : `ancestor ${node.scopeRoot} of ${dirOf}`;
        matches = true;
      } else if (provider !== "codex") {
        // For non-codex non-applyTo nodes: original semantics (pre-v2) — repo-wide roots always applicable.
        // v2 keeps this: copilot repo-wide ".github/copilot-instructions.md" must match every forPath, not just .github/*
        // Nested CLAUDE.md files remain applicable as provider-specific; ancestor filtering is not required for CLAUD E/GEMINI per existing tests.
        why = `repo-wide ${node.relativePath}`;
        matches = true;
      } else {
        // codex-global or repo-wide codex without dirOf
        why = `repo-wide ${node.relativePath}`;
        matches = true;
      }
    }

    // includeScopes / excludeScopes evaluation after base match
    if (matches && node.includeScopes !== null) {
      if (forPathPosix === undefined) {
        continue;
      }
      const incMatcher = picomatch(node.includeScopes, { dot: true });
      if (!incMatcher(forPathPosix)) continue;
      why += `; includeScopes matched`;
    }
    if (matches && node.excludeScopes !== null && forPathPosix !== undefined) {
      const excMatcher = picomatch(node.excludeScopes, { dot: true });
      if (excMatcher(forPathPosix)) continue; // exclude wins
    }

    if (!matches) continue;
    // Apply precedenceOverrides if any (additive on top, preserve same depth→precedence→id tie-break)
    let effectiveNode = node;
    if (precedenceOverrides !== undefined) {
      const keyCandidates = [node.id, node.relativePath];
      let delta: number | undefined;
      for (const k of keyCandidates) {
        if ((precedenceOverrides as Record<string, number>)[k] !== undefined) {
          delta = (precedenceOverrides as Record<string, number>)[k];
          break;
        }
      }
      if (delta !== undefined) {
        effectiveNode = { ...node, precedence: node.precedence + delta };
      }
    }
    candidates.push(effectiveNode);
    perNode[node.id] = {
      why,
      provenance: node.provenance,
      shadowedBy: node.shadowedBy,
      duplicateOf: node.duplicateOf,
    };
  }

  candidates.sort(compareNodes);
  const chain = candidates.map((n) => n.id);
  if (detailed) {
    return {
      provider,
      forPath: forPathPosix ?? "",
      chain,
      perNode,
      diagnostics,
    };
  }
  return chain;
}

function isAncestorOrSelf(scopeRoot: string, targetDir: string): boolean {
  if (scopeRoot === "." || scopeRoot === "") return true;
  const normalizedScope = scopeRoot.replace(/\/+$/, "");
  return targetDir === normalizedScope || targetDir.startsWith(`${normalizedScope}/`);
}

function posixDirname(forPath: string): string {
  const parts = forPath.split("/");
  parts.pop();
  return parts.length === 0 ? "." : parts.join("/");
}
