#!/usr/bin/env node
// Generates committed JSON Schemas from the zod source of truth.
// Usage: pnpm gen:schemas  (requires a prior `pnpm build`)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ackitConfigJsonSchema } from "../dist/core/config/json-schema.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemasDir = path.join(repoRoot, "schemas");
mkdirSync(schemasDir, { recursive: true });
writeFileSync(
  path.join(schemasDir, "ackit.schema.json"),
  `${JSON.stringify(ackitConfigJsonSchema(), null, 2)}\n`,
  "utf8",
);
console.log("schemas/ackit.schema.json written");
