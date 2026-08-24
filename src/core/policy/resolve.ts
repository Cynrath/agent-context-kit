import { createHash } from "node:crypto";
import { existsSync as existsSyncDefault, promises as fsp } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parse } from "yaml";
import { stableStringify } from "../config/load.js";
import { isInsideRoot } from "../filesystem/paths.js";
import type { PolicyDocument } from "./types.js";
import { PolicyDocumentSchema } from "./types.js";

export interface ResolveOptions {
  /** Explicit entry file; otherwise config.policy.extends entries are used. */
  entryFiles?: readonly string[] | undefined;
  /** Repository name for `repo:` scoped layers (defaults: none). */
  repoName?: string | undefined;
  /** Organization name for `org:` scoped layers (defaults: none). */
  orgName?: string | undefined;
}

export class PolicyError extends Error {
  constructor(
    message: string,
    readonly code:
      | "POL-CYCLE"
      | "POL-LOCKED-CONFLICT"
      | "POL-NOT-FOUND"
      | "POL-INVALID"
      | "POL-OFFLINE-BLOCKED"
      | "POL-ROOT-ESCAPE",
  ) {
    super(message);
    this.name = "PolicyError";
  }
}

/**
 * Offline-by-construction resolution (REQ-POL-002): extends entries are local
 * files (relative to the containing policy) or `npm:<pkg>/<file>` references
 * resolved through the pre-installed node_modules only. No fetch of any kind
 * exists in this module.
 */
export async function resolvePolicy(
  root: RepositoryRootLike,
  options: ResolveOptions = {},
): Promise<{
  policy: PolicyDocument;
  chain: string[];
  diagnostics: string[];
  documents: PolicyDocument[];
}> {
  const entry = path.join(root.canonicalPath, "ackit-policy.yml");
  const chain: string[] = [];
  const documents: PolicyDocument[] = [];
  const diagnostics: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const entryFilesOption = options.entryFiles;
  const hasExplicitEntries = entryFilesOption !== undefined && entryFilesOption.length > 0;
  // Audit item 1: top-level entryFiles must ALSO pass canonical containment.
  const entryFiles: string[] = [];
  if (hasExplicitEntries) {
    for (const entryFile of entryFilesOption) {
      entryFiles.push(
        await resolveLocalExtendEntry(root.canonicalPath, root.canonicalPath, entryFile),
      );
    }
  } else {
    entryFiles.push(entry);
  }
  // Default policy file is OPTIONAL: repositories without one simply get an
  // empty effective policy instead of an error.
  if (!hasExplicitEntries && !existsSyncDefault(entry)) {
    return { policy: emptyPolicy(), chain: [], diagnostics: [], documents: [] };
  }

  for (const entryFile of entryFiles) {
    await loadChain(entryFile);
  }

  let effective = emptyPolicy();
  const appliedDocuments: PolicyDocument[] = [];
  for (const document of documents) {
    if (!scopeMatches(document, options)) {
      diagnostics.push(
        `policy layer scope mismatch (org=${document.org ?? "-"}, repo=${document.repo ?? "-"}) — layer skipped`,
      );
      continue;
    }
    appliedDocuments.push(document);
    effective = mergeDocuments(effective, document, diagnostics);
  }
  effective.rules = dedupeLockedConflicts(effective.rules, diagnostics);

  return { policy: effective, chain, diagnostics, documents: appliedDocuments };

  async function loadChain(file: string, stack: string[] = []): Promise<void> {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      throw new PolicyError(
        `policy extends cycle detected: ${[...stack, file].join(" -> ")}`,
        "POL-CYCLE",
      );
    }
    visiting.add(file);
    let raw: string;
    try {
      raw = await fsp.readFile(file, "utf8");
    } catch {
      throw new PolicyError(`policy file not found: ${file}`, "POL-NOT-FOUND");
    }
    const parsedUnknown = parse(raw);
    if (typeof parsedUnknown !== "object" || parsedUnknown === null) {
      throw new PolicyError(`policy root must be a mapping: ${file}`, "POL-INVALID");
    }
    const parsed = parsedUnknown as Record<string, unknown>;
    const validated = PolicyDocumentSchema.safeParse(parsed);
    if (!validated.success) {
      throw new PolicyError(
        `invalid policy document ${file}: ${validated.error.issues[0]?.message ?? ""}`,
        "POL-INVALID",
      );
    }
    const document = validated.data;

    // Suppression without reason is a hard load error (MS§17).
    for (const suppression of document.suppressions) {
      if (suppression.reason.trim().length === 0) {
        throw new PolicyError(
          `suppression for ${suppression.ruleId} missing reason (${file})`,
          "POL-INVALID",
        );
      }
    }

    // Pre-order: extends chain resolves first so later layers override bases.
    for (const extendEntry of document.extends) {
      const childFile = extendEntry.startsWith("npm:")
        ? resolveExtendEntrySync(root.canonicalPath, path.dirname(file), extendEntry)
        : await resolveLocalExtendEntry(root.canonicalPath, path.dirname(file), extendEntry);
      await loadChain(childFile, [...stack, file]);
    }
    documents.push(document);
    chain.push(toPosix(path.relative(root.canonicalPath, file)) || path.basename(file));

    // Expired suppressions remain in the document but become inactive; the
    // diagnostic surfaces stale policy entries (REQ-GOV-007).
    const today = new Date().toISOString().slice(0, 10);
    for (const suppression of document.suppressions) {
      if (suppression.expiresAt !== undefined && suppression.expiresAt < today) {
        diagnostics.push(
          `suppression for ${suppression.ruleId} expired on ${suppression.expiresAt} and is inactive`,
        );
      }
    }

    visiting.delete(file);
    visited.add(file);
  }

  function scopeMatches(
    document: PolicyDocument,
    ctx: { repoName?: string | undefined; orgName?: string | undefined },
  ): boolean {
    // Deterministic layer-applicability semantics (audit 2.6):
    // - doc.org defined requires matching context org (missing org context ⇒ skip);
    // - doc.repo defined requires matching repository name.
    if (document.org !== undefined && document.org !== ctx.orgName) return false;
    if (document.repo !== undefined && document.repo !== ctx.repoName) return false;
    return true;
  }
}

function mergeDocuments(
  base: PolicyDocument,
  layer: PolicyDocument,
  diagnostics: string[],
): PolicyDocument {
  // Audit 2.6: a layer with pathScopes keeps its suppressions and forbidden
  // patterns OUT of the flattened view — they are enforced per-path through
  // the per-document (scoped) evaluation instead.
  const scoped = layer.pathScopes.length > 0;
  return {
    ...base,
    thresholds: { ...base.thresholds, ...layer.thresholds },
    suppressions: scoped
      ? base.suppressions
      : dedupeBy(
          [...base.suppressions, ...layer.suppressions],
          (s) => `${s.ruleId}|${s.pathGlobs.join(",")}`,
        ),
    forbiddenPatterns: scoped
      ? base.forbiddenPatterns
      : dedupeBy([...base.forbiddenPatterns, ...layer.forbiddenPatterns], (p) => p.id),
    rules: mergeRules(base.rules, layer.rules, diagnostics),
  };
}

function mergeRules(
  base: PolicyDocument["rules"],
  layer: PolicyDocument["rules"],
  _diagnostics: string[],
) {
  const byId = new Map(base.map((rule) => [rule.ruleId, rule]));
  for (const incoming of layer) {
    const existing = byId.get(incoming.ruleId);
    if (existing === undefined) {
      byId.set(incoming.ruleId, incoming);
      continue;
    }
    if ((existing.locked ?? false) === true) {
      const weakens =
        (incoming.severity !== undefined &&
          existing.severity !== undefined &&
          severityRank(incoming.severity) < severityRank(existing.severity)) ||
        incoming.enabled === false;
      if (weakens) {
        throw new PolicyError(
          `rule ${incoming.ruleId} is locked and cannot be weakened`,
          "POL-LOCKED-CONFLICT",
        );
      }
    }
    byId.set(incoming.ruleId, {
      ...existing,
      ...incoming,
      locked: existing.locked || incoming.locked,
    });
  }
  return [...byId.values()].sort((a, b) => (a.ruleId < b.ruleId ? -1 : 1));
}

function dedupeLockedConflicts(rules: PolicyDocument["rules"], _diagnostics: string[]) {
  return rules;
}

function severityRank(severity: string): number {
  return ["low", "medium", "high", "critical"].indexOf(severity);
}

function dedupeBy<T>(items: readonly T[], keyOf: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of items) seen.set(keyOf(item), item);
  return [...seen.values()];
}

/**
 * Resolves a LOCAL extends entry strictly inside the canonical repository
 * root (audit 2.5): `../` chains, absolute paths, and symlink/junction/
 * reparse targets that resolve outside the root are all rejected with a
 * stable POL-ROOT-ESCAPE code before any content is read. npm-prefixed
 * entries intentionally bypass this check and follow their own controlled
 * pre-installed-package trust boundary.
 */
async function resolveLocalExtendEntry(
  repoRoot: string,
  containingDir: string,
  entry: string,
): Promise<string> {
  const resolved = path.resolve(containingDir, entry);
  // String-level containment FIRST so traversal attempts are flagged as
  // escape even when the target does not exist.
  if (!isInsideRoot(repoRoot, resolved)) {
    throw new PolicyError(
      `policy extends target '${entry}' resolves outside the repository root`,
      "POL-ROOT-ESCAPE",
    );
  }
  let real: string;
  try {
    real = await fsp.realpath(resolved);
  } catch {
    throw new PolicyError(`policy file not found: ${entry}`, "POL-NOT-FOUND");
  }
  // Symlink/junction/reparse second pass: realpath BOTH the root and the
  // target so Windows 8.3 short-name / casing differences don't produce
  // false positives.
  let realRoot: string;
  try {
    realRoot = await fsp.realpath(repoRoot);
  } catch {
    realRoot = repoRoot;
  }
  const rel = path.relative(realRoot, real);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new PolicyError(
      `policy extends target '${entry}' resolves outside the repository root via link`,
      "POL-ROOT-ESCAPE",
    );
  }
  return resolved;
}

/** `npm:` prefix resolves through pre-installed node_modules — never the network. */
function resolveExtendEntrySync(repoRoot: string, containingDir: string, entry: string): string {
  if (entry.startsWith("npm:")) {
    const spec = entry.slice(4);
    const slashIndex = spec.indexOf("/");
    const pkg = slashIndex === -1 ? spec : spec.slice(0, slashIndex);
    const subPath = slashIndex === -1 ? "" : spec.slice(slashIndex + 1);
    const require = createRequire(path.join(repoRoot, "package.json"));
    try {
      const pkgJsonPath = require.resolve(`${pkg}/package.json`);
      const pkgDir = path.dirname(pkgJsonPath);
      return path.join(pkgDir, subPath);
    } catch {
      throw new PolicyError(
        `npm policy package '${pkg}' is not installed; ACKit never fetches remote packages (REQ-POL-002)`,
        "POL-OFFLINE-BLOCKED",
      );
    }
  }
  return path.resolve(containingDir, entry);
}

interface RepositoryRootLike {
  canonicalPath: string;
}

function emptyPolicy(): PolicyDocument {
  return PolicyDocumentSchema.parse({ schemaVersion: 1 });
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

export function policyDigest(policy: PolicyDocument): string {
  return createHashWrap(stableStringify(policy));
}

function createHashWrap(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

import type { ScanRule } from "../scanner/types.js";

/** Converts a declarative forbidden pattern into a scan rule (REQ-POL-001). */
export function forbiddenPatternToRule(pattern: {
  id: string;
  pattern: string;
  severity: "low" | "medium" | "high";
  message: string;
}): ScanRule {
  const regex = new RegExp(pattern.pattern, "g");
  return {
    id: pattern.id,
    category: "hygiene",
    severity: pattern.severity,
    documentationKey: `rules/${pattern.id}`,
    remediation: "Remove or refactor the forbidden construct per team policy.",
    appliesTo: () => true,
    evaluate({ content }) {
      const drafts = [];
      let offset = 0;
      for (const line of content.split(/\r?\n/)) {
        regex.lastIndex = 0;
        const match = regex.exec(line);
        if (match !== null && match[0] !== undefined) {
          drafts.push({
            ruleId: this.id,
            severity: this.severity,
            category: this.category,
            message: pattern.message,
            offset: offset + (match.index ?? 0),
            rawEvidence: match[0],
            remediation: this.remediation,
            documentationKey: this.documentationKey,
          });
        }
        offset += line.length + 1;
      }
      return drafts;
    },
  };
}
