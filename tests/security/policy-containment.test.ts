import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../src/core/filesystem/root.js";
import { resolvePolicy } from "../../src/core/policy/index.js";

const DIR_LINK_TYPE = process.platform === "win32" ? ("junction" as const) : ("dir" as const);

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };
let outside: { path: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "ackit-pol-sec-"));
  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
  const outsideDir = await mkdtemp(path.join(os.tmpdir(), "ackit-pol-out-"));
  outside = { path: outsideDir, cleanup: () => rm(outsideDir, { recursive: true, force: true }) };
  await writeFile(path.join(outside.path, "evil.yml"), "schemaVersion: 1\n", "utf8");
});

afterAll(async () => {
  await repo.cleanup();
  await outside.cleanup();
});

async function write(rel: string, content: string): Promise<void> {
  const abs = path.join(repo.root.canonicalPath, ...rel.split("/"));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, "utf8");
}

async function expectEscape(entry: string): Promise<void> {
  await expect(resolvePolicy(repo.root, { entryFiles: ["entry.yml"] })).rejects.toMatchObject({
    code: "POL-ROOT-ESCAPE",
  });
  void entry;
}

describe("policy extends root containment (audit 2.5)", () => {
  it.each([
    ["single ../", "extends:\n  - ../outside.yml"],
    ["multi-level ../../", "extends:\n  - ../../outside/deep/evil.yml"],
  ])("rejects %s escape with POL-ROOT-ESCAPE", async (_label, extendsBlock) => {
    await write("entry.yml", `schemaVersion: 1\n${extendsBlock}\n`);
    // Ensure the target actually exists inside a plausible in-root spot OR the
    // escape check must fire even when the file exists outside; create it via
    // direct fs write to the resolved outside location.
    const abs = path.resolve(path.join(repo.root.canonicalPath, "entry.yml"), "../outside.yml");
    if (!abs.startsWith(repo.root.canonicalPath)) {
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, "schemaVersion: 1\n", "utf8");
    }
    await expectEscape(extendsBlock);
  });

  it("rejects absolute-path extends", async () => {
    const evilAbs = path.join(outside.path, "evil-abs.yml");
    await writeFile(evilAbs, "schemaVersion: 1\n", "utf8");
    await write("entry-abs.yml", `schemaVersion: 1\nextends:\n  - ${JSON.stringify(evilAbs)}\n`);
    await expect(resolvePolicy(repo.root, { entryFiles: ["entry-abs.yml"] })).rejects.toMatchObject(
      { code: "POL-ROOT-ESCAPE" },
    );
  });

  it("rejects symlink/junction dir whose target leaves the root", async () => {
    const linkDir = path.join(repo.root.canonicalPath, "pol-link");
    try {
      await symlink(outside.path, linkDir, DIR_LINK_TYPE);
      await write("entry-link.yml", "schemaVersion: 1\nextends:\n  - pol-link/evil.yml\n");
      await expect(
        resolvePolicy(repo.root, { entryFiles: ["entry-link.yml"] }),
      ).rejects.toMatchObject({ code: "POL-ROOT-ESCAPE" });
    } finally {
      await rm(linkDir, { force: true }).catch(() => undefined);
    }
  });

  it("still allows in-root nested valid extends chains", async () => {
    await write("base-ok.yml", "schemaVersion: 1\nthresholds:\n  severity: low\n");
    await write("nested/ok.yml", "schemaVersion: 1\nextends:\n  - ../base-ok.yml\n");
    const resolved = await resolvePolicy(repo.root, { entryFiles: ["nested/ok.yml"] });
    expect(resolved.chain).toEqual(["base-ok.yml", "nested/ok.yml"]);
  });

  it("allows pre-installed npm policy pack while blocking uninstalled ones", async () => {
    const pkgDir = path.join(repo.root.canonicalPath, "node_modules", "team-policy");
    await mkdir(pkgDir, { recursive: true });
    await writeFile(path.join(pkgDir, "package.json"), JSON.stringify({ name: "team-policy" }));
    await writeFile(`${pkgDir + path.sep}p.yml`, "schemaVersion: 1\n");
    await write("npm-entry.yml", "schemaVersion: 1\nextends:\n  - npm:team-policy/p.yml\n");
    const ok = await resolvePolicy(repo.root, { entryFiles: ["npm-entry.yml"] });
    expect(ok.policy.thresholds.severity).toBeUndefined();
    await write(
      "npm-missing.yml",
      "schemaVersion: 1\nextends:\n  - npm:not-installed-pack/x.yml\n",
    );
    await expect(
      resolvePolicy(repo.root, { entryFiles: ["npm-missing.yml"] }),
    ).rejects.toMatchObject({ code: "POL-OFFLINE-BLOCKED" });
  });

  it("rejects config-level entryFiles pointing outside root (audit item 1)", async () => {
    const evilAbs = path.join(outside.path, "evil-entry.yml");
    await writeFile(evilAbs, "schemaVersion: 1\n", "utf8");
    await write("evil-entry.yml", `schemaVersion: 1\nthresholds:\n  severity: critical\n`);
    // resolvePolicy with entryFiles pointing at an absolute path outside root
    await expect(resolvePolicy(repo.root, { entryFiles: [evilAbs] })).rejects.toMatchObject({
      code: "POL-ROOT-ESCAPE",
    });
  });
  it("detects file-level cycles deterministically", async () => {
    await write("cyc-a2.yml", "schemaVersion: 1\nextends:\n  - cyc-b2.yml\n");
    await write("cyc-b2.yml", "schemaVersion: 1\nextends:\n  - cyc-a2.yml\n");
    await expect(resolvePolicy(repo.root, { entryFiles: ["cyc-a2.yml"] })).rejects.toMatchObject({
      code: "POL-CYCLE",
    });
  });
});
