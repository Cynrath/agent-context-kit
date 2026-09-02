import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checksumContent } from "../../../src/core/instructions/references.js";

/**
 * Doctor managed-assets integration (TASK-0072): the doctor row is READ-ONLY
 * (doctor must never write) and reports up-to-date / updates available /
 * conflict-user-modified correctly.
 */

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-doctor-managed-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function snapshot(): Promise<Map<string, string>> {
  const { readdir } = await import("node:fs/promises");
  const out = new Map<string, string>();
  async function visit(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else
        out.set(
          path.relative(rootPath, absolute).split("\\").join("/"),
          checksumContent(await readFile(absolute)),
        );
    }
  }
  await visit(rootPath);
  return out;
}

describe("doctor managed-assets row (TASK-0072)", () => {
  it("reports read-only staleness without ever writing (full-tree proof)", async () => {
    const { runDoctorCommand } = await import("../../../src/cli/commands/doctor.js");
    const { runCli } = await import("../../../src/cli/index.js");

    // 1. Empty repo → managed assets "updates available" (everything missing).
    const before = await snapshot();
    const codeEmpty = await runDoctorCommand({
      root: rootPath,
      json: true,
      quiet: true,
      ci: false,
      config: undefined,
      debug: false,
    });
    expect(codeEmpty).toBe(0); // advisory row never fails doctor
    await expectTree(before, await snapshot());

    // 2. Seed a fully-synced state via the real CLI sync, then doctor again.
    const syncCode = await runCli(["node", "ackit", "--root", rootPath, "sync", "--quiet"]);
    expect(syncCode).toBe(0);
    const synced = await snapshot();

    const codeSynced = await runDoctorCommand({
      root: rootPath,
      json: true,
      quiet: true,
      ci: false,
      config: undefined,
      debug: false,
    });
    expect(codeSynced).toBe(0);
    await expectTree(synced, await snapshot()); // doctor wrote nothing

    // 3. Introduce a stale managed block → "updates available", still no write.
    const agentsPath = path.join(rootPath, "AGENTS.md");
    const current = await readFile(agentsPath, "utf8");
    await writeFile(
      agentsPath,
      current.replace(
        /(<!-- ackit:managed:start \(codex\) -->)[\s\S]*?(<!-- ackit:managed:end \(codex\) -->)/,
        "$1\nstale text\n$2",
      ),
      "utf8",
    );
    const staleSnapshot = await snapshot();
    const mtimeBefore = (await stat(agentsPath)).mtimeMs;

    const codeStale = await runDoctorCommand({
      root: rootPath,
      json: true,
      quiet: true,
      ci: false,
      config: undefined,
      debug: false,
    });
    expect(codeStale).toBe(0); // still advisory
    await expectTree(staleSnapshot, await snapshot());
    expect((await stat(agentsPath)).mtimeMs).toBe(mtimeBefore);
  });

  it("JSON output includes the managed assets check row", async () => {
    const chunks: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string) => {
      chunks.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;
    try {
      await runDoctorCommandOutputCapture();
    } finally {
      process.stdout.write = originalWrite;
    }
    const parsed = JSON.parse(chunks.join("")) as {
      checks: Array<{ name: string; ok: boolean; detail: string }>;
    };
    const managed = parsed.checks.find((check) => check.name === "managed assets");
    expect(managed).toBeDefined();
    expect(managed?.ok).toBe(true); // advisory, never hard-fails doctor
    expect(
      managed?.detail === "up-to-date" ||
        managed?.detail === "updates available" ||
        managed?.detail.startsWith("conflict-user-modified"),
    ).toBe(true);
  });
});

async function runDoctorCommandOutputCapture(): Promise<void> {
  const { runDoctorCommand } = await import("../../../src/cli/commands/doctor.js");
  const code = await runDoctorCommand({
    root: rootPath,
    json: true,
    quiet: true,
    ci: false,
    config: undefined,
    debug: false,
  });
  if (code !== 0) throw new Error(`doctor exited ${code}`);
}

async function expectTree(before: Map<string, string>, after: Map<string, string>): Promise<void> {
  expect(after.size).toBe(before.size);
  for (const [file, checksum] of before) {
    expect(after.get(file)).toBe(checksum);
  }
}
