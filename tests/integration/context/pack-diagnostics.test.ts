import { promises as fsp } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildCanonicalContextSections,
  CONTEXT_POLICY_SUMMARY_UNAVAILABLE,
} from "../../../src/core/context/orchestrate.js";
import { buildContextPack, PACK_READ_FAILED_REASON } from "../../../src/core/context/pack.js";

let rootPath: string;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-pack-gov007-"));
  await writeFile(path.join(rootPath, "README.md"), "# diagnostics fixture\n");
  await mkdir(path.join(rootPath, "src"), { recursive: true });
  await writeFile(path.join(rootPath, "src", "app.ts"), "export const app = 1;\n");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

/**
 * Test-only observation seam: intercepts the pack's per-candidate content
 * read on the shared node:fs promises object (the exact surface
 * src/core/context/pack.ts uses) and fails the named candidate with the
 * given stable errno category. No production code is modified.
 */
async function withFailedRead<T>(
  doomedAbsolutePath: string,
  errnoCategory: string,
  run: () => Promise<T>,
): Promise<T> {
  const realReadFile = fsp.readFile;
  const spy = vi.spyOn(fsp, "readFile").mockImplementation(async (target, options) => {
    if (typeof target === "string" && path.resolve(target) === path.resolve(doomedAbsolutePath)) {
      const error: NodeJS.ErrnoException = new Error(`simulated ${errnoCategory}`);
      error.code = errnoCategory;
      throw error;
    }
    return realReadFile(target as Parameters<typeof realReadFile>[0], options);
  });
  try {
    return await run();
  } finally {
    spy.mockRestore();
  }
}

describe("REQ-GOV-007: context pack read failures are observable", () => {
  it("records an explicit exclusion with the stable pack-read-failed code and continues packing", async () => {
    const result = await withFailedRead(path.join(rootPath, "README.md"), "EACCES", () =>
      buildContextPack({ canonicalPath: rootPath }, { format: "json" }),
    );

    const entry = result.manifest.find((item) => item.relativePath === "README.md");
    expect(entry).toBeDefined();
    expect(entry?.action).toBe("excluded");
    expect(entry?.reason).toBe(`${PACK_READ_FAILED_REASON} (EACCES)`);
    expect(entry?.sha256).toMatch(/^[0-9a-f]{64}$/);

    // The pack continues: unrelated candidates are still included.
    expect(
      result.manifest.some(
        (item) => item.relativePath === "src/app.ts" && item.action === "included",
      ),
    ).toBe(true);
    expect(result.json).toContain(`${PACK_READ_FAILED_REASON} (EACCES)`);
  });

  it("uses a deterministic disappearing-file category (ENOENT) and never leaks absolute paths", async () => {
    const result = await withFailedRead(path.join(rootPath, "src", "app.ts"), "ENOENT", () =>
      buildContextPack({ canonicalPath: rootPath }, { format: "json" }),
    );

    const entry = result.manifest.find((item) => item.relativePath === "src/app.ts");
    expect(entry?.reason).toBe(`${PACK_READ_FAILED_REASON} (ENOENT)`);
    // Repo-relative paths only; no machine-local absolute path anywhere.
    expect(result.json).not.toContain(rootPath);
    const markdown = await withFailedRead(path.join(rootPath, "src", "app.ts"), "ENOENT", () =>
      buildContextPack({ canonicalPath: rootPath }),
    );
    expect(markdown.markdown).not.toContain(rootPath);
    expect(markdown.markdown).not.toContain("simulated ENOENT");
  });

  it("keeps output byte-identical across identical failure conditions", async () => {
    const first = await withFailedRead(path.join(rootPath, "README.md"), "EPERM", () =>
      buildContextPack({ canonicalPath: rootPath }, { format: "json" }),
    );
    const second = await withFailedRead(path.join(rootPath, "README.md"), "EPERM", () =>
      buildContextPack({ canonicalPath: rootPath }, { format: "json" }),
    );
    expect(second.json).toBe(first.json);
  });
});

describe("REQ-GOV-007: policy-summary failure is explicit and advisory", () => {
  it("surfaces the stable advisory code when policy resolution fails", async () => {
    // A valid config whose extends chain points at a missing policy file:
    // loadAckitConfig succeeds, resolvePolicy throws POL-NOT-FOUND — the
    // exact unexpected-failure path the summary must never swallow.
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      "schemaVersion: 1\npolicy:\n  extends:\n    - ./does-not-exist-policy.yml\n",
      "utf8",
    );
    try {
      const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
      const policySection = sections.find((section) => section.id === "policy-summary");
      expect(policySection).toBeDefined();
      expect(policySection?.body).toContain("policy status: unavailable");
      expect(policySection?.body).toContain(CONTEXT_POLICY_SUMMARY_UNAVAILABLE);

      // The canonical surfaces (CLI pack / MCP ackit_pack) pass these exact
      // sections into the pack, so the advisory code reaches every artifact.
      const pack = await buildContextPack(
        { canonicalPath: rootPath },
        { format: "json", contextSections: sections },
      );
      expect(pack.json).toContain(CONTEXT_POLICY_SUMMARY_UNAVAILABLE);
      expect(pack.json).not.toContain(rootPath);
    } finally {
      await rm(path.join(rootPath, "ackit.yml"), { force: true });
    }
  });

  it("keeps the normal digest line when no policy failure occurs", async () => {
    const sections = await buildCanonicalContextSections({ canonicalPath: rootPath });
    const policySection = sections.find((section) => section.id === "policy-summary");
    expect(policySection?.body.startsWith("policy digest: ")).toBe(true);
    expect(policySection?.body).not.toContain(CONTEXT_POLICY_SUMMARY_UNAVAILABLE);
  });
});
