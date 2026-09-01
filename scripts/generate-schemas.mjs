#!/usr/bin/env node
// Generates committed JSON Schemas from the zod sources of truth.
// Usage: pnpm gen:schemas  (requires a prior `pnpm build`)
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CHECKPOINT_SCHEMA_ID, CheckpointSchema } from "../dist/core/checkpoint/index.js";
import { ackitConfigJsonSchema } from "../dist/core/config/json-schema.js";
import { EVIDENCE_SCHEMA_ID, EvidenceRegistrySchema } from "../dist/core/evidence/index.js";
import { InstructionNodeSchema } from "../dist/core/instructions/types.js";
import { INTENT_SCHEMA_ID, IntentMetaSchema } from "../dist/core/intent/index.js";
import { POLICY_SCHEMA_VERSION, PolicyDocumentSchema } from "../dist/core/policy/index.js";
import { ROLE_SCHEMA_ID, RoleContractSchema } from "../dist/core/roles/index.js";
import { TASK_SCHEMA_VERSION, TaskMetaSchema } from "../dist/core/tasks/index.js";
import { VERDICT_SCHEMA_ID, VerdictSchema } from "../dist/core/verification/index.js";
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

// checkpoint (ackit.checkpoint.v1, ADR-0027)
const checkpointSchema = z.toJSONSchema(CheckpointSchema, {
  io: "input",
  unrepresentable: "any",
});
checkpointSchema.$comment = `ACKit checkpoint schema (${CHECKPOINT_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "checkpoint.schema.json"),
  `${JSON.stringify(checkpointSchema, null, 2)}\n`,
  "utf8",
);

// evidence registry (ackit.evidence.v2, ADR-0026)
const evidenceSchema = z.toJSONSchema(EvidenceRegistrySchema, {
  io: "input",
  unrepresentable: "any",
});
evidenceSchema.$comment = `ACKit evidence registry schema (${EVIDENCE_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "evidence.schema.json"),
  `${JSON.stringify(evidenceSchema, null, 2)}\n`,
  "utf8",
);

// verdict (ackit.verdict.v1, ADR-0026)
const verdictSchema = z.toJSONSchema(VerdictSchema, { io: "input", unrepresentable: "any" });
verdictSchema.$comment = `ACKit verdict schema (${VERDICT_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "verdict.schema.json"),
  `${JSON.stringify(verdictSchema, null, 2)}\n`,
  "utf8",
);

// role contract (ackit.role.v1, ADR-0028)
const roleSchema = z.toJSONSchema(RoleContractSchema, { io: "input", unrepresentable: "any" });
roleSchema.$comment = `ACKit role contract schema (${ROLE_SCHEMA_ID}).`;
writeFileSync(
  path.join(schemasDir, "role.schema.json"),
  `${JSON.stringify(roleSchema, null, 2)}\n`,
  "utf8",
);

// verification bundle header contract (ackit.verification-bundle.v1, ADR-0026)
const bundleSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://cynrath.github.io/agent-context-kit/schemas/verification-bundle.schema.json",
  title: "Verification Bundle Header",
  description:
    "Bounded verification bundle header (ackit.verification-bundle.v1) consumed by a fresh-context verifier.",
  type: "object",
  properties: {
    schemaVersion: { const: "ackit.verification-bundle.v1", type: "string" },
    tool: { const: "ackit", type: "string" },
    task: { type: "string", pattern: "^TASK-\\d{4}$" },
  },
  required: ["schemaVersion", "tool", "task"],
  additionalProperties: true,
};
writeFileSync(
  path.join(schemasDir, "verification-bundle.schema.json"),
  `${JSON.stringify(bundleSchema, null, 2)}\n`,
  "utf8",
);
console.log("schemas/ackit+task+policy+instruction-graph schemas written");
