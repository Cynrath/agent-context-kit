#!/usr/bin/env node
// Inspect the actual VSIX portably, with bounded ZIP extraction and CRC checks.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));
const file = process.argv[2];
if (!file) throw new Error("Usage: node scripts/check-vsix.mjs <package.vsix>");
const zip = readFileSync(file);
if (zip.length > 2_097_152) throw new Error("VSIX exceeds 2 MB");
const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
if (eocd < 0 || eocd < zip.length - 65_557 || eocd + 22 > zip.length)
  throw new Error("Invalid ZIP directory");
if (zip.readUInt16LE(eocd + 4) || zip.readUInt16LE(eocd + 6)) throw new Error("Split ZIP refused");
const count = zip.readUInt16LE(eocd + 10);
if (count > 3000) throw new Error("Too many VSIX entries");
let offset = zip.readUInt32LE(eocd + 16);
let total = 0;
const entries = new Map();
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

for (let index = 0; index < count; index++) {
  if (offset + 46 > eocd || zip.readUInt32LE(offset) !== 0x02014b50)
    throw new Error("Invalid ZIP entry");
  const flags = zip.readUInt16LE(offset + 8);
  const method = zip.readUInt16LE(offset + 10);
  const compressed = zip.readUInt32LE(offset + 20);
  const size = zip.readUInt32LE(offset + 24);
  const nameLength = zip.readUInt16LE(offset + 28);
  const extraLength = zip.readUInt16LE(offset + 30);
  const commentLength = zip.readUInt16LE(offset + 32);
  const local = zip.readUInt32LE(offset + 42);
  const end = offset + 46 + nameLength + extraLength + commentLength;
  if (end > eocd) throw new Error("Truncated ZIP entry");
  const name = zip
    .subarray(offset + 46, offset + 46 + nameLength)
    .toString("utf8")
    .toLowerCase();
  if (
    !name ||
    name.includes("\\") ||
    name.startsWith("/") ||
    name.split("/").some((part) => part === "." || part === "..") ||
    entries.has(name)
  )
    throw new Error("Unsafe/duplicate VSIX path");
  total += size;
  if (flags & 1 || ![0, 8].includes(method) || size > 4_194_304 || total > 16_777_216)
    throw new Error("Unsupported/oversized ZIP entry");
  if (local + 30 > offset || zip.readUInt32LE(local) !== 0x04034b50)
    throw new Error("Invalid ZIP local header");
  const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
  if (start + compressed > offset) throw new Error("Invalid ZIP payload bounds");
  const payload = zip.subarray(start, start + compressed);
  const bytes =
    method === 8 ? inflateRawSync(payload, { maxOutputLength: Math.max(1, size) }) : payload;
  if (bytes.length !== size || crc32(bytes) !== zip.readUInt32LE(offset + 16))
    throw new Error("VSIX CRC/size mismatch");
  if (/(^|\/)(node_modules|src|out|scripts|test-fixture)(\/|$)|\.(map|vsix)$/.test(name))
    throw new Error(`Unexpected packaged file: ${name}`);
  entries.set(name, bytes);
  offset = end;
}

function content(name) {
  const bytes = entries.get(name);
  if (!bytes) throw new Error(`Required VSIX file missing: ${name}`);
  return bytes.toString("utf8");
}
const source = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const extension = JSON.parse(
  readFileSync(path.join(root, "extensions/vscode/package.json"), "utf8"),
);
const manifest = JSON.parse(content("extension/package.json"));
const sdk = JSON.parse(content("extension/dist/package.json"));
if (
  extension.version !== source.version ||
  manifest.version !== source.version ||
  sdk.version !== source.version
)
  throw new Error("VSIX/source/SDK version mismatch");
if (
  manifest.publisher !== "Cynrath" ||
  manifest.name !== "ackit-vscode" ||
  manifest.main !== "./dist/extension.js" ||
  sdk.name !== source.name ||
  sdk.type
)
  throw new Error("VSIX identity/runtime mismatch");
const xml = content("extension.vsixmanifest");
const identity = /<Identity\b([^>]+)>/.exec(xml)?.[1] ?? "";
for (const [attribute, value] of Object.entries({
  Version: source.version,
  Publisher: "Cynrath",
  Id: "ackit-vscode",
})) {
  if (new RegExp(`${attribute}="([^"]+)"`).exec(identity)?.[1] !== value)
    throw new Error(`VSIX XML ${attribute} mismatch`);
}
const readme = content("extension/readme.md");
if (
  /\*\*Version:\*\* `([^`]+)`/.exec(readme)?.[1] !== source.version ||
  /source checkouts build `([^`]+)`/.exec(readme)?.[1] !== source.version
)
  throw new Error("VSIX README version mismatch");
for (const marker of ["ackit.status.v1", "verification freshness", "checkpoint freshness"])
  if (!readme.toLowerCase().includes(marker)) throw new Error(`VSIX README missing ${marker}`);
if (/^## \[([^\]]+)\]/m.exec(content("extension/changelog.md"))?.[1] !== source.version)
  throw new Error("VSIX CHANGELOG version mismatch");
content("extension/dist/extension.js");
for (const profile of ["codex", "claude", "copilot", "gemini", "generic"])
  content(`extension/dist/templates/profiles/${profile}.yml`);
content("extension/dist/templates/roles/verifier.yaml");
const icon = entries.get("extension/images/icon.png");
if (
  !icon ||
  icon.length <= 1024 ||
  icon.readUInt32BE(16) < 128 ||
  icon.readUInt32BE(16) !== icon.readUInt32BE(20)
)
  throw new Error("Invalid VSIX icon");
// A detector's header regex is not a key: require encoded material and footer.
const secrets =
  /AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{32,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{32,}|sk-proj-[A-Za-z0-9_-]{20,}/;
for (const [name, bytes] of entries) {
  if (/\.(js|json|md|yml|yaml|xml)$/.test(name) && secrets.test(bytes.toString("utf8")))
    throw new Error(`Credential pattern in ${name}`);
}
console.log(
  `VSIX integrity PASS (${source.version}; ${entries.size} entries; ${zip.length} bytes; SHA-256 ${createHash("sha256").update(zip).digest("hex")})`,
);
