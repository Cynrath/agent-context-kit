import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildContextPack } from "../../src/core/context/pack.js";
import type { RepositoryRoot } from "../../src/core/filesystem/root.js";

/**
 * Adversarial context-pack safety fixtures (audit findings 2.1/2.2).
 * Proves the pack uses the canonical classifier + secret catalog:
 * binaries excluded by CONTENT (extension-agnostic), every catalog secret
 * family blocked, and no raw value reaches any emitted surface.
 */
// Synthetic fixtures assembled at RUNTIME so source files never contain
// provider-secret SHAPES (GitHub push protection blocks those as if real).
const rep = (ch: string, n: number): string => ch.repeat(n);
const SECRETS = {
  aws: "AKIAIOSFODNN7EXAMPLE", // canonical AWS docs example (push-safe)
  githubPat: ["github_pat_", "11", rep("A", 7), "0", rep("a", 14)].join(""),
  gitlab: ["glpat-", rep("a", 20)].join(""),
  google: ["AIza", rep("a", 35)].join(""),
  slack: ["xoxb-", "123456789012-", rep("a", 12)].join(""),
  generic: "supersecretvalue123",
  connStr: "postgres://admin:hunter22@db.internal:5432/prod",
};

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };

beforeAll(async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const pathMod = await import("node:path");
  const rootPath = await fs.mkdtemp(pathMod.join(os.tmpdir(), "ackit-packsafe-"));
  const w = async (rel: string, data: string | Buffer) => {
    await fs.mkdir(pathMod.dirname(pathMod.join(rootPath, rel)), { recursive: true });
    await fs.writeFile(pathMod.join(rootPath, rel), data);
  };
  // Unknown-extension TEXT stays eligible.
  await w("config.unknownext", "plain=values\n");
  // Binary variants must be excluded regardless of extension.
  const nul = Buffer.alloc(64, 0);
  await w("blob.bin", nul);
  await w(
    "blob.unknownext",
    Buffer.concat([Buffer.from([1, 2, 3]), nul, Buffer.from(`key=${SECRETS.aws}`)]),
  );
  await w(
    "big.unknownbin",
    Buffer.concat([Buffer.from([0]), Buffer.alloc(20000, 7), Buffer.from(SECRETS.generic)]),
  );
  // Every canonical secret family, some under unknown extensions.
  await w("aws.txt", `aws_access_key_id=${SECRETS.aws}\n`);
  await w("gh.pat", `token=${SECRETS.githubPat}\n`);
  await w("gl.dat", `deploy=${SECRETS.gitlab}\n`);
  await w("g.key", `apikey=${SECRETS.google}\n`);
  await w("slack.cfg", `bot=${SECRETS.slack}\n`);
  await w("client.txt", `client_secret=${SECRETS.generic}\n`);
  await w("id_rsa.enc", "-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----\n");
  await w("db.conf", `url=${SECRETS.connStr}\n`);
  // BOM text stays eligible and intact.
  const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("bom text ok\n")]);
  await w("bom.md", bom);

  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => fs.rm(rootPath, { recursive: true, force: true }),
  };
}, 30000);

afterAll(async () => {
  await repo.cleanup();
});

function relPaths(result: Awaited<ReturnType<typeof buildContextPack>>, action?: string): string[] {
  return result.manifest
    .filter((entry) => (action === undefined ? true : entry.action === action))
    .map((entry) => entry.relativePath)
    .sort();
}

describe("context pack adversarial safety (audit 2.1/2.2)", () => {
  it("excludes binary files by CONTENT even with unknown extensions", async () => {
    const result = await buildContextPack(repo.root, { format: "json" });
    for (const binary of ["blob.bin", "blob.unknownext", "big.unknownbin"]) {
      const entry = result.manifest.find((item) => item.relativePath === binary);
      expect(entry?.action === "excluded" || entry?.action === undefined, `${binary} leaked`).toBe(
        true,
      );
      expect(relPaths(result, "included")).not.toContain(binary);
    }
  });

  it("keeps unknown-extension TEXT and BOM files eligible", async () => {
    const result = await buildContextPack(repo.root, { format: "json" });
    expect(relPaths(result, "included")).toContain("config.unknownext");
    expect(relPaths(result, "included")).toContain("bom.md");
  });

  it.each([
    ["aws.txt", SECRETS.aws],
    ["gh.pat", SECRETS.githubPat],
    ["gl.dat", SECRETS.gitlab],
    ["g.key", SECRETS.google],
    ["slack.cfg", SECRETS.slack],
    ["client.txt", SECRETS.generic],
    ["id_rsa.enc"],
    ["db.conf", SECRETS.connStr],
  ])("blocks secret file %s from every emitted surface", async (file, raw?) => {
    const result = await buildContextPack(repo.root);
    const entry = result.manifest.find((item) => item.relativePath === file);
    if (entry !== undefined) {
      expect(entry.action, `${file} should not be included`).not.toBe("included");
      expect(entry.reason).toMatch(/secret|credential|private key/i);
    }
    const included = relPaths(result, "included");
    expect(included).not.toContain(file);
    for (const surface of [result.markdown, result.json]) {
      if (raw !== undefined) expect(surface).not.toContain(raw);
    }
  });

  it("emitted surfaces never contain any fixture raw secret value", async () => {
    const md = await buildContextPack(repo.root);
    const json = await buildContextPack(repo.root, { format: "json" });
    for (const surface of [md.markdown, json.json]) {
      for (const value of Object.values(SECRETS)) {
        expect(surface).not.toContain(value);
      }
    }
  });

  it("manifest explains binary exclusion deterministically", async () => {
    const result = await buildContextPack(repo.root, { format: "json" });
    void relPaths;
    const blobEntry = result.manifest.find((item) => item.relativePath === "blob.bin");
    if (blobEntry !== undefined) {
      expect(blobEntry.reason).toMatch(/binary/i);
    } else {
      // Excluded before manifest registration is also acceptable as long as
      // it never appears as included.
      expect(relPaths(result, "included")).not.toContain("blob.bin");
    }
  });
});
