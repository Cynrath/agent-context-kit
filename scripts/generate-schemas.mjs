#!/usr/bin/env node
// Generates committed JSON Schemas from the zod sources of truth.
// Usage: pnpm gen:schemas  (requires a prior `pnpm build`)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ackitConfigJsonSchema } from "../dist/core/config/json-schema.js";
import { POLICY_SCHEMA_VERSION, PolicyDocumentSchema } from "../dist/core/policy/index.js";
import { TASK_SCHEMA_VERSION, TaskMetaSchema } from "../dist/core/tasks/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemasDir = path.join(repoRoot, "schemas");
mkdirSync(schemasDir, { recursive: true });

const taskSchema = z.toJSONSchema(TaskMetaSchema, { io: "input", unrepresentable: "any" });
taskSchema.$comment = `ACKit task frontmatter schema v${TASK_SCHEMA_VERSION} (REQ-TASKS-002).`;

const policySchema = z.toJSONSchema(PolicyDocumentSchema, { io: "input", unrepresentable: "any" });
policySchema.$comment = `ACKit policy document schema v${POLICY_SCHEMA_VERSION} (REQ-POL-001).`;

writeFileSync(
  path.join(schemasDir, "ackit.schema.json"),
  `${JSON.stringify(ackitConfigJsonSchema(), null, 2)}\n`,
  "utf8",
);
writeFileSync(
  path.join(schemasDir, "task.schema.json"),
  `${JSON.stringify(taskSchema, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  path.join(schemasDir, "policy.schema.json"),
  `${JSON.stringify(policySchema, null, 2)}\n`,
  "utf8",
);
console.log("schemas/ackit+task+policy schemas written");
