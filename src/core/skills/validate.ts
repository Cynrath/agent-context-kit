import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import { estimateTokens } from "../../shared/tokens.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import { extractFrontmatter } from "../instructions/frontmatter.js";
import { checksumContent } from "../instructions/references.js";
import {
  isValidKebabName,
  MAX_DESCRIPTION_LENGTH,
  MAX_REFERENCE_CHAIN_DEPTH,
  SKILL_PATH_PATTERN,
  type SkillIssue,
  type SkillRecord,
  type SkillValidationResult,
} from "./types.js";

export interface ValidateSkillsOptions {
  maxTokenEstimate?: number | undefined;
}

/**
 * Agent Skills discovery + validation engine (REQ-SKILL-001/005, ADR-0010).
 * Scripts are detected and reported, NEVER executed (REQ-SKILL-006): this
 * module performs no dynamic imports, spawns, or command execution.
 */
export async function validateSkills(
  root: RepositoryRoot,
  options: ValidateSkillsOptions = {},
): Promise<SkillValidationResult> {
  const maxTokens = options.maxTokenEstimate ?? 20000;
  const issues: SkillIssue[] = [];
  const records: SkillRecord[] = [];

  const files = await walkFiles(root.canonicalPath);
  const skillPaths = files.filter((file) => SKILL_PATH_PATTERN.test(toPosix(file)));

  const byName = new Map<string, string[]>();
  for (const absolutePath of skillPaths) {
    const relativePath = toPosix(path.relative(root.canonicalPath, absolutePath));
    const dirName = path.basename(path.dirname(absolutePath));
    let raw: string;
    try {
      raw = await fsp.readFile(absolutePath, "utf8");
    } catch (error) {
      issues.push({
        id: "SKILL-READ",
        tier: "strict",
        message: `cannot read SKILL.md: ${(error as Error).message}`,
        relativePath,
      });
      continue;
    }

    const { frontmatter, body } = extractFrontmatter(raw);
    if (frontmatter === null) {
      issues.push({
        id: "SKILL-FRONTMATTER-MISSING",
        tier: "strict",
        message: "missing YAML frontmatter block",
        relativePath,
      });
      continue;
    }

    const name = typeof frontmatter["name"] === "string" ? frontmatter["name"] : undefined;
    const description =
      typeof frontmatter["description"] === "string" ? frontmatter["description"] : undefined;

    if (name === undefined || name.length === 0) {
      issues.push({
        id: "SKILL-NAME-MISSING",
        tier: "strict",
        message: "frontmatter 'name' missing",
        relativePath,
      });
      continue;
    }
    if (!isValidKebabName(name)) {
      issues.push({
        id: "SKILL-NAME-INVALID",
        tier: "strict",
        message: `'${name}' is not a valid kebab-case skill name`,
        relativePath,
      });
      continue;
    }
    if (name !== dirName) {
      issues.push({
        id: "SKILL-DIR-MISMATCH",
        tier: "strict",
        message: `frontmatter name '${name}' does not match directory '${dirName}'`,
        relativePath,
      });
      continue;
    }
    if (description === undefined || description.length === 0) {
      issues.push({
        id: "SKILL-DESCRIPTION-MISSING",
        tier: "strict",
        message: "frontmatter 'description' missing",
        relativePath,
      });
      continue;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push({
        id: "SKILL-DESCRIPTION-LONG",
        tier: "warning",
        message: `description length ${description.length} exceeds ${MAX_DESCRIPTION_LENGTH}`,
        relativePath,
      });
    }

    const siblingsDir = path.dirname(absolutePath);
    const scripts = await listIfExists(path.join(siblingsDir, "scripts"));
    const assets = await listIfExists(path.join(siblingsDir, "assets"));
    const localRefs = collectLocalReferences(body);

    const record: SkillRecord = {
      name,
      description,
      relativePath,
      checksum: checksumContent(raw),
      tokenEstimate: estimateTokens(raw),
      scripts,
      references: localRefs,
      assets,
    };
    if (record.tokenEstimate > maxTokens) {
      issues.push({
        id: "SKILL-OVERSIZE",
        tier: "warning",
        message: `SKILL.md token estimate ${record.tokenEstimate} exceeds ${maxTokens}`,
        relativePath,
      });
    }
    await checkReferences(root, record, issues);
    records.push(record);
    const existing = byName.get(name) ?? [];
    byName.set(name, [...existing, relativePath]);
  }

  for (const [name, locations] of byName) {
    if (locations.length > 1) {
      for (const location of locations) {
        issues.push({
          id: "SKILL-DUPLICATE",
          tier: "strict",
          message: `duplicate skill name '${name}' also defined at ${locations.filter((l) => l !== location).join(", ")}`,
          relativePath: location,
        });
      }
    }
  }

  return { skills: records.sort(byRelativePath), issues };
}

async function checkReferences(
  root: RepositoryRoot,
  record: SkillRecord,
  issues: SkillIssue[],
): Promise<void> {
  const skillDir = path.posix.dirname(record.relativePath);
  for (const reference of record.references) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) {
      issues.push({
        id: "SKILL-EXTERNAL-REF",
        tier: "warning",
        message: `references external URL '${reference}'`,
        relativePath: record.relativePath,
      });
      continue;
    }
    const resolved = resolveFrom(skillDir, reference);
    if (resolved === null) {
      issues.push({
        id: "SKILL-ROOT-ESCAPE",
        tier: "strict",
        message: `reference '${reference}' escapes the repository root`,
        relativePath: record.relativePath,
      });
      continue;
    }
    try {
      await fsp.access(path.join(root.canonicalPath, ...resolved.split("/")));
    } catch {
      issues.push({
        id: "SKILL-BROKEN-REF",
        tier: "strict",
        message: `reference '${reference}' does not exist`,
        relativePath: record.relativePath,
      });
    }
  }
  // Deep-chain analysis (BFS over local markdown references, capped).
  const depth = await measureChainDepth(
    root,
    skillDir,
    record.references,
    new Set([record.relativePath]),
  );
  if (depth > MAX_REFERENCE_CHAIN_DEPTH) {
    issues.push({
      id: "SKILL-DEEP-CHAIN",
      tier: "warning",
      message: `reference chain depth ${depth} exceeds ${MAX_REFERENCE_CHAIN_DEPTH}`,
      relativePath: record.relativePath,
    });
  }
}

async function measureChainDepth(
  root: RepositoryRoot,
  baseDir: string,
  references: readonly string[],
  visited: Set<string>,
): Promise<number> {
  let deepest = 0;
  for (const reference of references) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) continue;
    const resolved = resolveFrom(baseDir, reference);
    if (resolved === null || !resolved.endsWith(".md") || visited.has(resolved)) continue;
    visited.add(resolved);
    let content: string;
    try {
      content = await fsp.readFile(path.join(root.canonicalPath, ...resolved.split("/")), "utf8");
    } catch {
      continue;
    }
    const nested = collectLocalReferences(content);
    deepest = Math.max(
      deepest,
      1 + (await measureChainDepth(root, path.posix.dirname(resolved), nested, visited)),
    );
  }
  return deepest;
}

function resolveFrom(fromDir: string, target: string): string | null {
  const segments: string[] = [];
  let escaped = false;
  for (const part of [
    ...fromDir.split("/").filter((p) => p !== "." && p !== ""),
    ...target.split("/"),
  ]) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length === 0) {
        escaped = true;
        break;
      }
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return escaped ? null : segments.join("/");
}

function collectLocalReferences(content: string): string[] {
  const pattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const out = new Set<string>();
  for (const match of content.matchAll(pattern)) {
    const target = match[1];
    if (target !== undefined && !target.startsWith("#")) out.add(target.split("#")[0] ?? target);
  }
  return [...out].filter((entry) => entry.length > 0).sort();
}

async function listIfExists(dir: string): Promise<string[]> {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const base = path.basename(path.dirname(dir));
    void base;
    return entries.map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function walkFiles(rootPath: string): Promise<string[]> {
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
  await visit(rootPath);
  return out.sort();
}

function byRelativePath(a: SkillRecord, b: SkillRecord): number {
  return a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0;
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}
