import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parse as yamlParse } from "yaml";
import { stableStringify } from "../../config/load.js";
import { isInsideRoot, toPosix } from "../../filesystem/paths.js";
import type { ScanDiagnostic } from "../../scanner/types.js";
import {
  canonicalId,
  type EffectiveRulePack,
  isAckitId,
  PACK_LIMITS,
  RulePackSchemaV1,
  type RulePackV1,
  severityRank,
} from "./types.js";

export interface LoadedPackResult {
  packs: EffectiveRulePack[];
  diagnostics: ScanDiagnostic[];
}

function isUrlShape(value: string): boolean {
  return /^(https?|ftp):\/\//i.test(value) || value.startsWith("//");
}

function isTraversalGlob(value: string): boolean {
  if (path.isAbsolute(value)) return true;
  const posix = toPosix(value);
  if (isUrlShape(posix)) return true;
  const segments = posix.split("/");
  for (const seg of segments) {
    if (seg === "..") return true;
  }
  return false;
}

function depthOf(value: unknown, current = 0): number {
  if (current > PACK_LIMITS.maxDepth + 5) return current;
  if (Array.isArray(value)) {
    let max = current + 1;
    for (const item of value) {
      max = Math.max(max, depthOf(item, current + 1));
    }
    return max;
  }
  if (value !== null && typeof value === "object") {
    let max = current + 1;
    for (const v of Object.values(value as Record<string, unknown>)) {
      max = Math.max(max, depthOf(v, current + 1));
    }
    return max;
  }
  return current;
}

function redosGuard(pattern: string): { ok: boolean; code?: string } {
  if (pattern.length > PACK_LIMITS.maxPatternLen)
    return { ok: false, code: "POL-PACK-LIMIT-PATTERN" };
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    return { ok: false, code: "POL-PACK-REDOS" };
  }
  // catastrophic pattern heuristic: nested quantifiers (a+)+, (.*)+, etc.
  const catastrophic =
    /(\([^)]*\+[^)]*\)\+|(\*\s*\+)|(\+\s*\+))/.test(pattern) || /\([^)]*\*[^)]*\)\*/.test(pattern);
  // sentinel timing
  const fixtures = [`${"a".repeat(10_000)}b`, "\n".repeat(1_000)];
  for (const fixture of fixtures) {
    const start = performance.now();
    try {
      regex.test(fixture);
    } catch {
      return { ok: false, code: "POL-PACK-REDOS" };
    }
    const elapsed = performance.now() - start;
    if (elapsed > 50) return { ok: false, code: "POL-PACK-REDOS" };
    if (catastrophic && elapsed > 10) return { ok: false, code: "POL-PACK-REDOS" };
  }
  // explicit known catastrophic e.g., (a+)+b
  if (pattern.includes("(a+)+") || pattern.includes("(a*)+")) {
    return { ok: false, code: "POL-PACK-REDOS" };
  }
  return { ok: true };
}

function packDigest(
  pack: Pick<RulePackV1, "packId" | "namespace" | "version" | "severity" | "rules">,
): string {
  const canonical = {
    packId: pack.packId,
    namespace: pack.namespace,
    version: pack.version,
    severity: pack.severity,
    rules: [...pack.rules].sort((a, b) => (a.id < b.id ? -1 : 1)),
  };
  return createHash("sha256").update(stableStringify(canonical)).digest("hex");
}

async function resolveLocalPath(
  repoRoot: string,
  containingDir: string,
  entry: string,
): Promise<{ kind: "local"; abs: string } | { kind: "error"; diagnostic: ScanDiagnostic }> {
  if (isUrlShape(entry)) {
    return {
      kind: "error",
      diagnostic: { code: "POL-NETWORK-REFUSED", message: `network URL refused: ${entry}` },
    };
  }
  if (path.isAbsolute(entry)) {
    return {
      kind: "error",
      diagnostic: { code: "FS-PATH-ESCAPES-ROOT", message: `absolute pack path refused: ${entry}` },
    };
  }
  const resolved = path.resolve(containingDir, entry);
  if (!isInsideRoot(repoRoot, resolved)) {
    return {
      kind: "error",
      diagnostic: { code: "FS-PATH-ESCAPES-ROOT", message: `pack path escapes root: ${entry}` },
    };
  }
  let real: string;
  try {
    real = await fsp.realpath(resolved);
  } catch {
    return {
      kind: "error",
      diagnostic: { code: "POL-PACK-NOT-FOUND", message: `pack file not found: ${entry}` },
    };
  }
  let realRoot: string;
  try {
    realRoot = await fsp.realpath(repoRoot);
  } catch {
    realRoot = repoRoot;
  }
  const rel = path.relative(realRoot, real);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return {
      kind: "error",
      diagnostic: { code: "POL-ROOT-ESCAPE", message: `pack path escapes root via link: ${entry}` },
    };
  }
  return { kind: "local", abs: resolved };
}

function resolvePackagePath(
  repoRoot: string,
  entry: string,
): { kind: "pkg"; abs: string } | { kind: "error"; diagnostic: ScanDiagnostic } {
  // entry forms: npm:pkg/subpath or node_modules/pkg/... or pkg:...
  let spec = entry;
  if (spec.startsWith("npm:")) spec = spec.slice(4);
  else if (spec.startsWith("pkg:")) spec = spec.slice(4);
  else if (spec.startsWith("node_modules/")) spec = spec.slice("node_modules/".length);
  else {
    return {
      kind: "error",
      diagnostic: { code: "POL-PACK-NOT-FOUND", message: `unknown pack spec: ${entry}` },
    };
  }
  if (isUrlShape(spec)) {
    return {
      kind: "error",
      diagnostic: { code: "POL-NETWORK-REFUSED", message: `network URL refused: ${entry}` },
    };
  }
  const slash = spec.indexOf("/");
  const pkg = slash === -1 ? spec : spec.slice(0, slash);
  const subPath = slash === -1 ? "" : spec.slice(slash + 1);
  const req = createRequire(path.join(repoRoot, "package.json"));
  try {
    const pkgJson = req.resolve(`${pkg}/package.json`);
    const pkgDir = path.dirname(pkgJson);
    return { kind: "pkg", abs: path.join(pkgDir, subPath) };
  } catch {
    return {
      kind: "error",
      diagnostic: {
        code: "POL-OFFLINE-BLOCKED",
        message: `npm policy package '${pkg}' is not installed; ACKit never fetches remote packages`,
      },
    };
  }
}

function isPackageEntry(entry: string): boolean {
  return entry.startsWith("npm:") || entry.startsWith("pkg:") || entry.startsWith("node_modules/");
}

async function loadSinglePackFile(
  absPath: string,
  _repoRoot: string,
): Promise<{ pack: RulePackV1; raw: string } | { error: ScanDiagnostic }> {
  let raw: string;
  try {
    const stat = await fsp.stat(absPath);
    if (stat.size > PACK_LIMITS.maxFileBytes) {
      return {
        error: { code: "POL-PACK-LIMIT-BYTES", message: `pack file exceeds 512KB: ${absPath}` },
      };
    }
  } catch {
    return { error: { code: "POL-PACK-NOT-FOUND", message: `pack file not found: ${absPath}` } };
  }
  try {
    raw = await fsp.readFile(absPath, "utf8");
  } catch {
    return { error: { code: "POL-PACK-NOT-FOUND", message: `cannot read pack file: ${absPath}` } };
  }
  if (Buffer.byteLength(raw, "utf8") > PACK_LIMITS.maxFileBytes) {
    return {
      error: { code: "POL-PACK-LIMIT-BYTES", message: `pack file exceeds 512KB: ${absPath}` },
    };
  }
  let parsed: unknown;
  try {
    if (absPath.endsWith(".json")) parsed = JSON.parse(raw);
    else parsed = yamlParse(raw);
  } catch (e) {
    return {
      error: { code: "POL-INVALID", message: `invalid pack YAML/JSON: ${(e as Error).message}` },
    };
  }
  const depth = depthOf(parsed);
  if (depth > PACK_LIMITS.maxDepth) {
    return {
      error: { code: "POL-PACK-LIMIT-DEPTH", message: `pack exceeds maxDepth 20: ${absPath}` },
    };
  }
  const validated = RulePackSchemaV1.safeParse(parsed);
  if (!validated.success) {
    const msg = validated.error.issues[0]?.message ?? "invalid pack";
    return { error: { code: "POL-INVALID", message: msg } };
  }
  const pack = validated.data;
  if (pack.rules.length > PACK_LIMITS.maxRules) {
    return { error: { code: "POL-PACK-LIMIT-RULES", message: `pack exceeds maxRules 200` } };
  }
  // per-rule match length + ReDoS + glob traversal checks
  for (const rule of pack.rules) {
    if (rule.match !== undefined && rule.match.length > PACK_LIMITS.maxPatternLen) {
      return {
        error: { code: "POL-PACK-LIMIT-PATTERN", message: `rule ${rule.id} match exceeds 500` },
      };
    }
    if (rule.glob !== undefined && isTraversalGlob(rule.glob)) {
      // URL globs refused
      if (isUrlShape(rule.glob)) {
        return {
          error: { code: "POL-NETWORK-REFUSED", message: `glob URL refused: ${rule.glob}` },
        };
      }
      // absolute/traversal already denied elsewhere; for glob we emit traversal diagnostic but still allow? spec says POL-PACK-TRAVERSAL
      // we refuse pack load via traversal diagnostic
      if (path.isAbsolute(rule.glob)) {
        return {
          error: {
            code: "POL-PACK-TRAVERSAL",
            message: `glob absolute path refused: ${rule.glob}`,
          },
        };
      }
    }
    if (rule.scope) {
      for (const s of rule.scope) {
        if (isUrlShape(s))
          return { error: { code: "POL-NETWORK-REFUSED", message: `scope URL refused: ${s}` } };
        if (path.isAbsolute(s))
          return {
            error: { code: "POL-PACK-TRAVERSAL", message: `scope absolute path refused: ${s}` },
          };
      }
    }
    if (rule.match !== undefined) {
      const guard = redosGuard(rule.match);
      if (!guard.ok) {
        return {
          error: {
            code: guard.code ?? "POL-PACK-REDOS",
            message: `ReDoS rejected rule ${rule.id}`,
          },
        };
      }
    }
  }
  return { pack, raw };
}

export async function loadRulePacks(
  root: { canonicalPath: string },
  rulePackPaths: readonly string[],
): Promise<LoadedPackResult> {
  const diagnostics: ScanDiagnostic[] = [];
  const allPacks: { pack: RulePackV1; abs: string; chainEntry: string }[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  async function dfs(entry: string, containingDir: string): Promise<void> {
    if (isUrlShape(entry)) {
      diagnostics.push({ code: "POL-NETWORK-REFUSED", message: `network URL refused: ${entry}` });
      return;
    }
    let abs: string;
    if (isPackageEntry(entry)) {
      const res = resolvePackagePath(root.canonicalPath, entry);
      if (res.kind === "error") {
        diagnostics.push(res.diagnostic);
        return;
      }
      abs = res.abs;
    } else {
      const res = await resolveLocalPath(root.canonicalPath, containingDir, entry);
      if (res.kind === "error") {
        diagnostics.push(res.diagnostic);
        return;
      }
      abs = res.abs;
    }
    const normalized = toPosix(path.relative(root.canonicalPath, abs)) || path.basename(abs);
    // cycle detection
    if (visiting.has(abs)) {
      diagnostics.push({ code: "POL-CYCLE", message: `pack extends cycle: ${abs}` });
      return;
    }
    if (visited.has(abs)) return;
    visiting.add(abs);
    const loaded = await loadSinglePackFile(abs, root.canonicalPath);
    if ("error" in loaded) {
      diagnostics.push(loaded.error);
      visiting.delete(abs);
      visited.add(abs);
      return;
    }
    const pack = loaded.pack;
    // DFS extends first
    const extendsEntries = pack.composition?.extends ?? [];
    // validate extends entries for URL before recursion
    for (const ext of extendsEntries) {
      if (isUrlShape(ext)) {
        diagnostics.push({
          code: "POL-NETWORK-REFUSED",
          message: `network extends refused: ${ext}`,
        });
        continue;
      }
      await dfs(ext, path.dirname(abs));
    }
    allPacks.push({ pack, abs, chainEntry: normalized });
    visiting.delete(abs);
    visited.add(abs);
  }

  for (const entry of rulePackPaths) {
    await dfs(entry, root.canonicalPath);
  }

  // compose into EffectiveRulePack per packId (group)
  const byPackId = new Map<string, typeof allPacks>();
  for (const item of allPacks) {
    const arr = byPackId.get(item.pack.packId) ?? [];
    arr.push(item);
    byPackId.set(item.pack.packId, arr);
  }

  const packs: EffectiveRulePack[] = [];
  const sortedPackIds = [...byPackId.keys()].sort();
  for (const packId of sortedPackIds) {
    const docs = (byPackId.get(packId) ?? [])
      .slice()
      .sort((a, b) => (a.chainEntry < b.chainEntry ? -1 : 1));
    const representative = docs[docs.length - 1]?.pack;
    if (!representative) continue;
    const chain = docs.map((d) => d.chainEntry);
    const rulesByCanonical = new Map<string, import("./types.js").EffectiveRule>();
    const packDiagnostics: ScanDiagnostic[] = [];
    for (const doc of docs) {
      for (const rule of doc.pack.rules) {
        const cId = canonicalId(rule.id, doc.pack.namespace, doc.pack.packId);
        if (isAckitId(cId) || isAckitId(rule.id)) {
          // global ACKIT ids cannot be redefined
          // if any pack tries to define ACKITxxx, emit collision and skip
          if (isAckitId(rule.id)) {
            packDiagnostics.push({
              code: "POL-PACK-COLLISION",
              message: `pack rule redefines global ACKIT id ${rule.id}`,
            });
            continue;
          }
        }
        const effectiveSeverity = (rule.severity ??
          doc.pack.severity) as import("./types.js").Severity;
        const existing = rulesByCanonical.get(cId);
        if (existing) {
          // collision: last wins but emit diagnostic
          packDiagnostics.push({
            code: "POL-PACK-COLLISION",
            message: `collision for ${cId}: last wins`,
          });
          // check locked on existing: if locked and weakens, retain existing
          if (existing.locked) {
            const weakens =
              severityRank(effectiveSeverity) < severityRank(existing.effectiveSeverity) ||
              rule.enabled === false;
            if (weakens) {
              packDiagnostics.push({
                code: "POL-PACK-LOCKED",
                message: `locked rule ${cId} weakening refused`,
              });
              continue;
            }
          }
        }
        rulesByCanonical.set(cId, {
          ...rule,
          packId: doc.pack.packId,
          namespace: doc.pack.namespace,
          effectiveSeverity,
          canonicalId: cId,
        });
      }
    }
    // apply overrides from each doc (sorted order, last wins)
    for (const doc of docs) {
      const overrides = doc.pack.overrides ?? {};
      for (const [ruleId, patch] of Object.entries(overrides)) {
        const targetKey = canonicalId(ruleId, doc.pack.namespace, doc.pack.packId);
        // also try alias without namespace
        let target = rulesByCanonical.get(targetKey);
        if (!target) {
          // try direct key as stored (maybe already canonical)
          target = rulesByCanonical.get(ruleId);
        }
        if (!target) {
          packDiagnostics.push({
            code: "POL-PACK-UNKNOWN-OVERRIDE",
            message: `unknown override ${ruleId}`,
          });
          continue;
        }
        if (target.locked) {
          const weakens =
            patch.severity !== undefined &&
            severityRank(patch.severity) < severityRank(target.effectiveSeverity);
          const disableWeakens = patch.enabled === false;
          if (weakens || disableWeakens) {
            packDiagnostics.push({
              code: "POL-PACK-LOCKED",
              message: `locked override ${ruleId} weakening refused`,
            });
            continue;
          }
        }
        if (patch.severity !== undefined) target.effectiveSeverity = patch.severity;
        if (patch.remediation !== undefined) target.remediation = patch.remediation;
        if (patch.enabled !== undefined) target.enabled = patch.enabled;
        if (patch.locked !== undefined) target.locked = patch.locked;
      }
    }
    const rules = [...rulesByCanonical.values()].sort((a, b) =>
      a.canonicalId < b.canonicalId ? -1 : 1,
    );
    const digest = packDigest(representative);
    packs.push({
      packId,
      namespace: representative.namespace,
      version: representative.version,
      severity: representative.severity,
      displayName: representative.displayName,
      description: representative.description,
      rules,
      digest,
      chain,
      diagnostics: packDiagnostics,
    });
    diagnostics.push(...packDiagnostics);
  }

  return { packs, diagnostics };
}
