import { promises as fsp } from "node:fs";
import path from "node:path";
import type { ScoreReport } from "./types.js";

export interface ReadinessBaselineFile {
  version: "ackit.readiness.v1";
  engineVersion: string;
  overall: number;
  categories: ScoreReport["categories"];
  deductions: ScoreReport["deductions"];
  inputsHash: string;
  createdAt: string;
}

export async function writeReadinessBaseline(
  rootPath: string,
  report: ScoreReport,
  baselinePath: string,
): Promise<void> {
  const absolute = path.resolve(rootPath, baselinePath);
  if (!isInsideRoot(rootPath, absolute)) {
    throw new Error(`READINESS-BASELINE-PATH: baseline path outside repository root`);
  }
  const payload: ReadinessBaselineFile = {
    version: "ackit.readiness.v1",
    engineVersion: report.engineVersion,
    overall: report.overall,
    categories: report.categories,
    deductions: report.deductions,
    inputsHash: report.inputsHash,
    createdAt: new Date().toISOString(),
  };
  const json = JSON.stringify(payload, null, 2);
  if (json.length > 1_000_000) {
    throw new Error("baseline file exceeds 1MB limit");
  }
  await fsp.mkdir(path.dirname(absolute), { recursive: true });
  await fsp.writeFile(absolute, json, "utf8");
}

export async function readReadinessBaseline(
  rootPath: string,
  baselinePath: string,
): Promise<ReadinessBaselineFile | null> {
  const absolute = path.resolve(rootPath, baselinePath);
  if (!isInsideRoot(rootPath, absolute)) {
    throw new Error(`READINESS-BASELINE-PATH: baseline path outside repository root`);
  }
  try {
    const raw = await fsp.readFile(absolute, "utf8");
    if (raw.length > 1_000_000) return null;
    const parsed = JSON.parse(raw) as ReadinessBaselineFile;
    if (parsed.version !== "ackit.readiness.v1") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function diffAgainstBaseline(
  report: ScoreReport,
  baseline: ReadinessBaselineFile,
): { baselineScore: number; delta: number; baselineVersion: string; baselineInputsHash: string } {
  return {
    baselineScore: baseline.overall,
    delta: report.overall - baseline.overall,
    baselineVersion: baseline.version,
    baselineInputsHash: baseline.inputsHash,
  };
}

function isInsideRoot(root: string, absolute: string): boolean {
  const rel = path.relative(root, absolute);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
