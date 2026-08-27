import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import picomatch from "picomatch";
import { estimateTokens } from "../../shared/tokens.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { extractFrontmatter, normalizeApplyTo } from "./frontmatter.js";
import { checksumContent, scanReferences } from "./references.js";
import type {
  BuildGraphOptions,
  DiscoveryDiagnostic,
  InstructionGraph,
  InstructionNode,
  ProviderId,
} from "./types.js";
import { InstructionNodeSchema } from "./types.js";

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

function classifySurface(relativePath: string): SurfaceMatch | null {
  const posixPath = relativePath.split("\\").join("/");
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
 * Builds the resolved instruction graph (REQ-INSTR-001..004, ADR-0006).
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
  const diagnostics: DiscoveryDiagnostic[] = [];
  const nodes: InstructionNode[] = [];

  const walkRoot = await fsp.realpath(root.canonicalPath);
  if (options.signal?.aborted) {
    throw new DOMException("buildInstructionGraph aborted", "AbortError");
  }
  const allFiles = await listFiles(walkRoot);
  for (const absoluteFile of allFiles) {
    if (options.signal?.aborted) {
      throw new DOMException("buildInstructionGraph aborted", "AbortError");
    }
    const relativePath = toPosix(path.relative(walkRoot, absoluteFile));
    const surface = classifySurface(relativePath);
    if (surface === null) continue;
    try {
      const content = await fsp.readFile(absoluteFile, "utf8");
      nodes.push(await buildNode(root, surface, content, maxTokens));
    } catch (error) {
      diagnostics.push({
        code: "INSTR-READ-FAILED",
        message: (error as Error).message,
        relativePath,
      });
    }
  }

  if (options.codexGlobalDir !== undefined) {
    const globalNode = await readCodexGlobalNode(options.codexGlobalDir);
    if (globalNode !== null) nodes.push(globalNode);
  }

  nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const node of nodes) {
    InstructionNodeSchema.parse(node);
  }
  return { nodes, diagnostics };
}

async function buildNode(
  root: RepositoryRoot,
  surface: SurfaceMatch,
  content: string,
  maxTokens: number,
): Promise<InstructionNode> {
  const depth = surface.relativePath.split("/").length - 1;
  let applyTo: string[] | null = null;
  if (surface.provider === "copilot" && surface.relativePath.startsWith(".github/instructions/")) {
    // GitHub Copilot docs: applyTo frontmatter globs select matching paths.
    const { frontmatter } = extractFrontmatter(content);
    applyTo = frontmatter === null ? null : normalizeApplyTo(frontmatter["applyTo"]);
  }
  const managed = content.includes(MANAGED_START_MARKER) && content.includes(MANAGED_END_MARKER);

  const refScan = scanReferences({
    relativePath: surface.relativePath,
    content,
    isInsideRoot: () => true, // refined below via existence check
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
  });
}

/**
 * Precedence tiers (documented, deterministic):
 *   0–999   codex AGENTS family: depth*10 (+50 for AGENTS.override.md closer-scope override)
 *   100–199 single-provider roots (claude/gemini/copilot repo-wide): 100 + depth*10
 *   1000+   path-specific applyTo instructions: 1000 + depth*10
 *   Global codex AGENTS.md (outside repo) is always weakest: precedence 0 handled via dedicated node below.
 */
function computePrecedence(surface: SurfaceMatch, depth: number, pathSpecific: boolean): number {
  if (pathSpecific) return 1000 + depth * 10;
  if (surface.provider === "copilot") return 100 + depth * 10;
  if (surface.provider === "claude" || surface.provider === "gemini") return 100 + depth * 10;
  const overrideBonus = surface.relativePath.endsWith(CODEX_OVERRIDE_BASENAME) ? 50 : 0;
  return depth * 10 + 1 + overrideBonus;
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
        await visit(absolute);
      } else if (entry.isFile()) {
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

/** Effective-stack resolution (REQ-INSTR-003). Nested AGENTS.md files apply
 * only to paths inside their scope directory; workspace boundaries never
 * conflate with this path-specific semantics (REQ-MONO-002 distinction). */
export function resolveEffectiveStack(
  graph: InstructionGraph,
  provider: ProviderId,
  forPath?: string,
): string[] {
  const dirOf = forPath === undefined || forPath.length === 0 ? null : posixDirname(forPath);
  const candidates = graph.nodes.filter((node) => {
    if (node.kind !== "instruction") return false;
    if (node.provider !== provider) return false;
    if (node.applyTo !== null) {
      if (dirOf === null) return false;
      return picomatch(node.applyTo, { dot: true })(forPath ?? "");
    }
    // Codex-family nesting: a node applies when its scope directory is an
    // ancestor of (or equal to) the queried path's directory.
    if (provider === "codex" && node.relativePath !== "codex-global/AGENTS.md") {
      if (dirOf !== null && !isAncestorOrSelf(node.scopeRoot, dirOf)) return false;
    }
    return true;
  });
  candidates.sort((a, b) => a.precedence - b.precedence || (a.id < b.id ? -1 : 1));
  return candidates.map((node) => node.id);
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
