import { promises as fsp } from "node:fs";
import path from "node:path";
import { getPackageIdentity } from "../../shared/version.js";
import type { RepositoryRoot } from "../filesystem/root.js";
import type { Finding } from "../scanner/types.js";

export const BASELINE_SCHEMA_VERSION = 1;

export interface BaselineEntry {
  ruleId: string;
  fingerprint: string;
  relativePath: string;
  line: number;
  column: number;
  severity: string;
}

export interface Baseline {
  schemaVersion: number;
  generatedBy: string;
  createdAt: string;
  findings: BaselineEntry[];
}

export interface BaselineDiff {
  newFindings: Finding[];
  fixedCount: number;
}

/**
 * Baselines store ONLY structural fields (fingerprint/path/position/severity)
 * — never evidence or message text — so no secret value can leak through a
 * committed baseline (REQ-BASE-001 safety, REQ-GOV-005).
 */
export function toBaselineEntries(findings: readonly Finding[]): BaselineEntry[] {
  return findings.map((finding) => ({
    ruleId: finding.ruleId,
    fingerprint: finding.fingerprint,
    relativePath: finding.relativePath,
    line: finding.line,
    column: finding.column,
    severity: finding.severity,
  }));
}

export async function writeBaseline(
  root: RepositoryRoot,
  findings: readonly Finding[],
  baselineRelativePath: string,
): Promise<string> {
  const identity = getPackageIdentity();
  const baseline: Baseline = {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    generatedBy: `ackit ${identity.version}`,
    createdAt: new Date().toISOString(),
    findings: toBaselineEntries(findings),
  };
  const absolute = path.join(root.canonicalPath, ...baselineRelativePath.split("/"));
  await fsp.mkdir(path.dirname(absolute), { recursive: true });
  await fsp.writeFile(absolute, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return absolute;
}

export async function readBaseline(
  root: RepositoryRoot,
  baselineRelativePath: string,
): Promise<Baseline | null> {
  try {
    const raw = await fsp.readFile(
      path.join(root.canonicalPath, ...baselineRelativePath.split("/")),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Partial<Baseline>;
    if (parsed.schemaVersion !== BASELINE_SCHEMA_VERSION || !Array.isArray(parsed.findings)) {
      return null;
    }
    return parsed as Baseline;
  } catch {
    return null;
  }
}

/**
 * Compare (REQ-BASE-001): new = fingerprints not present in the baseline;
 * fixed = baseline fingerprints absent from the current run. Suppressed
 * findings never enter either side.
 */
export function compareBaseline(findings: readonly Finding[], baseline: Baseline): BaselineDiff {
  const known = new Set(baseline.findings.map((entry) => entry.fingerprint));
  const newFindings = findings.filter(
    (finding) => !finding.suppressed && !known.has(finding.fingerprint),
  );
  const currentFingerprints = new Set(findings.map((finding) => finding.fingerprint));
  const fixedCount = baseline.findings.filter(
    (entry) => !currentFingerprints.has(entry.fingerprint),
  ).length;
  return { newFindings, fixedCount };
}
