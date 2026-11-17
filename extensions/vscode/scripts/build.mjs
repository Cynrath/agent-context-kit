import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const extensionRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.resolve(extensionRoot, "../..");
const sdkSource = path.join(repoRoot, "src");
const output = path.join(extensionRoot, "dist");
const pkg = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
await mkdir(output, { recursive: true });

await build({
  absWorkingDir: extensionRoot,
  entryPoints: ["src/extension.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/extension.js",
  external: ["vscode"],
  sourcemap: true,
  banner: {
    js: '"use strict";\nconst __ackitBundleModuleUrl = (relative) => require("node:url").pathToFileURL(require("node:path").join(__dirname, "sdk", relative)).href;',
  },
  plugins: [
    {
      name: "bundled-sdk-resources",
      setup(builder) {
        builder.onResolve({ filter: /^@cynrath\/agent-context-kit$/ }, () => ({
          path: path.join(sdkSource, "index.ts"),
        }));
        builder.onLoad({ filter: /\.ts$/ }, async ({ path: file }) => {
          const relative = path.relative(sdkSource, file);
          if (relative.startsWith("..") || path.isAbsolute(relative)) return;
          const source = await readFile(file, "utf8");
          if (!source.includes("import.meta.url")) return;
          // Preserve canonical module-relative asset lookup inside a CommonJS
          // bundle. Embed only package-relative paths, never build-machine paths.
          const virtualPath = JSON.stringify(relative.split(path.sep).join("/"));
          const moduleUrl = `__ackitBundleModuleUrl(${virtualPath})`;
          return { contents: source.replaceAll("import.meta.url", moduleUrl), loader: "ts" };
        });
      },
    },
  ],
});
// SDK modules resolve package.json/templates from this bundled package root.
await writeFile(
  path.join(output, "package.json"),
  `${JSON.stringify({ name: pkg.name, version: pkg.version }, null, 2)}\n`,
);
await cp(path.join(repoRoot, "templates"), path.join(output, "templates"), { recursive: true });
console.log(`Extension bundle PASS (${pkg.version}; SDK identity and templates included)`);
