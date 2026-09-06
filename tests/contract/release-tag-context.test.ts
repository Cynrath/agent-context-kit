/**
 * Release/tagged-checkout execution regression (TASK-0088).
 *
 * The v0.5.0 tag-trigger release workflow (run 34036439113) failed at
 * `pnpm test` with:
 *
 *   AssertionError: expected 'v0.5.0' to be '' // Object.is equality
 *   ❯ tests/e2e/chain-composition.test.ts:311
 *
 * Root cause: the chain-composition proof asserted
 * `git tag --list v0.5*` is empty — impossible on the exact tagged
 * checkout the release workflow validates (the triggering tag exists by
 * construction). No npm publish, GitHub Release, or Marketplace publish
 * occurred; the tag was left as an immutable failed-release marker.
 *
 * Invariant: release/tagged-checkout execution must never fail merely
 * because the triggering release tag exists. This file proves it two
 * ways:
 *
 * 1. Static guard: the composition proof asserts nothing about
 *    repository tags (a reintroduced tag-absence assertion fails here
 *    first, with a pointer to this note).
 * 2. Functional proof: a fixture repository carrying a release-shaped
 *    tag (`v9.9.9`, stable-shaped like a triggering tag) still runs the
 *    composed core — status projection parity (CLI ≡ SDK), handoff
 *    export/import round-trip, and task completion — green.
 *
 * Release lifecycle assertions (source version, stable pointer, tag
 * shape) belong in the version contract tests
 * (`version-parity.test.ts`, `version-single-source.test.ts`,
 * `release-notes.test.ts`, `ci-pinning.test.ts`) — never in composition
 * proofs. No tag/publish/release side effects: the `v9.9.9` tag lives
 * only inside the temp fixture repository, never in this checkout.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { buildStatusReport } from "../../src/index.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

/** Release-shaped tag carried by the fixture (stable `vX.Y.Z` shape). */
const FIXTURE_TAG = "v9.9.9";

let rootPath = "";
let repoRoot = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-release-tag-"));
  repoRoot = path.resolve(import.meta.dirname, "..", "..");
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# release-tag fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  // Mimic the release workflow's tagged checkout: the triggering release
  // tag exists on the checkout under execution.
  execFileSync("git", ["-C", rootPath, "tag", "-a", FIXTURE_TAG, "-m", "fixture release tag"], {
    stdio: "ignore",
  });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(args: string[]): Promise<CliResult> {
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

function fixtureTags(): string {
  return execFileSync("git", ["-C", rootPath, "tag", "--list", "v*"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("release/tagged-checkout execution (TASK-0088)", () => {
  it("composition proof asserts nothing about repository tags", async () => {
    const source = await readFile(
      path.join(repoRoot, "tests", "e2e", "chain-composition.test.ts"),
      "utf8",
    );
    expect(
      source.includes("tag --list"),
      "chain-composition must not shell out to 'git tag --list' (TASK-0088: tagged checkouts carry the triggering tag)",
    ).toBe(false);
    expect(
      /expect\(tags/.test(source),
      "chain-composition must not assert on a 'tags' variable (TASK-0088)",
    ).toBe(false);
    expect(
      source.includes("no v0.5"),
      "chain-composition must not assert tag absence (TASK-0088)",
    ).toBe(false);
  });

  it("composed execution passes with a release-shaped tag present", async () => {
    // Precondition: the triggering-shaped tag really exists (else this
    // test would prove nothing about tagged checkouts).
    expect(
      fixtureTags()
        .split("\n")
        .map((tag) => tag.trim()),
    ).toContain(FIXTURE_TAG);

    const { TaskStore, serialize } = await import("../../src/core/tasks/index.js");
    const created = await cli(["task", "create", "Release-tag fixture"]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    expect(taskId).not.toBe("");
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    await writeFile(
      path.join(rootPath, ...found.doc.relativePath.split("/")),
      serialize(
        found.doc.meta,
        [
          "## Acceptance criteria",
          "",
          "- [x] Tagged-checkout thing done.",
          "",
          "## Completion notes",
          "",
          "Tagged-checkout thing implemented; evidence recorded below.",
        ].join("\n"),
      ),
      "utf8",
    );
    expect((await cli(["workflow", "set", taskId, "--profile", "quick"])).code).toBe(EXIT_CODES.ok);
    expect((await cli(["task", "start", taskId])).code).toBe(EXIT_CODES.ok);
    expect((await cli(["workflow", "advance", taskId])).code).toBe(EXIT_CODES.ok);
    expect((await cli(["workflow", "advance", taskId])).code).toBe(EXIT_CODES.ok);

    // Status projection parity (CLI ≡ SDK) holds with the tag present.
    const cliJson = (await cli(["--json", "status", taskId])).stdout;
    const sdkJson = JSON.stringify(await buildStatusReport(rootPath, taskId));
    expect(JSON.parse(cliJson)).toEqual(JSON.parse(sdkJson));

    // Handoff export/import round-trips with the tag present.
    expect(
      (
        await cli([
          "checkpoint",
          "create",
          taskId,
          "--next-objective",
          "tagged-checkout handoff objective",
          "--next-command",
          `ackit task complete ${taskId}`,
        ])
      ).code,
    ).toBe(EXIT_CODES.ok);
    expect(
      (
        await cli([
          "checkpoint",
          "export",
          taskId,
          "--format",
          "json",
          "--out",
          ".ackit/tagged/handoff.json",
        ])
      ).code,
    ).toBe(EXIT_CODES.ok);
    const imported = await cli(["checkpoint", "import", ".ackit/tagged/handoff.json"]);
    expect(imported.code).toBe(EXIT_CODES.ok);

    // Completion succeeds with the tag present — the exact step the
    // v0.5.0 release gate never reached because the tag assertion fired.
    const completed = await cli(["task", "complete", taskId]);
    expect(completed.code).toBe(EXIT_CODES.ok);

    // The tag is still there: execution passed *with* it, not by removing it.
    expect(
      fixtureTags()
        .split("\n")
        .map((tag) => tag.trim()),
    ).toContain(FIXTURE_TAG);
  }, 120_000);
});
