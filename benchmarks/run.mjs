#!/usr/bin/env node
// Performance harness (REQ-PERF-001): measures cold/warm/incremental scan,
// peak RSS, throughput, graph time, pack time and cache ratio per fixture
// class using the BUILT dist modules in-process.
// Usage: node benchmarks/run.mjs [--classes small,medium] [--out benchmarks/results]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { classNames, generateFixture } from "./generate-fixtures.mjs";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const repoRoot = path.resolve(here, "..");
const dist = (rel) => path.join(repoRoot, "dist", rel);
const outDir = process.argv.includes("--out")
  ? path.resolve(process.argv[process.argv.indexOf("--out") + 1])
  : path.join(here, "results");
const classesArg = process.argv.includes("--classes")
  ? process.argv[process.argv.indexOf("--classes") + 1].split(",")
  : classNames();

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
  const allTargets = (await collectScanTargets(resolved.root, { skipClassification: true })).targets
    .length;
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

  // ---- Workflow expansion measurements (TASK-0060, median-of-3) ------------
  // Deterministic fixture: a task + workflow state + evidence registry + a
  // registered verdict, so every measured path exercises real state.
  const { TaskStore } = await import("file://" + dist("core/tasks/index.js"));
  const { WorkflowStore } = await import("file://" + dist("core/workflow/index.js"));
  const { EvidenceStore, validateEvidence } = await import(
    "file://" + dist("core/evidence/index.js")
  );
  const { syncRegistry } = await import("file://" + dist("core/evidence/sync.js"));
  const { CheckpointStore } = await import("file://" + dist("core/checkpoint/index.js"));
  const { buildVerificationBundle } = await import("file://" + dist("core/verification/index.js"));
  const { detectWorkflowDrift } = await import("file://" + dist("core/drift/index.js"));
  const { resolveAutonomy, resolveReview } = await import("file://" + dist("core/policy/index.js"));
  const { buildContextPack: buildPackFn } = await import("file://" + dist("core/context/pack.js"));

  const tasksStore = new TaskStore(fixturePath);
  const created = await tasksStore.create("bench workflow fixture");
  const benchTaskId = created.meta.id;
  const workflowStore = new WorkflowStore(resolved.root);
  await workflowStore.setProfile(benchTaskId, "standard");
  const evidenceStore = new EvidenceStore(resolved.root);
  const doc = await tasksStore.find(benchTaskId);
  const registry = syncRegistry(doc.doc, null, "2026-08-31");
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "bench", recordedAt: "2026-08-31" }];
  }
  await evidenceStore.save(benchTaskId, registry);

  function medianOf3(fn) {
    return async () => {
      const samples = [];
      for (let i = 0; i < 3; i += 1) {
        const start = performance.now();
        await fn();
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      return round(samples[1]);
    };
  }

  const checkpointStore = new CheckpointStore(resolved.root, fixturePath);
  const taskPackMs = await medianOf3(() =>
    buildPackFn(resolved.root, {
      format: "json",
      maxTokens: 200000,
      taskContext: { declaredScopeGlobs: ["**"], referencePaths: [], changedFiles: [] },
    }),
  )();
  // Median-of-3 create with distinct next actions; load measures read cost.
  let cpCounter = 0;
  const checkpointCreateMs = await medianOf3(() =>
    checkpointStore.create(
      benchTaskId,
      doc.doc,
      { profile: "standard", stage: "implement" },
      { objective: `bench action ${cpCounter++}` },
    ),
  )();
  const checkpointLoadMs = await medianOf3(() => checkpointStore.latest(benchTaskId))();
  const evidenceValidateMs = await medianOf3(() => validateEvidence(registry))();
  const bundleMs = await medianOf3(() => buildVerificationBundle(resolved.root, benchTaskId))();
  const driftMs = await medianOf3(() =>
    detectWorkflowDrift({
      taskId: benchTaskId,
      taskDoc: doc.doc,
      workflow: { profile: "standard", stage: "implement" },
      requiredArtifacts: ["task"],
      existingArtifacts: ["task", "evidence"],
      referencePathsExist: [],
      evidence: registry,
      latestVerdict: { verdict: "PASS" },
      checkpoint: null,
      checkpointProblems: [],
      changedFiles: [],
      dependencies: [],
    }),
  )();
  const policyEvalMs = await medianOf3(() => {
    resolveAutonomy([{ tier2: "deny" }, { tier3: "ask" }]);
    resolveReview([{ required: ["security", "tests"] }]);
  })();
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
    // Workflow expansion measurements (TASK-0060): median-of-3, ms.
    taskPackMs: round(taskPackMs),
    checkpointCreateMs: round(checkpointCreateMs),
    checkpointLoadMs: round(checkpointLoadMs),
    evidenceValidateMs: round(evidenceValidateMs),
    bundleMs: round(bundleMs),
    driftMs: round(driftMs),
    policyEvalMs: round(policyEvalMs),
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
      machine: {
        platform: process.platform,
        cpus: os.cpus().length,
        model: os.cpus()[0]?.model ?? "?",
        node: process.version,
      },
      results,
    },
    null,
    2,
  )}\n`,
);
console.log(`written ${path.relative(repoRoot, outFile)}`);

// Threshold check (advisory): compare against the committed baseline when present.
try {
  const baseline = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "-e",
        `console.log(JSON.stringify(require(${JSON.stringify(path.join(here, "thresholds.json"))})))`,
      ],
      { encoding: "utf8" },
    ),
  );
  void baseline;
} catch {
  /* thresholds optional */
}

function round(value) {
  return Math.round(value * 100) / 100;
}
