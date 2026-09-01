import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CheckpointStore,
  collectStalenessContext,
  renderHandoffPack,
  renderResumeContext,
  validateCheckpointStaleness,
} from "../../../src/core/checkpoint/index.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import type { TaskDoc } from "../../../src/core/tasks/index.js";
import { TaskStore } from "../../../src/core/tasks/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-cp-"));
  // Deterministic git fixture: init + one commit so git surfaces exist.
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# cp fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function makeStores() {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return {
    root: resolved.root,
    tasks: new TaskStore(rootPath),
    checkpoints: new CheckpointStore(resolved.root, rootPath),
  };
}

/** A partially-completed task body: one criterion done, one pending. */
function partiallyDoneTaskBody(): string {
  return [
    "## Purpose",
    "",
    "Implement: scenario fixture.",
    "",
    "## Acceptance criteria",
    "",
    "- [x] First criterion completed.",
    "- [ ] Second criterion pending.",
    "",
    "## Decisions",
    "",
    "- Use the local store for state.",
    "",
    "## Failures",
    "",
    "- First attempt hit a boundary error.",
    "",
    "## Blockers",
    "",
    "- Waiting on git availability in CI.",
    "",
    "## Completion notes",
    "",
    "(placeholder)",
  ].join("\n");
}

describe("checkpoint store (ackit.checkpoint.v1)", () => {
  it("creates, lists, and reads checkpoints with strict validation", async () => {
    const { tasks, checkpoints } = await makeStores();
    const created = await tasks.create("resume scenario");
    // Rewrite the body so the work state is partially complete.
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(created.relativePath),
    );
    const { serialize } = await import("../../../src/core/tasks/index.js");
    const raw = await import("node:fs/promises").then((fsp) => fsp.readFile(docAbs, "utf8"));
    const frontmatterEnd = raw.indexOf("---", 3);
    const updated = `${raw.slice(0, frontmatterEnd + 3)}\n${partiallyDoneTaskBody()}\n`;
    await writeFile(docAbs, updated, "utf8");
    const doc = (await tasks.find(created.meta.id))?.doc as TaskDoc;

    const cp1 = await checkpoints.create(
      created.meta.id,
      doc,
      { profile: "standard", stage: "implement" },
      {
        objective: "Implement the pending criterion",
        path: "src/pending.ts",
        command: "pnpm test",
        expectedResult: "all tests green",
      },
    );
    expect(cp1.id).toBe("CP-0001");
    expect(cp1.completedWork).toEqual(["First criterion completed."]);
    expect(cp1.pendingWork).toEqual(["Second criterion pending."]);
    expect(cp1.decisions).toEqual(["Use the local store for state."]);
    expect(cp1.failures).toEqual(["First attempt hit a boundary error."]);
    expect(cp1.blockers).toEqual(["Waiting on git availability in CI."]);
    expect(cp1.workflow).toEqual({ profile: "standard", stage: "implement" });
    expect(cp1.nextAction.objective).toBe("Implement the pending criterion");
    expect(cp1.gitHead).not.toBe("");

    const cp2 = await checkpoints.create(
      created.meta.id,
      doc,
      { profile: "standard", stage: "implement" },
      { objective: "Follow-up action" },
    );
    expect(cp2.id).toBe("CP-0002");
    const list = await checkpoints.list(created.meta.id);
    expect(list.map((cp) => cp.id)).toEqual(["CP-0001", "CP-0002"]);
    expect((await checkpoints.latest(created.meta.id))?.id).toBe("CP-0002");
    void serialize;
  });

  it("refuses invalid task ids and empty next actions", async () => {
    const { root, checkpoints, tasks } = await makeStores();
    const created = await tasks.create("gate fixture");
    await expect(
      checkpoints.create("../../escape", created, { profile: "quick" }, { objective: "x" }),
    ).rejects.toMatchObject({ code: "CHECKPOINT-TASK-ID-INVALID" });
    await expect(
      checkpoints.create(created.meta.id, created, { profile: "quick" }, { objective: "  " }),
    ).rejects.toMatchObject({ code: "CHECKPOINT-NEXT-ACTION-REQUIRED" });
    void root;
  });

  it("rejects tampered checkpoint files on read (THREAT_MODEL T16)", async () => {
    const { checkpoints, tasks } = await makeStores();
    const created = await tasks.create("tamper fixture");
    await checkpoints.create(created.meta.id, created, { profile: "quick" }, { objective: "x" });
    const file = path.join(
      rootPath,
      ".ackit",
      "workflow",
      created.meta.id,
      "checkpoints",
      "CP-0001.yaml",
    );
    const { readFile, writeFile } = await import("node:fs/promises");
    const raw = await readFile(file, "utf8");
    await writeFile(file, `${raw}injectedField: pwned\n`, "utf8");
    await expect(checkpoints.read(created.meta.id, "CP-0001")).rejects.toMatchObject({
      code: "CHECKPOINT-INVALID",
    });
  });
});

describe("staleness detection (ADR-0027 §4)", () => {
  it("fresh checkpoint on unchanged git state is not stale", async () => {
    const { checkpoints, tasks } = await makeStores();
    const created = await tasks.create("staleness fixture");
    const cp = await checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "x" },
    );
    const problems = validateCheckpointStaleness(cp, rootPath, collectStalenessContext(rootPath));
    expect(problems).toEqual([]);
  });

  it("STALE_CHECKPOINT when the recorded head diverges", async () => {
    const { checkpoints, tasks } = await makeStores();
    const created = await tasks.create("stale fixture");
    const cp = await checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "x" },
    );
    // Reset the recorded head to a fabricated value that is not an ancestor.
    const tampered = { ...cp, gitHead: "0000000" };
    const problems = validateCheckpointStaleness(
      tampered,
      rootPath,
      collectStalenessContext(rootPath),
    );
    expect(problems.some((p) => p.code === "STALE_CHECKPOINT")).toBe(true);
  });

  it("next-action path that was never in the changed set is NOT stale (future target)", async () => {
    const { checkpoints, tasks } = await makeStores();
    const created = await tasks.create("future path fixture");
    const cp = await checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "Create a brand-new file", path: "src/future-target.ts" },
    );
    // src/future-target.ts does not exist yet — that is normal, not stale.
    const problems = validateCheckpointStaleness(cp, rootPath, collectStalenessContext(rootPath));
    expect(problems).toEqual([]);
  });

  it("STALE_CHECKPOINT when a recorded changed-set next-action path vanishes", async () => {
    const { checkpoints, tasks } = await makeStores();
    const created = await tasks.create("vanished path fixture");
    // Record the task doc itself as the next-action path (it IS in the changed
    // set: git porcelain collapses the untracked docs/ dir, so presence is
    // prefix-based — exactly what wasRecorded() implements).
    const cp = await checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "Edit the task doc", path: created.relativePath },
    );
    // The recorded collapsed entry ('docs/') covers the task doc path.
    expect(cp.changedAreas.some((entry) => created.relativePath.startsWith(entry))).toBe(true);
    // Simulate the surface vanishing: validate against an empty current set.
    const problems = validateCheckpointStaleness(cp, rootPath, {
      gitHead: cp.gitHead,
      changedFiles: [],
    });
    expect(problems.some((p) => p.code === "STALE_CHECKPOINT")).toBe(true);
  });
});

describe("resume + handoff rendering (deterministic, provider-independent)", () => {
  it("renders the exact recorded next action from partially-completed work", async () => {
    const { tasks, checkpoints } = await makeStores();
    const created = await tasks.create("resume render fixture");
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(created.relativePath),
    );
    const { readFile, writeFile } = await import("node:fs/promises");
    const raw = await readFile(docAbs, "utf8");
    const frontmatterEnd = raw.indexOf("---", 3);
    await writeFile(
      docAbs,
      `${raw.slice(0, frontmatterEnd + 3)}\n${partiallyDoneTaskBody()}\n`,
      "utf8",
    );
    const doc = (await tasks.find(created.meta.id))?.doc as TaskDoc;
    const cp = await checkpoints.create(
      created.meta.id,
      doc,
      { profile: "standard", stage: "implement" },
      {
        objective: "Implement the pending criterion",
        path: "src/pending.ts",
        command: "pnpm test",
        expectedResult: "all tests green",
      },
    );
    const resume = renderResumeContext(
      cp,
      { id: created.meta.id, title: created.meta.title, status: created.meta.status },
      null,
    );
    expect(resume).toContain("## Completed work");
    expect(resume).toContain("- First criterion completed.");
    expect(resume).toContain("## Pending work");
    expect(resume).toContain("- Second criterion pending.");
    expect(resume).toContain("## Next action");
    expect(resume).toContain("Implement the pending criterion");
    expect(resume).toContain("File: src/pending.ts");
    expect(resume).toContain("Command: pnpm test");
    expect(resume).toContain("Expected result: all tests green");
    // Determinism: same inputs → byte-identical output.
    expect(
      renderResumeContext(
        cp,
        { id: created.meta.id, title: created.meta.title, status: created.meta.status },
        null,
      ),
    ).toBe(resume);
  });

  it("provider switch: a FRESH store/process reads the same checkpoint state", async () => {
    // Mandated scenario (§22): agent A checkpoint → agent B (fresh stores,
    // no conversation) → same task state → exact next action preserved.
    const agentA = await makeStores();
    const created = await agentA.tasks.create("provider switch fixture");
    await agentA.checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "Agent A final action", command: "pnpm build" },
    );
    // "Session ends": brand-new store instances (simulates a new process).
    const agentB = await makeStores();
    const cp = await agentB.checkpoints.latest(created.meta.id);
    expect(cp).not.toBeNull();
    expect(cp?.nextAction.objective).toBe("Agent A final action");
    expect(cp?.nextAction.command).toBe("pnpm build");
    const resume = renderResumeContext(
      cp as NonNullable<typeof cp>,
      { id: created.meta.id, title: created.meta.title, status: "pending" },
      null,
    );
    expect(resume).toContain("Agent A final action");
  });

  it("handoff pack embeds the task document and resume context", async () => {
    const { tasks, checkpoints } = await makeStores();
    const created = await tasks.create("handoff fixture");
    const cp = await checkpoints.create(
      created.meta.id,
      created,
      { profile: "quick" },
      { objective: "Handoff action" },
    );
    const pack = renderHandoffPack(
      cp,
      {
        id: created.meta.id,
        title: created.meta.title,
        status: created.meta.status,
        body: created.body,
        relativePath: created.relativePath,
      },
      null,
    );
    expect(pack).toContain("# ACKit Handoff Pack");
    expect(pack).toContain("## Task document");
    expect(pack).toContain("Handoff action");
  });
});
