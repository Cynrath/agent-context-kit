#!/usr/bin/env node
// Deterministic benchmark fixture generator (REQ-PERF-001).
// Usage: node benchmarks/generate-fixtures.mjs [outDir]
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

const outBase =
  process.argv[2] ?? path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), ".fixtures");

/** mulberry32 — tiny deterministic PRNG so fixtures are reproducible. */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLASSES = {
  small: { dirs: 2, filesPerDir: 5, size: 512 },
  medium: { dirs: 10, filesPerDir: 20, size: 1024 },
  large: { dirs: 20, filesPerDir: 100, size: 2048 },
  monorepo: { packages: 4, filesPerPkg: 25, size: 1024 },
  "instruction-heavy": { agentsFiles: 40, nested: 20 },
  "skill-heavy": { skills: 30 },
  "binary-heavy": { dirs: 6, filesPerDir: 50, binaries: 300, size: 4096 },
};

function writeText(file, rand, size) {
  const words = "alpha beta gamma delta epsilon zeta eta theta iota kappa".split(" ");
  let body = "";
  while (body.length < size) body += words[Math.floor(rand() * words.length)] + " ";
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, body.slice(0, size), "utf8");
}

export function generateFixture(className, targetDir) {
  if (existsSync(targetDir)) rmSync(targetDir, { recursive: true, force: true });
  const spec = CLASSES[className];
  const root = path.join(targetDir, className);
  mkdirSync(root, { recursive: true });
  const rand = prng(hash(className));

  if (className === "monorepo") {
    writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
    for (let p = 0; p < spec.packages; p += 1) {
      const pkgDir = path.join(root, "packages", `pkg${p}`);
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: `pkg${p}`, version: "1.0.0" }));
      for (let f = 0; f < spec.filesPerPkg; f += 1) {
        writeText(path.join(pkgDir, "src", `mod${f}.ts`), rand, spec.size);
      }
    }
    return root;
  }
  if (className === "instruction-heavy") {
    writeFileSync(path.join(root, "AGENTS.md"), "# Root\nAlways use pnpm as the package manager.\n");
    for (let i = 0; i < spec.agentsFiles; i += 1) {
      const dir = i % 2 === 0 ? `team${i}` : `team${i}/nested`;
      mkdirSync(path.join(root, dir), { recursive: true });
      writeFileSync(
        path.join(root, dir, "AGENTS.md"),
        `# Team ${i}\nUse pnpm as the package manager.\n[ref](../../shared.md)\n`,
      );
      void spec.nested;
    }
    writeFileSync(path.join(root, "shared.md"), "Shared guidance.\n");
    return root;
  }
  if (className === "skill-heavy") {
    for (let s = 0; s < spec.skills; s += 1) {
      const dir = path.join(root, ".agents", "skills", `skill-${String(s).padStart(3, "0")}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "SKILL.md"),
        `---\nname: skill-${String(s).padStart(3, "0")}\ndescription: Deterministic skill ${s}.\n---\nBody ${s} [r](references/r.md)\n`,
      );
      mkdirSync(path.join(dir, "references"), { recursive: true });
      writeFileSync(path.join(dir, "references", "r.md"), `Reference body ${s}.\n`);
    }
    return root;
  }

  // Generic text-tree classes (+ binary-heavy variant).
  for (let d = 0; d < spec.dirs; d += 1) {
    for (let f = 0; f < spec.filesPerDir; f += 1) {
      const file = path.join(root, `dir${String(d).padStart(2, "0")}`, `file${String(f).padStart(3, "0")}.${className === "binary-heavy" ? "bin" : "txt"}`);
      if (className === "binary-heavy") {
        const buf = Buffer.alloc(spec.size);
        for (let b = 0; b < buf.length; b += 1) buf[b] = Math.floor(rand() * 256);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, buf);
      } else {
        writeText(file, rand, spec.size);
      }
    }
  }
  return root;
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function classNames() {
  return Object.keys(CLASSES);
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (isMain) {
  const generated = [];
  for (const name of classNames()) {
    generated.push(generateFixture(name, outBase));
  }
  console.log(`generated ${generated.length} fixture classes under ${outBase}`);
}
