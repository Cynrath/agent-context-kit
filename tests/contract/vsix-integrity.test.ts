import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = JSON.parse(readFileSync("package.json", "utf8")) as {
  name: string;
  version: string;
};
const extension = readFileSync("extensions/vscode/package.json");
const table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (table[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
// A tiny stored-entry ZIP fixture writer, independent of the inspected reader.
function archive(entries: Record<string, Buffer | string>): Buffer {
  const payloads: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const filename = Buffer.from(name);
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(bytes), 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(bytes), 16);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    payloads.push(local, filename, bytes);
    directory.push(central, filename);
    offset += local.length + filename.length + bytes.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(directory.length / 2, 8);
  end.writeUInt16LE(directory.length / 2, 10);
  end.writeUInt32LE(Buffer.concat(directory).length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...payloads, ...directory, end]);
}
function fixture(): Record<string, Buffer | string> {
  const entries: Record<string, Buffer | string> = {
    "extension/package.json": extension,
    "extension/dist/package.json": JSON.stringify({ name: source.name, version: source.version }),
    "extension/dist/extension.js": "// bundled fixture\n",
    "extension.vsixmanifest": `<Identity Version="${source.version}" Publisher="Cynrath" Id="ackit-vscode"/>`,
    "extension/readme.md": readFileSync("extensions/vscode/README.md"),
    "extension/changelog.md": readFileSync("extensions/vscode/CHANGELOG.md"),
    "extension/images/icon.png": readFileSync("extensions/vscode/images/icon.png"),
    "extension/dist/templates/roles/verifier.yaml": readFileSync("templates/roles/verifier.yaml"),
  };
  for (const name of ["codex", "claude", "copilot", "gemini", "generic"]) {
    entries[`extension/dist/templates/profiles/${name}.yml`] = readFileSync(
      `templates/profiles/${name}.yml`,
    );
  }
  return entries;
}
async function check(bytes: Buffer): Promise<{ code: number | null; output: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-vsix-contract-"));
  try {
    const file = path.join(dir, "fixture.vsix");
    await writeFile(file, bytes);
    const result = spawnSync(process.execPath, ["scripts/check-vsix.mjs", file], {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
    return { code: result.status, output: result.stdout + result.stderr };
  } finally {
    expect(path.dirname(dir)).toBe(path.resolve(tmpdir()));
    await rm(dir, { recursive: true, force: true });
  }
}

describe("packaged VSIX fail-closed integrity gate", () => {
  it("accepts version-coupled content and detector text without key material", async () => {
    const entries = fixture();
    entries["extension/dist/extension.js"] = `/${["-----BEGIN", "PRIVATE KEY-----"].join(" ")}/g;`;
    expect((await check(archive(entries))).code).toBe(0);
  });
  it("rejects version drift and missing bundled resources", async () => {
    const drift = fixture();
    drift["extension/dist/package.json"] = JSON.stringify({ ...source, version: "0.0.0" });
    expect((await check(archive(drift))).output).toContain("version mismatch");
    const missing = fixture();
    delete missing["extension/dist/templates/profiles/codex.yml"];
    expect((await check(archive(missing))).output).toContain("profiles/codex.yml");
  });
  it.each([
    "extension/node_modules/a.js",
    "extension/dist/extension.js.map",
    "extension/src/a.ts",
    "../outside.txt",
  ])("rejects unexpected path %s", async (file) => {
    expect((await check(archive({ ...fixture(), [file]: "unexpected" }))).code).not.toBe(0);
  });
  it("rejects actual credential-shaped material and corrupted payloads", async () => {
    const entries = fixture();
    entries["extension/dist/extension.js"] = [
      ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
      "A".repeat(64),
      ["-----END", "PRIVATE KEY-----"].join(" "),
    ].join("\n");
    expect((await check(archive(entries))).output).toContain("Credential pattern");
    entries["extension/dist/extension.js"] = ["gh", "p_"].join("") + "a".repeat(36);
    expect((await check(archive(entries))).output).toContain("Credential pattern");
    const corrupt = archive(fixture());
    const index = corrupt.indexOf(extension);
    expect(index).toBeGreaterThan(0);
    corrupt[index] = (corrupt[index] ?? 0) ^ 1;
    expect((await check(corrupt)).output).toContain("CRC/size mismatch");
  });
});
