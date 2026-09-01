#!/usr/bin/env node
// Generates committed JSON Schemas from the zod sources of truth.
// Usage: pnpm gen:schemas  (requires a prior `pnpm build`)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ackitConfigJsonSchema } from "../dist/core/config/json-schema.js";
import { InstructionNodeSchema } from "../dist/core/instructions/types.js";
import { INTENT_SCHEMA_ID, IntentMetaSchema } from "../dist/core/intent/index.js";
import { POLICY_SCHEMA_VERSION, PolicyDocumentSchema } from "../dist/core/policy/index.js";
import { TASK_SCHEMA_VERSION, TaskMetaSchema } from "../dist/core/tasks/index.js";
import { WORKFLOW_SCHEMA_ID, WorkflowStateSchema } from "../dist/core/workflow/index.js";

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

// workflow state (ackit.workflow.v1, ADR-0025)
const workflowSchema = z.toJSONSchema(WorkflowStateSchema, {
  io: "input",
  unrepresentable: "any",
});
workflowSchema.$comment = `ACKit workflow state schema (${WORKFLOW_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "workflow.schema.json"),
  `${JSON.stringify(workflowSchema, null, 2)}\n`,
  "utf8",
);

// intent (ackit.intent.v1, ADR-0025)
const intentSchema = z.toJSONSchema(IntentMetaSchema, { io: "input", unrepresentable: "any" });
intentSchema.$comment = `ACKit intent document schema (${INTENT_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "intent.schema.json"),
  `${JSON.stringify(intentSchema, null, 2)}\n`,
  "utf8",
);

// instruction graph v2
const instructionNodeJsonSchema = z.toJSONSchema(InstructionNodeSchema, {
  io: "input",
  unrepresentable: "any",
});
const instructionGraphSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://cynrath.github.io/agent-context-kit/schemas/instruction-graph.schema.json",
  title: "Instruction Graph v2",
  description:
    "Instruction graph v2 (REQ-V020-D-001) — deterministic ordering, provenance, shadow/duplicate scope.",
  type: "object",
  properties: {
    schemaVersion: { const: 2, type: "number", description: "Graph schema version" },
    nodes: { type: "array", items: instructionNodeJsonSchema },
    diagnostics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          relativePath: { type: "string" },
        },
        required: ["code", "message"],
      },
    },
  },
  required: ["schemaVersion", "nodes", "diagnostics"],
  additionalProperties: false,
};
writeFileSync(
  path.join(schemasDir, "instruction-graph.schema.json"),
  `${JSON.stringify(instructionGraphSchema, null, 2)}\n`,
  "utf8",
);
console.log("schemas/ackit+task+policy+instruction-graph schemas written");
