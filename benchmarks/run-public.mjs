#!/usr/bin/env node
/**
 * Public benchmark runner — offline, deterministic, no third-party code execution.
 * Clones public repos (shallow) and runs ACKit's static analysis.
 * Allowed: clone, read files, run ACKit's offline analysis.
 * Forbidden: npm/pnpm install, pip install, dotnet restore/build, cargo build, go test, repository scripts/hooks, skills execution, arbitrary binaries.
 */

import { execSync } from "node:child_process";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function main() {
  const publicReposPath = path.join(repoRoot, "benchmarks", "public-repos.json");
  const repos = JSON.parse(await fsp.readFile(publicReposPath, "utf8"));
  console.log(`[public-bench] ${repos.length} repos pinned`);

  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-public-bench-"));
  console.log(`[public-bench] tmpRoot: ${tmpRoot}`);

  const results = [];
  // Lazy import SDK to avoid top-level side effects
  const { scanRepository } = await import("../dist/index.js");
  const { scoreRepository } = await import("../dist/core/readiness/index.js");
  const { buildInstructionGraph } = await import("../dist/core/instructions/graph.js");

  for (const entry of repos) {
    const { name, url, sha, ecosystem } = entry;
    const safeName = name.replaceAll("/", "-");
    const cloneDir = path.join(tmpRoot, safeName);
    console.log(`[public-bench] cloning ${name}@${sha.slice(0, 7)} (${ecosystem})`);
    try {
      // Shallow clone of specific SHA via fetch + checkout
      // Use git init + fetch of SHA (requires server to have SHA, otherwise fallback to depth 1 HEAD)
      await fsp.mkdir(cloneDir, { recursive: true });
      execSync(`git init`, { cwd: cloneDir, stdio: "pipe" });
      execSync(`git remote add origin ${url}`, { cwd: cloneDir, stdio: "pipe" });
      try {
        execSync(`git fetch --depth 1 origin ${sha}`, { cwd: cloneDir, stdio: "pipe" });
        execSync(`git checkout FETCH_HEAD`, { cwd: cloneDir, stdio: "pipe" });
      } catch {
        // Fallback: shallow clone HEAD if SHA not reachable (e.g., GC'd)
        await fsp.rm(cloneDir, { recursive: true, force: true });
        execSync(`git clone --depth 1 ${url} "${cloneDir}"`, { stdio: "pipe" });
      }

      const start = performance.now();
      const scan = await scanRepository({ canonicalPath: cloneDir });
      const scanMs = Math.round(performance.now() - start);

      const graph = await buildInstructionGraph({ canonicalPath: cloneDir });
      // Readiness requires pack etc., but we can score with minimal inputs
      // Use scan + graph + empty others for quick score
      let readinessOverall = 0;
      try {
        const { buildContextPack } = await import("../dist/core/context/pack.js");
        const pack = await buildContextPack({ canonicalPath: cloneDir }, { maxTokens: 50000 });
        const { validateSkills } = await import("../dist/core/skills/validate.js");
        const skills = await validateSkills({ canonicalPath: cloneDir });
        const { TaskStore } = await import("../dist/core/tasks/store.js");
        const store = new TaskStore(cloneDir);
        const tasks = await store.list(true).catch(() => []);
        const policy = { findings: scan.findings.filter((f) => f.category === "config-problem") };
        const taskHealth = { dirExists: true, totalTasks: tasks.length };
        const readiness = scoreRepository(
          { graph, pack, scan, skills, policy, tasks: taskHealth },
          {},
        );
        readinessOverall = readiness.overall;
      } catch {
        readinessOverall = 0;
      }

      results.push({
        name,
        sha: sha.slice(0, 7),
        ecosystem,
        filesScanned: scan.filesScanned ?? scan.findings.length,
        findings: scan.findings.length,
        readiness: readinessOverall,
        coldScanMs: scanMs,
        graphNodes: graph.nodes.length,
      });
      console.log(`[public-bench] ${name}: ${scan.findings.length} findings, readiness ${readinessOverall}, ${scanMs}ms`);
    } catch (e) {
      console.error(`[public-bench] ${name} failed: ${e.message}`);
      results.push({ name, sha: sha.slice(0, 7), ecosystem, error: e.message });
    }
  }

  // Aggregate
  const totalFiles = results.reduce((s, r) => s + (r.filesScanned || 0), 0);
  const totalFindings = results.reduce((s, r) => s + (r.findings || 0), 0);
  const byEcosystem = {};
  for (const r of results) {
    byEcosystem[r.ecosystem] = (byEcosystem[r.ecosystem] || 0) + 1;
  }
  const aggregate = {
    generatedAt: new Date().toISOString().slice(0, 10),
    repoCount: repos.length,
    totalFiles,
    totalFindings,
    byEcosystem,
    repos: results,
  };

  const outPath = path.join(repoRoot, "benchmarks", "public-evidence.json");
  await fsp.writeFile(outPath, JSON.stringify(aggregate, null, 2) + "\n", "utf8");
  console.log(`[public-bench] wrote ${outPath}`);
  console.log(`[public-bench] aggregate: ${totalFiles} files, ${totalFindings} findings across ${repos.length} repos`);
  console.log(`[public-bench] byEcosystem: ${JSON.stringify(byEcosystem)}`);

  // Do not publish raw secret findings — only counts
  console.log("[public-bench] done — no secrets published, no third-party code executed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
