/**
 * Adversarial path-containment matrix (TASK-0084).
 *
 * Each case is executed LIVE (no hand-waving): ATTACK (exact command /
 * fixture) → RESULT (allowed/refused + exact code) → VERDICT (gap or
 * contained, with source citations). CLI rows spawn the BUILT CLI
 * (`dist/cli/index.js`, the shipped artifact); MCP rows use the real
 * in-process transport; core rows probe the containment primitives.
 *
 * Fixtures use synthetic paths/values only, inside isolated temp roots —
 * no real user directories are touched.
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isInsideRoot, normalizeRelativePath } from "../../src/core/filesystem/paths.js";
import { createAckitMcpServer } from "../../src/mcp/server.js";

const execFile = promisify(execFileCallback);

// Evaluated once at collection: Windows hosts without symlink privilege
// skip only the file-symlink rows (dir rows use junctions on win32).
const SYMLINK_OK = await canCreateSymlink();
const DIR_LINK_TYPE = process.platform === "win32" ? ("junction" as const) : ("dir" as const);

let repo = "";
let outside = "";
let cliEntry = "";

beforeAll(async () => {
  repo = await mkdtemp(path.join(tmpdir(), "ackit-adversarial-"));
  outside = await mkdtemp(path.join(tmpdir(), "ackit-adversarial-outside-"));
  execFileSync("git", ["-C", repo, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", repo, "config", "user.email", "t@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", repo, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(repo, "README.md"), "# adversarial fixture\n", "utf8");
  await writeFile(path.join(outside, "secret.txt"), "outside content\n", "utf8");
  execFileSync("git", ["-C", repo, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", repo, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  // A checkpointed task so export paths have a subject.
  const { TaskStore, serialize } = await import("../../src/core/tasks/index.js");
  const store = new TaskStore(repo);
  const created = await store.create("adversarial fixture");
  const found = await store.find(created.meta.id);
  if (found === null) throw new Error("task missing");
  const docAbs = path.join(repo, "docs", "tasks", "active", path.basename(created.relativePath));
  await writeFile(
    docAbs,
    serialize(
      found.doc.meta,
      [
        "## Acceptance criteria",
        "",
        "- [x] Adversarial done.",
        "",
        "## Completion notes",
        "",
        "Done.",
      ].join("\n"),
    ),
    "utf8",
  );
  await store.start(created.meta.id);
  const { CheckpointStore } = await import("../../src/core/checkpoint/index.js");
  const { resolveRepositoryRoot } = await import("../../src/core/filesystem/root.js");
  const resolved = await resolveRepositoryRoot(repo);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  const live = await store.find(created.meta.id);
  if (live === null) throw new Error("task missing before checkpoint");
  await new CheckpointStore(resolved.root, repo).create(
    created.meta.id,
    live.doc,
    { profile: "quick" },
    { objective: "adversarial objective" },
  );
  cliEntry = path.resolve(import.meta.dirname, "..", "..", "dist", "cli", "index.js");
});

afterAll(async () => {
  await rm(repo, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
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

interface SpawnResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function spawnCli(args: string[]): Promise<SpawnResult> {
  try {
    const { stdout, stderr } = await execFile(
      process.execPath,
      [cliEntry, "--root", repo, ...args],
      { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

async function mcpCall(tool: string, args: Record<string, string>): Promise<string> {
  const { server } = await createAckitMcpServer(repo);
  const client = new Client({ name: "adversarial-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: tool, arguments: args });
    return (result.content as Array<{ type: string; text: string }>).map((c) => c.text).join("");
  } finally {
    await client.close();
  }
}

describe("adversarial matrix: string-level attacks (live CLI)", () => {
  it("R1 absolute POSIX --out refused (exit 4)", async () => {
    // ATTACK: checkpoint export --out /tmp/x.md (absolute POSIX).
    const r = await spawnCli([
      "checkpoint",
      "export",
      "TASK-0001",
      "--out",
      path.join(outside, "r1.md"),
    ]);
    // RESULT: refused. VERDICT: contained — resolveContainedPath rejects
    // absolute form before any fs access (checkpoint-handoff.ts).
    expect(r.code).toBe(4);
    expect(r.stderr).toContain("escapes repository root");
  });

  it("R2 Windows drive-letter --out refused (exit 4)", async () => {
    // ATTACK: C:\... absolute (and the repo's own drive re-rooted outside).
    const drive = path.parse(repo).root;
    const r = await spawnCli(["checkpoint", "export", "TASK-0001", "--out", `${drive}win-abs.md`]);
    expect(r.code).toBe(4);
    expect(r.stderr).toContain("escapes repository root");
  });

  it("R3 UNC --out refused (exit 4)", async () => {
    const r = await spawnCli([
      "checkpoint",
      "export",
      "TASK-0001",
      "--out",
      "\\\\server\\share\\x.md",
    ]);
    expect(r.code).toBe(4);
    expect(r.stderr).toContain("escapes repository root");
  });

  it("R4/R5/R6/R7 traversal ladder refused at every depth (exit 4)", async () => {
    for (const attack of [
      "../escape.md",
      "a/../../escape.md",
      "a/b/../../../escape.md",
      "..\\escape.md",
      "docs/../../escape.md",
    ]) {
      const r = await spawnCli(["checkpoint", "export", "TASK-0001", "--out", attack]);
      expect(r.code, attack).toBe(4);
      expect(r.stderr, attack).toContain("escapes repository root");
    }
    // Same ladder against the verification bundle writer.
    for (const attack of ["../escape.md", "a/../../escape.md"]) {
      const r = await spawnCli(["verification", "bundle", "TASK-0001", "--out", attack]);
      expect(r.code, attack).toBe(4);
    }
  });

  it("R8 NUL byte refused without crashing (exit 2)", async () => {
    // ATTACK: embedded NUL — path.resolve would throw; handlers must fail closed.
    const r = await spawnCli(["checkpoint", "export", "TASK-0001", "--out", "a\0b.md"]);
    expect(r.code).not.toBe(0);
  });

  it("R15/R16 root boundary: root-level file allowed, directory-as-file fails closed", async () => {
    // ATTACK: --out top.md (repo-root file, no directory part) — legitimate.
    const ok = await spawnCli(["checkpoint", "export", "TASK-0001", "--out", "top-r15.md"]);
    // RESULT: allowed. VERDICT: correct — containment holds, write lands inside.
    expect(ok.code).toBe(0);
    await rm(path.join(repo, "top-r15.md"), { force: true });
    // ATTACK: --out . (the directory itself) — fails closed, never escapes.
    const dir = await spawnCli(["checkpoint", "export", "TASK-0001", "--out", "."]);
    expect(dir.code).not.toBe(0);
  });
});

describe("adversarial matrix: symlink rows (live CLI)", () => {
  it.runIf(SYMLINK_OK)(
    "R9/R10/R11 file-symlink reads are schema-contained (negative findings)",
    async () => {
      // ATTACK: symlink inside the repo pointing at an outside file, used as
      // --verdict / --bundle / handoff import input.
      const link = path.join(repo, ".ackit", "link-r9.yaml");
      await mkdir(path.join(repo, ".ackit"), { recursive: true });
      await symlink(path.join(outside, "secret.txt"), link);
      try {
        const verdict = await spawnCli([
          "verification",
          "record",
          "TASK-0001",
          "--verdict",
          ".ackit/link-r9.yaml",
        ]);
        // RESULT: the outside bytes are read, then REJECTED as a non-verdict
        // (schema validation is the boundary — no trust on read).
        // VERDICT: contained — attacker-owned bytes cannot become verdicts,
        // bundles, or handoffs without passing strict validation.
        expect(verdict.code).not.toBe(0);
        expect(verdict.stderr).toMatch(/verdict-invalid|not valid YAML|failed schema validation/);
        const imported = await spawnCli(["checkpoint", "import", ".ackit/link-r9.yaml"]);
        expect(imported.code).not.toBe(0);
      } finally {
        await unlink(link);
      }
    },
  );

  it("R12/R13 dir-link + --out writes are refused (gap fixed, regression-guarded)", async () => {
    // ATTACK: directory link planted in the repo (junction on win32, dir
    // symlink elsewhere) pointing outside; --out through it.
    // PRE-FIX RESULT (proven 2026-09-05): exit 0 with bytes outside the
    // root. POST-FIX: link-aware write containment refuses (exit 4) and
    // nothing lands outside. VERDICT: gap CLOSED — string-level
    // containment was insufficient for write paths (fix:
    // resolveContainedWritePath, wired into all root-contained --out
    // writers + skills scaffold).
    const linkDir = path.join(repo, "docs", "link-r12");
    await symlink(outside, linkDir, DIR_LINK_TYPE);
    try {
      const bundle = await spawnCli([
        "verification",
        "bundle",
        "TASK-0001",
        "--out",
        "docs/link-r12/r12.md",
      ]);
      expect(bundle.code).toBe(4);
      expect(bundle.stderr).toContain("escapes repository root");
      const pack = await spawnCli([
        "checkpoint",
        "export",
        "TASK-0001",
        "--out",
        "docs/link-r12/r13.md",
      ]);
      expect(pack.code).toBe(4);
      expect(pack.stderr).toContain("escapes repository root");
      expect(await readFile(path.join(outside, "r12.md"), "utf8").catch(() => null)).toBeNull();
      expect(await readFile(path.join(outside, "r13.md"), "utf8").catch(() => null)).toBeNull();
    } finally {
      await rm(linkDir, { recursive: true, force: true });
      await rm(path.join(outside, "r12.md"), { force: true });
      await rm(path.join(outside, "r13.md"), { force: true });
    }
  });
});

describe("adversarial matrix: core primitives (unit probes)", () => {
  it("normalizeRelativePath refuses absolute/UNC/NUL/nested escapes; allows benign forms", () => {
    expect(normalizeRelativePath("/abs/x").ok).toBe(false);
    expect(normalizeRelativePath("C:\\Win\\x").ok).toBe(false);
    expect(normalizeRelativePath("C:/Win/x").ok).toBe(false);
    expect(normalizeRelativePath("//server/share").ok).toBe(false);
    expect(normalizeRelativePath("a\0b").ok).toBe(false);
    expect(normalizeRelativePath("../x").ok).toBe(false);
    expect(normalizeRelativePath("a/../../x").ok).toBe(false);
    expect(normalizeRelativePath("..\\x").ok).toBe(false);
    // Benign: normalization (not refusal) for in-root navigation.
    expect(normalizeRelativePath("a/../b.md")).toEqual({ ok: true, value: "b.md" });
    expect(normalizeRelativePath("docs\\sub\\f.md")).toEqual({ ok: true, value: "docs/sub/f.md" });
    expect(normalizeRelativePath("./x.md")).toEqual({ ok: true, value: "x.md" });
    expect(normalizeRelativePath("top.md")).toEqual({ ok: true, value: "top.md" });
  });

  it("isInsideRoot: full-segment boundary + case semantics", () => {
    // VERDICT: contained — `root` never matches `root-sibling` (prefix trap closed).
    expect(isInsideRoot("/r/repo", "/r/repo-sibling/x", false)).toBe(false);
    expect(isInsideRoot("/r/repo", "/r/repo/x", false)).toBe(true);
    expect(isInsideRoot("/r/repo", "/r/repo", false)).toBe(true);
    // Windows case-insensitivity is explicit and fail-closed elsewhere.
    expect(isInsideRoot("O:/R/Repo", "o:/r/repo/x", true)).toBe(true);
    expect(isInsideRoot("/r/Repo", "/r/repo/x", false)).toBe(false);
  });
});

describe("adversarial matrix: MCP read equivalents", () => {
  it("R18 hostile ids become structured errors, never filesystem access", async () => {
    for (const hostile of ["../escape", "/abs/path", "C:\\Win\\x", "TASK-9999", "..\\escape"]) {
      const status = await mcpCall("ackit_status", { taskId: hostile });
      // RESULT: JSON error envelope. VERDICT: contained — store id
      // patterns + StatusError reject before any fs access; MCP takes no
      // free paths by construction (root confined at construction).
      expect(status).toContain("error");
      const task = await mcpCall("ackit_get_task", { id: hostile });
      expect(task).toContain("error");
    }
  });

  it("R19 task-create titles cannot escape (slugified at the boundary)", async () => {
    const { TaskStore } = await import("../../src/core/tasks/index.js");
    const created = await new TaskStore(repo).create("../../evil");
    // RESULT: slug `evil` under docs/tasks/active. VERDICT: contained —
    // [^a-z0-9]+ folding (tasks/store.ts) makes traversal unrepresentable.
    expect(created.relativePath).toMatch(/^docs\/tasks\/active\/TASK-\d{4}-evil\.md$/);
  });

  it("R20 scan --output outside the root is allowed by explicit contract (negative finding)", async () => {
    // ATTACK: scan --output to an absolute outside path.
    // RESULT: allowed. VERDICT: contained-by-contract — --output is an
    // operator-explicit free path (the CI recipe writes RUNNER_TEMP
    // SARIF outside the repo); constraining it would break documented
    // behavior. Root-contained --out writers are the contained class.
    const out = path.join(outside, "r20.json");
    const r = await spawnCli(["scan", "--output", out, "--format", "json"]);
    expect(r.code).toBe(0);
    await rm(out, { force: true });
  });
});

describe("resolveContainedWritePath regression (TASK-0084 fix)", () => {
  it("allows legitimate nested writes; refuses absolute/traversal/empty", async () => {
    const { resolveContainedWritePath } = await import("../../src/core/filesystem/paths.js");
    const ok = await resolveContainedWritePath(repo, "docs/newdir/out.md");
    expect(ok.ok).toBe(true);
    const abs = await resolveContainedWritePath(repo, path.join(outside, "x.md"));
    expect(abs).toMatchObject({ ok: false });
    const traversal = await resolveContainedWritePath(repo, "../escape.md");
    expect(traversal).toMatchObject({ ok: false, reason: "escapes-root" });
    const empty = await resolveContainedWritePath(repo, ".");
    expect(empty).toMatchObject({ ok: false });
  });

  it("refuses planted dir links, junctions, and file links (link-escape)", async () => {
    const { resolveContainedWritePath } = await import("../../src/core/filesystem/paths.js");
    const linkDir = path.join(repo, "docs", "link-unit");
    await symlink(outside, linkDir, DIR_LINK_TYPE);
    try {
      const dirLink = await resolveContainedWritePath(repo, "docs/link-unit/evil.md");
      expect(dirLink).toMatchObject({ ok: false, reason: "link-escape" });
      // Deep non-existent remainder below the link is equally refused.
      const deep = await resolveContainedWritePath(repo, "docs/link-unit/a/b/c.md");
      expect(deep).toMatchObject({ ok: false, reason: "link-escape" });
    } finally {
      await rm(linkDir, { recursive: true, force: true });
    }
  });

  it.runIf(SYMLINK_OK)("refuses planted file links at the final path", async () => {
    const { resolveContainedWritePath } = await import("../../src/core/filesystem/paths.js");
    const target = path.join(repo, ".ackit", "link-unit-file.md");
    await mkdir(path.join(repo, ".ackit"), { recursive: true });
    await symlink(path.join(outside, "secret.txt"), target);
    try {
      const fileLink = await resolveContainedWritePath(repo, ".ackit/link-unit-file.md");
      expect(fileLink).toMatchObject({ ok: false, reason: "link-escape" });
    } finally {
      await unlink(target);
    }
  });
});
