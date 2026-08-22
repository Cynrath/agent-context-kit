import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parse } from "yaml";
import { stableStringify } from "../config/load.js";
import type { PolicyDocument } from "./types.js";
import { PolicyDocumentSchema } from "./types.js";

export interface ResolveOptions {
  /** Explicit entry file; otherwise config.policy.extends entries are used. */
  entryFiles?: readonly string[] | undefined;
  repoName?: string | undefined;
}

export class PolicyError extends Error {
  constructor(
    message: string,
    readonly code:
      | "POL-CYCLE"
      | "POL-LOCKED-CONFLICT"
      | "POL-NOT-FOUND"
      | "POL-INVALID"
      | "POL-OFFLINE-BLOCKED",
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
): Promise<{ policy: PolicyDocument; chain: string[]; diagnostics: string[] }> {
  const entry = path.join(root.canonicalPath, "ackit-policy.yml");
  const chain: string[] = [];
  const documents: PolicyDocument[] = [];
  const diagnostics: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const entryFiles =
    options.entryFiles !== undefined && options.entryFiles.length > 0
      ? options.entryFiles.map((entryFile) => path.resolve(root.canonicalPath, entryFile))
      : [entry];

  for (const entryFile of entryFiles) {
    await loadChain(entryFile);
  }

  let effective = emptyPolicy();
  for (const document of documents) {
    if (!scopeMatches(document, options.repoName)) continue;
    effective = mergeDocuments(effective, document, diagnostics);
  }
  effective.rules = dedupeLockedConflicts(effective.rules, diagnostics);

  return { policy: effective, chain, diagnostics };

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
      const childFile = resolveExtendEntry(root.canonicalPath, path.dirname(file), extendEntry);
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

  function scopeMatches(document: PolicyDocument, repoName?: string): boolean {
    if (document.org !== undefined) {
      // Org scoping applies when the repository declares membership; unknown orgs still apply base rules.
      if (options.repoName === undefined && document.repo !== undefined) return false;
    }
    if (document.repo !== undefined && repoName !== undefined && document.repo !== repoName) {
      return false;
    }
    return true;
  }
}

function mergeDocuments(
  base: PolicyDocument,
  layer: PolicyDocument,
  diagnostics: string[],
): PolicyDocument {
  return {
    ...base,
    thresholds: { ...base.thresholds, ...layer.thresholds },
    suppressions: dedupeBy(
      [...base.suppressions, ...layer.suppressions],
      (s) => `${s.ruleId}|${s.pathGlobs.join(",")}`,
    ),
    forbiddenPatterns: dedupeBy(
      [...base.forbiddenPatterns, ...layer.forbiddenPatterns],
      (p) => p.id,
    ),
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

/** `npm:` prefix resolves through pre-installed node_modules — never the network. */
function resolveExtendEntry(repoRoot: string, containingDir: string, entry: string): string {
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
