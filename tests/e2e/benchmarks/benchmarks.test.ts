import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const BENCH = path.join(REPO_ROOT, "benchmarks");

function listRel(base: string) {
  const out: string[] = [];
  function visit(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(abs);
      else out.push(path.relative(base, abs).split(path.sep).join("/"));
    }
  }
  visit(base);
  return out.sort();
}

describe("benchmark suite (REQ-PERF-001)", () => {
  it("fixture generation is deterministic across runs", () => {
    const a = mkdtempSync(path.join(tmpdir(), "ackit-bench-a-"));
    const b = mkdtempSync(path.join(tmpdir(), "ackit-bench-b-"));
    try {
      for (const target of [a, b]) {
        execFileSync(process.execPath, [path.join(BENCH, "generate-fixtures.mjs"), target], {
          encoding: "utf8",
        });
      }
      const aFiles = listRel(a);
      const bFiles = listRel(b);
      expect(bFiles).toEqual(aFiles);
      const aSizes = aFiles.map((f) => readFileSync(path.join(a, f)).length);
      const bSizes = bFiles.map((f) => readFileSync(path.join(b, f)).length);
      expect(bSizes).toEqual(aSizes);
    } finally {
      rmSync(a, { recursive: true, force: true });
      rmSync(b, { recursive: true, force: true });
    }
  }, 120000);

  it("harness collects all eight metrics for the small class", () => {
    const out = mkdtempSync(path.join(tmpdir(), "ackit-bench-out-"));
    try {
      execFileSync(
        process.execPath,
        [path.join(BENCH, "run.mjs"), "--classes", "small", "--out", out],
        {
          encoding: "utf8",
        },
      );
      const files = readdirSync(out).filter((entry) => entry.startsWith("baseline-"));
      expect(files.length).toBe(1);
      const baseline = JSON.parse(readFileSync(path.join(out, files[0] as string), "utf8")) as {
        results: Record<string, Record<string, number>>;
      };
      const small = baseline.results["small"];
      for (const metric of [
        "coldScanMs",
        "warmScanMs",
        "incrementalMs",
        "peakRssMb",
        "filesPerSec",
        "packMs",
        "graphMs",
        "cacheHitRatio",
      ]) {
        expect(small?.[metric]).toBeGreaterThan(0);
      }
      expect(small?.["files"]).toBeGreaterThan(0);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 180000);

  it("threshold mechanism passes against its own committed config", () => {
    const thresholds = JSON.parse(readFileSync(path.join(BENCH, "thresholds.json"), "utf8")) as {
      defaultMultiplier: number;
      perClass: Record<string, Record<string, number>>;
    };
    expect(thresholds.defaultMultiplier).toBeGreaterThan(1);
    for (const [, limits] of Object.entries(thresholds.perClass)) {
      for (const [, multiplier] of Object.entries(limits)) {
        expect(multiplier).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
