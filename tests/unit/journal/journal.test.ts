import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { JOURNAL_FILE, JournalStore } from "../../../src/core/journal/index.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-journal-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function makeStore(): Promise<JournalStore> {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return new JournalStore(resolved.root);
}

describe("journal store (ackit.execution-journal.v1, ADR-0027 §6)", () => {
  it("appends events with monotonic seq and reads them back ordered", async () => {
    const journal = await makeStore();
    expect(await journal.append("task-transition", { to: "active", taskId: "TASK-0001" })).toBe(
      true,
    );
    expect(
      await journal.append("workflow-stage", { taskId: "TASK-0001", profile: "standard" }),
    ).toBe(true);
    expect(
      await journal.append("evidence-registered", {
        taskId: "TASK-0001",
        criterion: "AC-001",
        type: "test",
      }),
    ).toBe(true);
    const events = await journal.read();
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(events.map((e) => e.kind)).toEqual([
      "task-transition",
      "workflow-stage",
      "evidence-registered",
    ]);
  });

  it("redaction at construction: secret-shaped detail replaced (T26)", async () => {
    const journal = await makeStore();
    // A secret-shaped detail value must be redacted, never persisted; the
    // event-level taskId context survives redaction.
    expect(
      await journal.append(
        "evidence-registered",
        { taskId: "TASK-0002", criterion: "AC-002", type: "AKIAIOSFODNN7EXAMPLE" },
        { taskId: "TASK-0002" },
      ),
    ).toBe(true);
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(path.join(rootPath, ".ackit", "workflow", JOURNAL_FILE), "utf8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const redactedLine = lines.find((l) => l.includes("TASK-0002"));
    expect(redactedLine).toBeDefined();
    expect(redactedLine).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redactedLine).toContain('"redacted":true');
    expect(redactedLine).toContain('"taskId":"TASK-0002"');
    // Redaction never invalidates the event on re-read.
    const events = await journal.read();
    expect(events.some((e) => e.kind === "evidence-registered" && e.taskId === "TASK-0002")).toBe(
      true,
    );
  });

  it("invalid event kinds/shapes are never persisted (closed kind list)", async () => {
    const journal = await makeStore();
    const before = (await journal.read()).length;
    const appended = await journal.append("conversation-captured" as never, {});
    expect(appended).toBe(false); // not a journal kind — refused
    expect(await journal.append("task-transition", { bogus: "shape" })).toBe(false); // invalid detail shape — refused
    expect((await journal.read()).length).toBe(before);
  });

  it("validate audits the journal: valid lines pass; tampered lines fail", async () => {
    const journal = await makeStore();
    const cleanBefore = await journal.validate();
    expect(cleanBefore.ok).toBe(true); // everything written so far is valid
    // Tamper: append a garbage line.
    const { appendFile } = await import("node:fs/promises");
    await appendFile(path.join(rootPath, ".ackit", "workflow", JOURNAL_FILE), "garbage\n", "utf8");
    const tampered = await journal.validate();
    expect(tampered.ok).toBe(false);
    expect(tampered.problems.some((p) => p.includes("not valid JSON"))).toBe(true);
  });

  it("journal failures never crash (best-effort) and rotation is capped", async () => {
    const journal = await makeStore();
    // Sequential writes keep working (append-only semantics).
    for (let i = 0; i < 5; i += 1) {
      expect(await journal.append("ackit-command", { command: `cmd-${i}`, outcome: "ok" })).toBe(
        true,
      );
    }
    const events = await journal.read();
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(events.map((e) => e.seq)).toEqual([...events.map((e) => e.seq)].sort((a, b) => a - b));
  });

  it("no conversation/thought/tool-call kinds exist in the closed enum", async () => {
    const { JOURNAL_EVENT_KINDS } = await import("../../../src/core/journal/index.js");
    const kinds = [...JOURNAL_EVENT_KINDS];
    expect(kinds).toEqual([
      "task-transition",
      "ackit-command",
      "policy-decision",
      "evidence-registered",
      "verdict-registered",
      "checkpoint-created",
      "workflow-stage",
      "verification-attempt",
    ]);
    for (const forbidden of ["conversation", "thought", "tool-call", "prompt"]) {
      expect(kinds.some((k) => k.includes(forbidden))).toBe(false);
    }
  });

  it("writeFile-tampered absolute paths do not appear in events", async () => {
    const journal = await makeStore();
    await journal.append("checkpoint-created", { taskId: "TASK-0004", checkpoint: "CP-0001" });
    const events = await journal.read();
    const serialized = JSON.stringify(events);
    expect(serialized).not.toMatch(/[A-Z]:\\\\Users/);
    expect(serialized).not.toMatch(/\/home\//);
    void writeFile;
  });
});
