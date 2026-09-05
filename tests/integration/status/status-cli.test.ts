/**
 * `ackit status` CLI integration (TASK-0081, ADR-0032): human + stable JSON
 * output, default-active resolution, usage errors, and CLI-level read-only
 * behavior (git porcelain clean after runs).
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { computeStateBinding } from "../../../src/core/verification/binding.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";
const DATE = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-status-cli-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# status cli fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const originalWrite = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    errChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

function porcelain(): string {
  return execFileSync("git", ["-C", rootPath, "status", "--porcelain"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("ackit status CLI (ADR-0032)", () => {
  it("human + JSON projections over a verified workflow task, then git-clean", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("status cli fixture");
    const taskId = created.meta.id;
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(created.relativePath),
    );
    await writeFile(
      docAbs,
      serialize(
        found.doc.meta,
        [
          "## Acceptance criteria",
          "",
          "- [x] Cli thing done.",
          "",
          "## Completion notes",
          "",
          "Cli thing implemented; evidence recorded below.",
        ].join("\n"),
      ),
      "utf8",
    );
    await store.start(taskId);
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const doc = await store.find(taskId);
    if (doc === null) throw new Error("task missing after authoring");
    const evidenceStore = new EvidenceStore(resolved.root);
    const registry = syncRegistry(doc.doc, null, DATE);
    for (const criterion of registry.criteria) {
      criterion.status = "verified";
      criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: DATE }];
    }
    await evidenceStore.save(taskId, registry);
    const workflowStore = new WorkflowStore(resolved.root);
    await workflowStore.setProfile(taskId, "standard");
    await workflowStore.advanceTo(taskId, "plan");
    await workflowStore.advanceTo(taskId, "tasks");
    await workflowStore.advanceTo(taskId, "implement");
    await workflowStore.advanceTo(taskId, "verify");
    const binding = await computeStateBinding(rootPath, taskId);
    await new VerdictStore(rootPath).register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS",
        verifier: { agent: "status-cli/1.0", context: "fresh", issuedAt: DATE },
        findings: [],
        checkedCriteria: ["AC-001"],
        summary: "cli fixture review",
      },
      { evidenceRegistry: registry, binding, reviewedBundleDigest: binding.bundleDigest },
    );

    const before = porcelain();
    const human = await cli(["status", taskId]);
    expect(human.code).toBe(EXIT_CODES.ok);
    expect(human.stdout).toContain(`task: ${taskId} — status cli fixture (explicit)`);
    expect(human.stdout).toContain("blockers: (none — completion eligible)");
    expect(human.stdout).toContain("independent");
    expect(human.stdout).toContain(`ackit task complete ${taskId}`);

    // Default resolution picks the single active task.
    const implicit = await cli(["status"]);
    expect(implicit.code).toBe(EXIT_CODES.ok);
    expect(implicit.stdout).toContain("(single active task)");

    const json = await cli(["--json", "status", taskId]);
    expect(json.code).toBe(EXIT_CODES.ok);
    const report = JSON.parse(json.stdout) as {
      schemaVersion: string;
      task: { id: string };
      blockers: string[];
      verdict: { independent: boolean };
      next: { command: string }[];
    };
    expect(report.schemaVersion).toBe("ackit.status.v1");
    expect(report.task.id).toBe(taskId);
    expect(report.blockers).toEqual([]);
    expect(report.verdict.independent).toBe(true);
    expect(report.next).toEqual([
      {
        action: `complete task ${taskId}`,
        command: `ackit task complete ${taskId}`,
        reason: "all completion gates pass",
      },
    ]);
    // Read-only at the CLI surface: porcelain identical after all runs.
    expect(porcelain()).toBe(before);
  });

  it("unknown tasks are usage errors, never mutations", async () => {
    const before = porcelain();
    const unknown = await cli(["status", "TASK-9999"]);
    expect(unknown.code).toBe(EXIT_CODES.usage);
    expect(unknown.stderr).toContain("status-task-unknown");
    const bad = await cli(["status", "../escape"]);
    expect(bad.code).toBe(EXIT_CODES.usage);
    expect(bad.stderr).toContain("status-task-id-invalid");
    expect(porcelain()).toBe(before);
  });
});
