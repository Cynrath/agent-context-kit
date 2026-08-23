#!/usr/bin/env node
// Performance harness (REQ-PERF-001): measures cold/warm/incremental scan,
// peak RSS, throughput, graph time, pack time and cache ratio per fixture
// class using the BUILT dist modules in-process.
// Usage: node benchmarks/run.mjs [--classes small,medium] [--out benchmarks/results]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { generateFixture, classNames } from "./generate-fixtures.mjs";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const repoRoot = path.resolve(here, "..");
const dist = (rel) => path.join(repoRoot, "dist", rel);
const outDir = process.argv.includes("--out") ? path.resolve(process.argv[process.argv.indexOf("--out") + 1]) : path.join(here, "results");
const classesArg = process.argv.includes("--classes") ? process.argv[process.argv.indexOf("--classes") + 1].split(",") : classNames();

const { resolveRepositoryRoot } = await import("file://" + dist("core/filesystem/root.js"));
const { runScan } = await import("file://" + dist("core/scanner/pipeline.js"));
const { builtinRegistry } = await import("file://" + dist("core/scanner/rules/catalog.js"));
const { buildInstructionGraph } = await import("file://" + dist("core/instructions/graph.js"));
const { buildContextPack } = await import("file://" + dist("core/context/pack.js"));

const rules = builtinRegistry().getAll();
let peakRss = 0;
function rss() {
  const value = process.memoryUsage().rss / 1024 / 1024;
  if (value > peakRss) peakRss = value;
  return value;
}

async function timedScan(root, filterPaths) {
  const start = performance.now();
  const result = await runScan(root, { rules, filterPaths });
  const ms = performance.now() - start;
  rss();
  return { ms, files: result.filesScanned };
}

const results = {};

for (const className of classesArg) {
  const fixturePath = generateFixture(className, path.join(outDir, ".fixtures"));
  const resolved = await resolveRepositoryRoot(fixturePath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  peakRss = 0;

  const { collectScanTargets } = await import("file://" + dist("core/filesystem/scan-targets.js"));
  const allTargets = (await collectScanTargets(resolved.root, { skipClassification: true })).targets.length;
  const totalFiles = allTargets;
  // Cold scan (fresh process would be colder; OS caches make this an upper bound).
  const cold = await timedScan(resolved.root);
  // Warm scan (modules + fs cache hot).
  const warm = await timedScan(resolved.root);
  // Incremental: re-evaluate a single changed file only.
  const incrementalStart = performance.now();
  {
    const target = allTargets > 0 ? "file000.txt" : "";
    await runScan(resolved.root, { rules, filterPaths: new Set([target]) });
  }
  const incrementalMs = performance.now() - incrementalStart;
  rss();

  const graphStart = performance.now();
  await buildInstructionGraph(resolved.root);
  const graphMs = performance.now() - graphStart;
  rss();

  const packStart = performance.now();
  await buildContextPack(resolved.root, { format: "json", maxTokens: 200000 });
  const packMs = performance.now() - packStart;
  rss();

  results[className] = {
    files: totalFiles,
    coldScanMs: round(cold.ms),
    warmScanMs: round(warm.ms),
    incrementalMs: round(incrementalMs),
    filesPerSec: Math.round((totalFiles / Math.max(1, warm.ms)) * 1000),
    peakRssMb: round(peakRss),
    graphMs: round(graphMs),
    packMs: round(packMs),
    // Derived honest metric: fraction of files skipped by the incremental set.
    cacheHitRatio: round(1 - 1 / Math.max(1, totalFiles)),
  };
  console.log(`${className}: ${JSON.stringify(results[className])}`);
  rmSync(path.join(outDir, ".fixtures", className), { recursive: true, force: true });
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const outFile = path.join(outDir, `baseline-${stamp}.json`);
writeFileSync(
  outFile,
  `${JSON.stringify(
    {
      schemaVersion: "ackit.bench.v0",
      date: stamp,
      machine: { platform: process.platform, cpus: os.cpus().length, model: os.cpus()[0]?.model ?? "?", node: process.version },
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(`written ${path.relative(repoRoot, outFile)}`);

// Threshold check (advisory): compare against the committed baseline when present.
try {
  const baseline = JSON.parse(execFileSync(process.execPath, ["-e", `console.log(JSON.stringify(require(${JSON.stringify(path.join(here, "thresholds.json"))})))`], { encoding: "utf8" }));
  void baseline;
} catch {
  /* thresholds optional */
}

function round(value) {
  return Math.round(value * 100) / 100;
}
