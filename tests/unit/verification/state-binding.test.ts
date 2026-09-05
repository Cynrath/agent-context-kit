import { execFile as execFileCallback, execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { IntentStore } from "../../../src/core/intent/index.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import {
  BINDING_PROBLEM_CODES,
  type ComputedStateBinding,
  compareStoredBinding,
  computeStateBinding,
} from "../../../src/core/verification/binding.js";
import { buildVerificationBundle } from "../../../src/core/verification/bundle.js";
import { domainDigest, stableCanonicalJson } from "../../../src/core/verification/canonical.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import {
  isBoundVerdict,
  VERDICT_PROBLEM_CODES,
  VERDICT_SCHEMA_ID_V2,
} from "../../../src/core/verification/verdict.js";
import { WorkflowStore } from "../../../src/core/workflow/index.js";

const execFile = promisify(execFileCallback);
const FIXED_DATE = "2026-08-31";
const FIXED_GIT_DATE = "2026-08-31T00:00:00+00:00";

// Evaluated once at collection (module top-level await): Windows hosts
// without symlink privilege skip only the symlink-behavior test.
const SYMLINK_OK = await canCreateSymlink();

let rootPath = "";
let root: RepositoryRoot;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-binding-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# binding fixture\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], {
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: FIXED_GIT_DATE,
      GIT_COMMITTER_DATE: FIXED_GIT_DATE,
    },
  });
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  root = resolved.root;
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function verdictInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaId: "ackit.verdict.v1",
    verdict: "PASS",
    verifier: { agent: "fresh-verifier/1.0", context: "fresh", issuedAt: FIXED_DATE },
    findings: [],
    checkedCriteria: ["AC-001", "AC-002"],
    summary: "criteria met with recorded evidence",
    ...overrides,
  };
}

/**
 * Full standard-profile fixture: intent + plan + task(refs) + evidence +
 * workflow at verify. Returns the task id; the caller registers verdicts.
 */
async function makeStandardTask(options: { criteria?: [string, string] } = {}): Promise<string> {
  const [c1, c2] = options.criteria ?? ["Criterion one.", "Criterion two."];
  const store = new TaskStore(rootPath);
  // Single-active rule: block any previously left-active task deterministically
  // (many binding tests mutate-then-abandon their task by design).
  for (const doc of await store.list(false)) {
    if (doc.meta.status === "active") {
      const abs = path.join(rootPath, "docs", "tasks", "active", path.basename(doc.relativePath));
      const raw = await readFile(abs, "utf8");
      await writeFile(abs, raw.replace(/^status:\s*.*$/m, "status: blocked"), "utf8");
    }
  }
  const created = await store.create("binding fixture");
  const taskId = created.meta.id;
  const num = taskId.slice("TASK-".length);

  const intentId = await new IntentStore(rootPath).nextId();
  await mkdir(path.join(rootPath, "docs", "intent"), { recursive: true });
  await writeFile(
    path.join(rootPath, "docs", "intent", `${intentId}-binding-${num}.md`),
    [
      "---",
      'schemaId: "ackit.intent.v1"',
      `id: "${intentId}"`,
      `title: "binding intent ${num}"`,
      "status: accepted",
      `createdAt: "${FIXED_DATE}"`,
      `problem: "binding problem ${num}"`,
      `desiredOutcome: "binding outcome ${num}"`,
      "constraints: []",
      "nonGoals: []",
      "affectedSystems: []",
      "acceptanceCriteria: []",
      "openQuestions: []",
      "risks: []",
      "---",
      "",
      `# binding intent ${num}`,
      "",
    ].join("\n"),
    "utf8",
  );

  const planRef = `docs/plans/binding-${num}.md`;
  await mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
  await writeFile(path.join(rootPath, "docs", "plans", `binding-${num}.md`), "# plan\n", "utf8");

  const found = await store.find(taskId);
  if (found === null) throw new Error("task missing");
  const docAbs = path.join(
    rootPath,
    "docs",
    "tasks",
    "active",
    path.basename(created.relativePath),
  );
  const body = [
    "## Purpose",
    "",
    "Binding fixture.",
    "",
    "## Affected files",
    "",
    "- src/**",
    "",
    "## Acceptance criteria",
    "",
    `- [x] ${c1}`,
    `- [x] ${c2}`,
    "",
    "## Completion notes",
    "",
    "Implemented; evidence recorded below.",
  ].join("\n");
  await writeFile(
    docAbs,
    serialize({ ...found.doc.meta, intentRef: intentId, planRef }, body),
    "utf8",
  );
  await store.start(taskId);

  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task missing after authoring");
  const evidenceStore = new EvidenceStore(root);
  const registry = syncRegistry(doc.doc, null, FIXED_DATE);
  for (const criterion of registry.criteria) {
    criterion.status = "verified";
    criterion.evidence = [{ type: "test", ref: "pnpm vitest run (green)", recordedAt: FIXED_DATE }];
  }
  await evidenceStore.save(taskId, registry);

  const workflowStore = new WorkflowStore(root);
  await workflowStore.setProfile(taskId, "standard");
  await workflowStore.advanceTo(taskId, "plan");
  await workflowStore.advanceTo(taskId, "tasks");
  await workflowStore.advanceTo(taskId, "implement");
  await workflowStore.advanceTo(taskId, "verify");
  return taskId;
}

async function bindingFor(taskId: string): Promise<ComputedStateBinding> {
  return computeStateBinding(rootPath, taskId);
}

async function registerBound(taskId: string, overrides: Record<string, unknown> = {}) {
  const verdicts = new VerdictStore(rootPath);
  const registry = await new EvidenceStore(root).load(taskId);
  return verdicts.register(taskId, verdictInput(overrides), {
    evidenceRegistry: registry,
    binding: await bindingFor(taskId),
  });
}

describe("canonical hashing (ADR-0030 §3)", () => {
  it("stable canonical JSON is key-order independent and domain-separated", () => {
    expect(stableCanonicalJson({ b: 1, a: 2 })).toBe(stableCanonicalJson({ a: 2, b: 1 }));
    expect(domainDigest("task-contract", { a: 1 })).toBe(domainDigest("task-contract", { a: 1 }));
    expect(domainDigest("task-contract", { a: 1 })).not.toBe(domainDigest("evidence", { a: 1 }));
    expect(domainDigest("task-contract", { a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("state binding determinism (ADR-0030 §16)", () => {
  it("same state recomputed yields identical digests", async () => {
    const taskId = await makeStandardTask();
    const first = await bindingFor(taskId);
    const second = await bindingFor(taskId);
    expect(second).toEqual(first);
  });

  it("identical fixtures in separate temp roots yield identical digests", async () => {
    async function twinFixture(): Promise<{ twinRoot: string; taskId: string }> {
      const twinRoot = await mkdtemp(path.join(tmpdir(), "ackit-binding-twin-"));
      try {
        execFileSync("git", ["-C", twinRoot, "init", "-q"], { stdio: "ignore" });
        execFileSync("git", ["-C", twinRoot, "config", "user.email", "t@example.com"], {
          stdio: "ignore",
        });
        execFileSync("git", ["-C", twinRoot, "config", "user.name", "t"], { stdio: "ignore" });
        await writeFile(path.join(twinRoot, "README.md"), "# binding fixture\n", "utf8");
        await writeFile(path.join(twinRoot, "src-impl.js"), "export const x = 1;\n", "utf8");
        execFileSync("git", ["-C", twinRoot, "add", "."], { stdio: "ignore" });
        execFileSync("git", ["-C", twinRoot, "commit", "-q", "-m", "init"], {
          stdio: "ignore",
          env: {
            ...process.env,
            GIT_AUTHOR_DATE: FIXED_GIT_DATE,
            GIT_COMMITTER_DATE: FIXED_GIT_DATE,
          },
        });
        // Identical reviewed content (task/evidence/intent/plan/workflow).
        const store = new TaskStore(twinRoot);
        const created = await store.create("binding fixture");
        const taskId = created.meta.id;
        await mkdir(path.join(twinRoot, "docs", "intent"), { recursive: true });
        await writeFile(
          path.join(twinRoot, "docs", "intent", "INTENT-0001-twin.md"),
          [
            "---",
            'schemaId: "ackit.intent.v1"',
            'id: "INTENT-0001"',
            'title: "twin intent"',
            "status: accepted",
            `createdAt: "${FIXED_DATE}"`,
            'problem: "twin problem"',
            'desiredOutcome: "twin outcome"',
            "constraints: []",
            "nonGoals: []",
            "affectedSystems: []",
            "acceptanceCriteria: []",
            "openQuestions: []",
            "risks: []",
            "---",
            "",
            "# twin intent",
            "",
          ].join("\n"),
          "utf8",
        );
        await mkdir(path.join(twinRoot, "docs", "plans"), { recursive: true });
        await writeFile(path.join(twinRoot, "docs", "plans", "twin.md"), "# plan\n", "utf8");
        const found = await store.find(taskId);
        if (found === null) throw new Error("twin task missing");
        const docAbs = path.join(
          twinRoot,
          "docs",
          "tasks",
          "active",
          path.basename(created.relativePath),
        );
        const body = [
          "## Purpose",
          "",
          "Twin fixture.",
          "",
          "## Affected files",
          "",
          "- src/**",
          "",
          "## Acceptance criteria",
          "",
          "- [x] Twin one.",
          "- [x] Twin two.",
          "",
          "## Completion notes",
          "",
          "Twin notes.",
        ].join("\n");
        // Normalize the volatile createdAt so both roots are content-equal.
        await writeFile(
          docAbs,
          serialize(
            { ...found.doc.meta, intentRef: "INTENT-0001", planRef: "docs/plans/twin.md" },
            body,
          ).replace(/^createdAt:\s*.*$/m, `createdAt: "${FIXED_DATE}"`),
          "utf8",
        );
        const twinResolved = await resolveRepositoryRoot(twinRoot);
        if (!twinResolved.ok) throw new Error(twinResolved.diagnostic.message);
        const doc = await store.find(taskId);
        if (doc === null) throw new Error("twin task missing after authoring");
        const evidenceStore = new EvidenceStore(twinResolved.root);
        const registry = syncRegistry(doc.doc, null, FIXED_DATE);
        for (const criterion of registry.criteria) {
          criterion.status = "verified";
          criterion.evidence = [
            { type: "test", ref: "pnpm vitest run (green)", recordedAt: FIXED_DATE },
          ];
        }
        await evidenceStore.save(taskId, registry);
        const workflowStore = new WorkflowStore(twinResolved.root);
        await workflowStore.setProfile(taskId, "standard");
        await workflowStore.advanceTo(taskId, "plan");
        await workflowStore.advanceTo(taskId, "tasks");
        await workflowStore.advanceTo(taskId, "implement");
        await workflowStore.advanceTo(taskId, "verify");
        return { twinRoot, taskId };
      } catch (error) {
        await rm(twinRoot, { recursive: true, force: true });
        throw error;
      }
    }

    const a = await twinFixture();
    const b = await twinFixture();
    try {
      const bindingA = await computeStateBinding(a.twinRoot, a.taskId);
      const bindingB = await computeStateBinding(b.twinRoot, b.taskId);
      // Absolute temp roots differ; mtimes/clocks differ; digests must not.
      expect(a.twinRoot).not.toBe(b.twinRoot);
      expect(bindingB.components).toEqual(bindingA.components);
      expect(bindingB.stateDigest).toBe(bindingA.stateDigest);
      expect(bindingB.bundleDigest).toBe(bindingA.bundleDigest);
    } finally {
      await rm(a.twinRoot, { recursive: true, force: true });
      await rm(b.twinRoot, { recursive: true, force: true });
    }
  });

  it("child-process bundle JSON carries identical binding digests", async () => {
    const taskId = await makeStandardTask();
    const inProcess = await bindingFor(taskId);
    const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
    const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
    const spawned = await execFile(process.execPath, [
      cliEntry,
      "--root",
      rootPath,
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
    ]);
    const parsed = JSON.parse(spawned.stdout) as {
      binding: ComputedStateBinding;
    };
    expect(parsed.binding.stateDigest).toBe(inProcess.stateDigest);
    expect(parsed.binding.bundleDigest).toBe(inProcess.bundleDigest);
    expect(parsed.binding.components).toEqual(inProcess.components);
  });

  it("formatting-only changes do not alter semantic digests", async () => {
    const taskId = await makeStandardTask();
    // The file set must be identical for both measurements (any added file
    // is working-set state): write the config BEFORE the first binding, then
    // rewrite the same semantics with different formatting.
    await writeFile(path.join(rootPath, "ackit.yml"), "schemaVersion: 1\n", "utf8");
    const before = await bindingFor(taskId);
    // Same semantics, different formatting (comments + blank lines).
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["# binding comment", "schemaVersion: 1", "", "  # trailing", ""].join("\n"),
      "utf8",
    );
    try {
      const after = await bindingFor(taskId);
      expect(after.components.config).toBe(before.components.config);
      expect(after.components.sourceState).toBe(before.components.sourceState);
      expect(after.stateDigest).toBe(before.stateDigest);
    } finally {
      await unlink(path.join(rootPath, "ackit.yml"));
    }
  });
});

describe("negative matrix (ADR-0030 §15)", () => {
  it("A: source content changed after verdict → stale (sourceState)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    await writeFile(
      path.join(rootPath, `src-mut-a-${taskId.slice(5)}.js`),
      "export const a = 1;\n",
      "utf8",
    );
    try {
      const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
      expect(summary?.bound).toBe(true);
      expect(summary?.fresh).toBe(false);
      expect(summary?.problemCode).toBe(VERDICT_PROBLEM_CODES.stateStale);
      expect(summary?.changed).toContain("sourceState");
      await expect(new TaskStore(rootPath).complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
    } finally {
      await unlink(path.join(rootPath, `src-mut-a-${taskId.slice(5)}.js`));
    }
  });

  it("B: acceptance criterion changed → stale (taskContract)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(found.doc.relativePath),
    );
    const raw = await readFile(docAbs, "utf8");
    await writeFile(docAbs, raw.replace("Criterion one.", "Criterion one (rebound)."), "utf8");
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(false);
    expect(summary?.changed).toContain("taskContract");
    await expect(store.complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
  });

  it("C: intent changed → stale (intent)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null || found.doc.meta.intentRef === undefined) throw new Error("no intent");
    const intentDir = path.join(rootPath, "docs", "intent");
    const names = await readdir(intentDir);
    const name = names.find((n) => n.startsWith(found.doc.meta.intentRef ?? "NOPE"));
    if (name === undefined) throw new Error("intent file missing");
    const intentAbs = path.join(intentDir, name);
    const raw = await readFile(intentAbs, "utf8");
    // Keep the YAML valid: extend the problem text, preserve the quotes.
    await writeFile(intentAbs, raw.replace("binding problem ", "binding problem MUTATED "), "utf8");
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(false);
    expect(summary?.changed).toContain("intent");
    await expect(store.complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
  });

  it("D: plan content changed → stale (artifacts)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null || found.doc.meta.planRef === undefined) throw new Error("no plan");
    const planAbs = path.join(rootPath, ...found.doc.meta.planRef.split("/"));
    await writeFile(planAbs, "# plan\n\nmutated scope\n", "utf8");
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(false);
    expect(summary?.changed).toContain("artifacts");
    await expect(store.complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
  });

  it("E: verification-relevant config changed → stale (config)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "workflow:", "  defaultProfile: quick"].join("\n"),
      "utf8",
    );
    try {
      const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
      expect(summary?.fresh).toBe(false);
      expect(summary?.changed).toContain("config");
      await expect(new TaskStore(rootPath).complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
    } finally {
      await unlink(path.join(rootPath, "ackit.yml"));
    }
  });

  it("F: verification-relevant policy changed → stale (policy)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    await writeFile(
      path.join(rootPath, "ackit-policy.yml"),
      ["schemaVersion: 1", "review:", "  required:", "    - tests"].join("\n"),
      "utf8",
    );
    try {
      const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
      expect(summary?.fresh).toBe(false);
      expect(summary?.changed).toContain("policy");
      await expect(new TaskStore(rootPath).complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
    } finally {
      await unlink(path.join(rootPath, "ackit-policy.yml"));
    }
  });

  it("G: material evidence changed → stale (evidence)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    const evidenceStore = new EvidenceStore(root);
    const registry = await evidenceStore.load(taskId);
    if (registry === null) throw new Error("registry missing");
    const first = registry.criteria[0];
    if (first === undefined) throw new Error("criterion missing");
    first.evidence = [
      ...first.evidence,
      { type: "ci", ref: "CI matrix run 12345 (green)", recordedAt: FIXED_DATE },
    ];
    await evidenceStore.save(taskId, registry);
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(false);
    expect(summary?.changed).toContain("evidence");
    await expect(new TaskStore(rootPath).complete(taskId)).rejects.toThrow(/VERDICT-STATE-STALE/);
  });

  it("H: old bundle replayed against new state → refused (VERDICT-BUNDLE-MISMATCH)", async () => {
    const { runCli } = await import("../../../src/cli/index.js");
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
      const taskId = await makeStandardTask();
      const outRel = `docs/bundle-replay-${taskId.slice(5)}.json`;
      const bundleCode = await runCli([
        "node",
        "ackit",
        "--root",
        rootPath,
        "verification",
        "bundle",
        taskId,
        "--format",
        "json",
        "--out",
        outRel,
      ]);
      expect(bundleCode).toBe(0);
      // State moves on after the bundle was generated.
      const probe = path.join(rootPath, `src-replay-${taskId.slice(5)}.js`);
      await writeFile(probe, "export const replay = true;\n", "utf8");
      try {
        await writeFile(
          path.join(rootPath, `docs/verdict-replay-${taskId.slice(5)}.yaml`),
          [
            'schemaId: "ackit.verdict.v1"',
            `taskId: "${taskId}"`,
            'verdict: "PASS"',
            "verifier:",
            '  agent: "fresh-verifier/1.0"',
            '  context: "fresh"',
            `  issuedAt: "${FIXED_DATE}"`,
            "findings: []",
            "checkedCriteria:",
            '  - "AC-001"',
            '  - "AC-002"',
            'summary: "replay attempt"',
          ].join("\n"),
          "utf8",
        );
        errChunks.length = 0;
        const code = await runCli([
          "node",
          "ackit",
          "--root",
          rootPath,
          "verification",
          "record",
          taskId,
          "--verdict",
          `docs/verdict-replay-${taskId.slice(5)}.yaml`,
          "--bundle",
          outRel,
        ]);
        expect(code).not.toBe(0);
        expect(errChunks.join("")).toContain("verdict-bundle-mismatch");
      } finally {
        await unlink(probe);
      }
    } finally {
      process.stdout.write = originalWrite;
      process.stderr.write = originalErr;
    }
  });

  it("I: forged/self-declared binding is refused (VERDICT-INVALID)", async () => {
    const taskId = await makeStandardTask();
    const verdicts = new VerdictStore(rootPath);
    const registry = await new EvidenceStore(root).load(taskId);
    await expect(
      verdicts.register(
        taskId,
        verdictInput({
          binding: {
            version: 1,
            stateDigest: "0".repeat(64),
            bundleDigest: "1".repeat(64),
            components: {
              sourceState: "2".repeat(64),
              taskContract: "3".repeat(64),
              intent: "4".repeat(64),
              artifacts: "5".repeat(64),
              workflow: "6".repeat(64),
              config: "7".repeat(64),
              policy: "8".repeat(64),
              evidence: "9".repeat(64),
            },
          },
        }),
        { evidenceRegistry: registry, binding: await bindingFor(taskId) },
      ),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.schema });
  });

  it("J: legacy v1 verdict is readable but never silently fresh-bound", async () => {
    const taskId = await makeStandardTask();
    // Hand-place a legacy v1 file (as produced before TASK-0079).
    const { stringify } = await import("yaml");
    const { mkdir: mk } = await import("node:fs/promises");
    await mk(path.join(rootPath, ".ackit", "workflow", taskId, "verdicts"), { recursive: true });
    await writeFile(
      path.join(rootPath, ".ackit", "workflow", taskId, "verdicts", "VR-0001.yaml"),
      stringify(
        { ...(verdictInput() as Record<string, unknown>), id: "VR-0001", taskId },
        { lineWidth: 0 },
      ),
      "utf8",
    );
    const verdicts = new VerdictStore(rootPath);
    const listed = await verdicts.list(taskId);
    expect(listed).toHaveLength(1);
    expect(isBoundVerdict(listed[0] as never)).toBe(false);
    expect(await verdicts.read(taskId, "VR-0001")).not.toBeNull();
    const summary = await verdicts.latestVerdictSummary(taskId);
    expect(summary?.bound).toBe(false);
    expect(summary?.fresh).toBe(false);
    expect(summary?.problemCode).toBe(VERDICT_PROBLEM_CODES.bindingMissing);
    await expect(new TaskStore(rootPath).complete(taskId)).rejects.toThrow(
      /VERDICT-BINDING-MISSING/,
    );
  });
});

describe("non-invalidating changes (ADR-0030 §4)", () => {
  it("bookkeeping timestamp rewrite keeps the verdict fresh", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    const evidenceStore = new EvidenceStore(root);
    const registry = await evidenceStore.load(taskId);
    if (registry === null) throw new Error("registry missing");
    // Same semantic proof, new bookkeeping dates only.
    await evidenceStore.save(taskId, {
      ...registry,
      updatedAt: "2099-01-01",
      criteria: registry.criteria.map((c) => ({
        ...c,
        evidence: c.evidence.map((e) => ({ ...e, recordedAt: "2099-01-01" })),
      })),
    });
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(true);
  });

  it("checkbox ticks + completion notes do not circularly invalidate", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    // Ticking boxes and writing notes AFTER verification is the normal
    // completion flow — it must not stale its own verdict.
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(found.doc.relativePath),
    );
    const raw = await readFile(docAbs, "utf8");
    expect(raw).toContain("- [x]");
    await writeFile(
      docAbs,
      `${raw}\n\nAdditional completion note written after verification.\n`,
      "utf8",
    );
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(true);
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
    const archived = await store.archive(taskId);
    expect(archived).toContain("archive");
  });

  it("evidence entry reorder + ref-list reorder keep the verdict fresh", async () => {
    const taskId = await makeStandardTask();
    const evidenceStore = new EvidenceStore(root);
    const registry = await evidenceStore.load(taskId);
    if (registry === null) throw new Error("registry missing");
    const first = registry.criteria[0];
    if (first === undefined) throw new Error("criterion missing");
    first.evidence = [
      { type: "ci", ref: "CI run 7 (green)", recordedAt: FIXED_DATE },
      ...first.evidence,
    ];
    await evidenceStore.save(taskId, registry);
    await registerBound(taskId);
    // Reorder entries (canonical sort makes order non-semantic).
    const reloaded = await evidenceStore.load(taskId);
    if (reloaded === null) throw new Error("registry missing");
    const target = reloaded.criteria[0];
    if (target === undefined) throw new Error("criterion missing");
    target.evidence = [...target.evidence].reverse();
    await evidenceStore.save(taskId, reloaded);
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(true);
  });

  it("intent status flip keeps the verdict fresh (B2 guarantee)", async () => {
    const taskId = await makeStandardTask();
    await registerBound(taskId);
    // Provenance-only flip: accepted -> superseded touches NEITHER the
    // intent digest (status excluded) NOR the source backstop (docs/intent/
    // excluded) — the guarantee "draft → accepted must not self-invalidate".
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null || found.doc.meta.intentRef === undefined) throw new Error("no intent");
    const names = await readdir(path.join(rootPath, "docs", "intent"));
    const name = names.find((n) => n.startsWith(found.doc.meta.intentRef ?? "NOPE"));
    if (name === undefined) throw new Error("intent file missing");
    const intentAbs = path.join(rootPath, "docs", "intent", name);
    const raw = await readFile(intentAbs, "utf8");
    expect(raw).toContain("status: accepted");
    await writeFile(intentAbs, raw.replace("status: accepted", "status: superseded"), "utf8");
    const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
    expect(summary?.fresh).toBe(true);
    expect(summary?.changed ?? []).toEqual([]);
    const result = await store.complete(taskId);
    expect(result.forced).toBe(false);
  });
});

describe("completion-gate proof (ADR-0030 §14)", () => {
  it("bundle → verdict → unchanged completes; changed refuses; fresh re-verdict restores", async () => {
    const taskId = await makeStandardTask();
    const store = new TaskStore(rootPath);
    const verdicts = new VerdictStore(rootPath);
    // Bundle → verdict → unchanged state completes.
    const bundle = await buildVerificationBundle(root, taskId);
    expect(bundle.ok).toBe(true);
    if (!bundle.ok) return;
    expect(bundle.bundle.markdown).toContain("ackit.verification-bundle.v2");
    await registerBound(taskId);
    const completed = await store.complete(taskId);
    expect(completed.forced).toBe(false);

    // A second task proves changed-state refusal + fresh restoration.
    const taskId2 = await makeStandardTask();
    const store2 = new TaskStore(rootPath);
    await registerBound(taskId2);
    const probe = path.join(rootPath, `src-restore-${taskId2.slice(5)}.js`);
    await writeFile(probe, "export const restore = 1;\n", "utf8");
    await expect(store2.complete(taskId2)).rejects.toThrow(/VERDICT-STATE-STALE/);
    // Fresh bundle/verdict restores eligibility (no archive yet → active).
    const fresh = await buildVerificationBundle(root, taskId2);
    expect(fresh.ok).toBe(true);
    const registry = await new EvidenceStore(root).load(taskId2);
    await verdicts.register(taskId2, verdictInput(), {
      evidenceRegistry: registry,
      binding: await bindingFor(taskId2),
    });
    const summary = await verdicts.latestVerdictSummary(taskId2);
    expect(summary?.fresh).toBe(true);
    // Cleanup probe keeps later tests hermetic (source state is repo-wide).
    await unlink(probe);
    const recomputed = await verdicts.latestVerdictSummary(taskId2);
    expect(recomputed?.fresh).toBe(false);
    expect(recomputed?.changed).toContain("sourceState");
  });
});

describe("bundle / verdict evolution (ADR-0030 §10/§11)", () => {
  it("v2 bundle exposes structured binding; digest matches recomputation", async () => {
    const taskId = await makeStandardTask();
    const bundle = await buildVerificationBundle(root, taskId);
    expect(bundle.ok).toBe(true);
    if (!bundle.ok) return;
    expect(bundle.bundle.markdown).toContain("bundle-digest: ");
    const json = JSON.parse(bundle.bundle.json) as {
      schemaVersion: string;
      binding: ComputedStateBinding;
    };
    expect(json.schemaVersion).toBe("ackit.verification-bundle.v2");
    const current = await bindingFor(taskId);
    expect(json.binding.stateDigest).toBe(current.stateDigest);
    expect(json.binding.bundleDigest).toBe(current.bundleDigest);
    // No absolute paths or machine-specific temp paths in persisted output.
    expect(bundle.bundle.json).not.toContain(rootPath);
    expect(bundle.bundle.markdown).not.toContain(rootPath);
  });

  it("stored verdicts are v2 with binding; self-declared binding refused", async () => {
    const taskId = await makeStandardTask();
    const registered = await registerBound(taskId);
    expect(registered.schemaId).toBe(VERDICT_SCHEMA_ID_V2);
    expect(registered.binding.stateDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(registered.binding.gitUnavailable).toBe(false);
    expect(isBoundVerdict(registered)).toBe(true);
    const raw = await readFile(
      path.join(rootPath, ".ackit", "workflow", taskId, "verdicts", `${registered.id}.yaml`),
      "utf8",
    );
    expect(raw).toContain("ackit.verdict.v2");
    expect(raw).not.toContain(rootPath);
  });

  it("compareStoredBinding reports per-component change sets", async () => {
    const taskId = await makeStandardTask();
    const current = await bindingFor(taskId);
    expect(compareStoredBinding(current, current)).toEqual({ fresh: true, changed: [] });
    const tampered = {
      ...current,
      components: { ...current.components, evidence: "0".repeat(64) },
    };
    expect(compareStoredBinding(tampered, current).fresh).toBe(false);
    expect(compareStoredBinding(tampered, current).changed).toEqual(["evidence"]);
  });
});

describe("security boundaries (ADR-0030 §17)", () => {
  it("secret-shaped source content never lands in bundle/verdict artifacts", async () => {
    const taskId = await makeStandardTask();
    await writeFile(
      path.join(rootPath, `src-secret-${taskId.slice(5)}.js`),
      'export const key = "AKIAIOSFODNN7EXAMPLE";\n',
      "utf8",
    );
    try {
      const bundle = await buildVerificationBundle(root, taskId);
      expect(bundle.ok).toBe(true);
      if (!bundle.ok) return;
      expect(bundle.bundle.json).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(bundle.bundle.markdown).not.toContain("AKIAIOSFODNN7EXAMPLE");
      const registered = await registerBound(taskId);
      expect(JSON.stringify(registered)).not.toContain("AKIAIOSFODNN7EXAMPLE");
    } finally {
      await unlink(path.join(rootPath, `src-secret-${taskId.slice(5)}.js`));
    }
  });

  it("traversal artifact refs are refused before they reach binding", async () => {
    // First barrier: the task schema's repo-relative path rule rejects
    // traversal at parse time, so a traversal ref can never become bound
    // state (binding containment is the second, defense-in-depth barrier).
    const { TaskMetaSchema } = await import("../../../src/core/tasks/types.js");
    const parsed = TaskMetaSchema.safeParse({
      id: "TASK-0001",
      title: "t",
      status: "pending",
      schemaVersion: 2,
      dependencies: [],
      createdAt: FIXED_DATE,
      completedAt: null,
      planRef: "../outside.md",
    });
    expect(parsed.success).toBe(false);
  });

  it("non-file artifact refs fail closed with a stable code", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("non-file ref fixture");
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
      serialize({ ...found.doc.meta, planRef: "docs/plans" }, found.doc.body),
      "utf8",
    );
    await expect(bindingFor(taskId)).rejects.toMatchObject({
      code: BINDING_PROBLEM_CODES.artifactMissing,
    });
  });

  it("missing referenced artifacts fail closed with a stable code", async () => {
    const store = new TaskStore(rootPath);
    const created = await store.create("dangling ref fixture");
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
        { ...found.doc.meta, intentRef: "INTENT-9999", planRef: "docs/plans/nope.md" },
        found.doc.body,
      ),
      "utf8",
    );
    await expect(bindingFor(taskId)).rejects.toMatchObject({
      code: BINDING_PROBLEM_CODES.artifactMissing,
    });
    const bundle = await buildVerificationBundle(root, taskId);
    expect(bundle.ok).toBe(false);
    if (!bundle.ok) {
      expect(bundle.diagnostic.code).toBe(BINDING_PROBLEM_CODES.artifactMissing);
    }
  });

  it("registration without a binding is refused (VERDICT-BINDING-MISSING)", async () => {
    const taskId = await makeStandardTask();
    const verdicts = new VerdictStore(rootPath);
    const registry = await new EvidenceStore(root).load(taskId);
    await expect(
      verdicts.register(taskId, verdictInput(), { evidenceRegistry: registry }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.bindingMissing });
  });

  it("git-unavailable repos degrade explicitly and stay completable", async () => {
    const plainRoot = await mkdtemp(path.join(tmpdir(), "ackit-binding-nogit-"));
    try {
      const store = new TaskStore(plainRoot);
      const created = await store.create("nogit fixture");
      const taskId = created.meta.id;
      const found = await store.find(taskId);
      if (found === null) throw new Error("task missing");
      const docAbs = path.join(
        plainRoot,
        "docs",
        "tasks",
        "active",
        path.basename(created.relativePath),
      );
      const body = [
        "## Acceptance criteria",
        "",
        "- [x] Nogit one.",
        "- [x] Nogit two.",
        "",
        "## Completion notes",
        "",
        "Nogit notes.",
      ].join("\n");
      await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");
      await store.start(taskId);
      const plainResolved = await resolveRepositoryRoot(plainRoot);
      if (!plainResolved.ok) throw new Error(plainResolved.diagnostic.message);
      const doc = await store.find(taskId);
      if (doc === null) throw new Error("task missing after authoring");
      const evidenceStore = new EvidenceStore(plainResolved.root);
      const registry = syncRegistry(doc.doc, null, FIXED_DATE);
      for (const criterion of registry.criteria) {
        criterion.status = "verified";
        criterion.evidence = [
          { type: "test", ref: "pnpm vitest run (green)", recordedAt: FIXED_DATE },
        ];
      }
      await evidenceStore.save(taskId, registry);
      const workflowStore = new WorkflowStore(plainResolved.root);
      await workflowStore.setProfile(taskId, "standard");
      await workflowStore.advanceTo(taskId, "plan");
      await workflowStore.advanceTo(taskId, "tasks");
      await workflowStore.advanceTo(taskId, "implement");
      await workflowStore.advanceTo(taskId, "verify");

      const binding = await computeStateBinding(plainRoot, taskId);
      expect(binding.gitUnavailable).toBe(true);
      const bundle = await buildVerificationBundle(plainResolved.root, taskId);
      expect(bundle.ok).toBe(true);
      const verdicts = new VerdictStore(plainRoot);
      const registered = await verdicts.register(taskId, verdictInput(), {
        evidenceRegistry: registry,
        binding,
      });
      expect(isBoundVerdict(registered)).toBe(true);
      // B1: the degraded marker persists on the long-lived record (never a
      // silent strong claim) and stays visible to consumers.
      expect(registered.binding.gitUnavailable).toBe(true);
      const summary = await verdicts.latestVerdictSummary(taskId);
      expect(summary?.fresh).toBe(true);
      expect(summary?.gitUnavailable).toBe(true);
      // Degraded source state is an explicit constant marker: later file
      // churn cannot move it, so the verdict stays comparable — with the
      // weakness visible on the record above.
      await writeFile(path.join(plainRoot, "later.txt"), "afterthought\n", "utf8");
      const rechecked = await verdicts.latestVerdictSummary(taskId);
      expect(rechecked?.fresh).toBe(true);
      const completed = await store.complete(taskId);
      expect(completed.forced).toBe(false);
    } finally {
      await rm(plainRoot, { recursive: true, force: true });
    }
  });

  it.runIf(SYMLINK_OK)(
    "symlinks bind by target string without following or leaking paths",
    async () => {
      const taskId = await makeStandardTask();
      const linkAbs = path.join(rootPath, `src-link-${taskId.slice(5)}.js`);
      await symlink(`src-impl.js`, linkAbs);
      try {
        const binding = await bindingFor(taskId);
        const bundle = await buildVerificationBundle(root, taskId);
        expect(bundle.ok).toBe(true);
        if (!bundle.ok) return;
        expect(bundle.bundle.json).not.toContain(rootPath);
        const summary = await new VerdictStore(rootPath).latestVerdictSummary(taskId);
        // No verdict yet — binding itself must simply succeed deterministically.
        expect(summary).toBeNull();
        expect((await bindingFor(taskId)).stateDigest).toBe(binding.stateDigest);
      } finally {
        await unlink(linkAbs);
      }
    },
  );
});

async function canCreateSymlink(): Promise<boolean> {
  const probeDir = await mkdtemp(path.join(tmpdir(), "ackit-symlink-probe-"));
  try {
    await writeFile(path.join(probeDir, "target.txt"), "x", "utf8");
    await symlink("target.txt", path.join(probeDir, "link.txt"));
    await unlink(path.join(probeDir, "link.txt"));
    return true;
  } catch {
    return false;
  } finally {
    await rm(probeDir, { recursive: true, force: true });
  }
}

describe("stable diagnostic vocabulary (ADR-0030 §12)", () => {
  it("exact codes and meanings", () => {
    expect(VERDICT_PROBLEM_CODES.bindingMissing).toBe("VERDICT-BINDING-MISSING");
    expect(VERDICT_PROBLEM_CODES.bundleMismatch).toBe("VERDICT-BUNDLE-MISMATCH");
    expect(VERDICT_PROBLEM_CODES.stateStale).toBe("VERDICT-STATE-STALE");
    expect(BINDING_PROBLEM_CODES.unavailable).toBe("VERIFICATION-BINDING-UNAVAILABLE");
    expect(BINDING_PROBLEM_CODES.artifactMissing).toBe("VERIFICATION-ARTIFACT-MISSING");
    // Pre-existing codes are unchanged.
    expect(VERDICT_PROBLEM_CODES.schema).toBe("VERDICT-INVALID");
    expect(VERDICT_PROBLEM_CODES.taskUnknown).toBe("VERDICT-TASK-UNKNOWN");
    expect(VERDICT_PROBLEM_CODES.criterionUnknown).toBe("VERDICT-CRITERION-UNKNOWN");
    expect(VERDICT_PROBLEM_CODES.blockingOnPass).toBe("VERDICT-BLOCKING-ON-PASS");
  });
});
