import path from "node:path";
import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadAckitConfig } from "../core/config/index.js";
import { buildCanonicalContextSections, buildContextPack } from "../core/context/index.js";
import { resolveRepositoryRoot } from "../core/filesystem/root.js";
import { buildInstructionGraph } from "../core/instructions/index.js";
import { policyDigest, resolvePolicy } from "../core/policy/index.js";
import { renderScanJson } from "../core/reporting/json.js";
import {
  type ExecutedScan,
  executeConfiguredScan,
  GitUnavailableError,
  ScanContractError,
} from "../core/scanner/orchestrate.js";
import { validateSkills } from "../core/skills/validate.js";
import { TaskStore } from "../core/tasks/store.js";
import { getPackageIdentity } from "../shared/version.js";

export interface AckitMcpContext {
  /** Canonical repository root — the ONLY root this server operates on. */
  repositoryRoot: string;
}

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

/**
 * Builds the ACKit MCP server on the OFFICIAL TypeScript SDK (ADR-0008,
 * REQ-MCP-001). Root is resolved ONCE at construction and every tool
 * operates exclusively within that canonical boundary (audit 6D). Read-only
 * tools only (REQ-MCP-002).
 */
export async function createAckitMcpServer(requestedRoot?: string | undefined): Promise<{
  server: McpServer;
  context: AckitMcpContext;
}> {
  const identity = getPackageIdentity();
  const rootPath = path.resolve(requestedRoot ?? process.env["ACKIT_ROOT"] ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootPath);
  if (!rootResolution.ok) {
    throw new Error(`MCP server root resolution failed: ${rootResolution.diagnostic.message}`);
  }
  const repositoryRoot = rootResolution.root.canonicalPath;
  const context: AckitMcpContext = { repositoryRoot };

  const server = new McpServer(
    { name: "ackit", version: identity.version },
    {
      capabilities: {
        resources: {},
        prompts: {},
        tools: {},
      },
    },
  );

  // ---- Tools -------------------------------------------------------------
  // Audit 6A/6B/6C/6D: no `root` parameter (root confined at construction);
  // `changed` wired to git; scan via canonical orchestrator; cancellation via
  // extra.signal propagated into pipeline.
  server.tool(
    "ackit_scan",
    "Run the ACKit scan pipeline and return the canonical JSON report",
    {
      changed: z.boolean().default(false).optional(),
      ci: z.boolean().default(false).optional(),
    },
    async (args, extra) => {
      try {
        const executed: ExecutedScan = await executeConfiguredScan(repositoryRoot, {
          changed: args.changed,
          signal: extra.signal,
        });
        const reportJson = renderScanJson(executed.result);
        return textResult(`${reportJson}\nexit_code_hint=${executed.exceededThreshold ? 1 : 0}`);
      } catch (error) {
        if (error instanceof ScanContractError || error instanceof GitUnavailableError) {
          return textResult(
            JSON.stringify({ error: error.code ?? "scan-error", message: error.message }),
          );
        }
        throw error;
      }
    },
  );

  server.tool(
    "ackit_doctor",
    "Quick repository health summary (config + tasks integrity)",
    {},
    async () => {
      const configResult = await loadAckitConfig(repositoryRoot);
      const store = new TaskStore(repositoryRoot);
      let taskDoctor: { ok: boolean; problems: string[] };
      try {
        taskDoctor = await store.doctor();
      } catch (error) {
        taskDoctor = { ok: false, problems: [(error as Error).message] };
      }
      return textResult(
        JSON.stringify({
          schemaVersion: "ackit.doctor.v0",
          configOk: configResult.ok,
          configErrors: configResult.ok ? [] : configResult.errors,
          taskDoctor,
        }),
      );
    },
  );

  server.tool(
    "ackit_pack",
    "Build a budgeted deterministic context pack with safety gates",
    {
      maxTokens: z.number().int().positive().optional(),
      format: z.enum(["markdown", "json"]).default("markdown").optional(),
    },
    async (args, extra) => {
      const configResult = await loadAckitConfig(repositoryRoot);
      const maxTokens =
        args.maxTokens ?? (configResult.ok ? configResult.config.context.maxTokens : 100_000);

      // Canonical orchestration shared with the CLI `ackit pack` command.
      const sections = await buildCanonicalContextSections(
        { canonicalPath: repositoryRoot },
        { signal: extra.signal },
      );

      const pack = await buildContextPack(
        { canonicalPath: repositoryRoot },
        {
          format: args.format ?? "markdown",
          maxTokens,
          contextSections: sections,
          signal: extra.signal,
        },
      );
      return textResult(pack.format === "json" ? pack.json : pack.markdown);
    },
  );

  server.tool(
    "ackit_instruction_graph",
    "Return the resolved instruction graph JSON",
    {},
    async () => {
      const graph = await buildInstructionGraph({ canonicalPath: repositoryRoot });
      return textResult(JSON.stringify(graph));
    },
  );

  server.tool("ackit_list_skills", "List discovered agent skills", {}, async () => {
    const result = await validateSkills({ canonicalPath: repositoryRoot });
    return textResult(JSON.stringify(result.skills));
  });

  server.tool(
    "ackit_validate_skills",
    "Validate agent skills and return tiered issues",
    {},
    async () => {
      const result = await validateSkills({ canonicalPath: repositoryRoot });
      return textResult(JSON.stringify(result.issues));
    },
  );

  server.tool(
    "ackit_list_tasks",
    "List docs-first tasks",
    { all: z.boolean().default(false).optional() },
    async (args: { all?: boolean | undefined }) => {
      const store = new TaskStore(repositoryRoot);
      const docs = await store.list(args.all ?? false);
      return textResult(
        JSON.stringify(
          docs.map((doc) => ({ id: doc.meta.id, status: doc.meta.status, title: doc.meta.title })),
        ),
      );
    },
  );

  server.tool(
    "ackit_get_task",
    "Return one task document by id",
    { id: z.string() },
    async (args: { id: string }) => {
      const store = new TaskStore(repositoryRoot);
      const found = await store.find(args.id);
      if (found === null) return textResult(JSON.stringify({ error: "unknown task" }));
      return textResult(JSON.stringify(found.doc));
    },
  );

  server.tool(
    "ackit_policy_check",
    "Resolve the effective offline policy (chain + digest)",
    {},
    async () => {
      try {
        const configResult = await loadAckitConfig(repositoryRoot);
        const resolved = await resolvePolicy(
          { canonicalPath: repositoryRoot },
          { entryFiles: configResult.ok ? configResult.config.policy.extends : [] },
        );
        return textResult(
          JSON.stringify({
            digest: policyDigest(resolved.policy),
            chain: resolved.chain,
            diagnostics: resolved.diagnostics,
          }),
        );
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  // ---- Workflow expansion read-only tools (TASK-0059, ADR-0028 §6) ----------
  // Boundary preserved: READ-ONLY only — state mutation (workflow set/advance/
  // verify, checkpoint create, evidence register, verdict record) stays
  // CLI-only by explicit decision; a future write tool requires its own
  // architecture/security decision.

  server.tool(
    "ackit_workflow_status",
    "Workflow state for a task (profile, stage, required artifacts)",
    { taskId: z.string() },
    async (args: { taskId: string }) => {
      try {
        const { WorkflowStore, effectiveRequiredArtifacts, resolveProfileRequirements } =
          await import("../core/workflow/index.js");
        const { loadAckitConfig } = await import("../core/config/index.js");
        const { workflowOverridesFromConfig } = await import("../core/workflow/index.js");
        const workflow = new WorkflowStore({ canonicalPath: repositoryRoot });
        const state = await workflow.load(args.taskId);
        if (state === null) {
          return textResult(
            JSON.stringify({
              task: args.taskId,
              workflow: null,
              note: "no workflow state (legacy task)",
            }),
          );
        }
        // TASK-0067: same canonical resolved path as the CLI — absent config
        // yields the catalog defaults (legacy preservation).
        const configResult = await loadAckitConfig(repositoryRoot);
        const overrides = configResult.ok ? workflowOverridesFromConfig(configResult.config) : {};
        const required = effectiveRequiredArtifacts(state.profile, state.stage, overrides);
        const effective = resolveProfileRequirements(state.profile, overrides);
        return textResult(
          JSON.stringify({
            task: args.taskId,
            profile: state.profile,
            stage: state.stage,
            requiredArtifacts: required.artifacts,
            effectiveRequiresEvidence: effective.requiresEvidence,
            effectiveRequiresVerdict: effective.requiresVerdict,
            verificationAttempts: state.verificationAttempts.length,
          }),
        );
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  server.tool(
    "ackit_get_intent",
    "Return one intent document by id (normalized contract + fingerprint)",
    { id: z.string() },
    async (args: { id: string }) => {
      try {
        const { IntentStore, intentFingerprint } = await import("../core/intent/index.js");
        const found = await new IntentStore(repositoryRoot).find(args.id);
        if (found === null) return textResult(JSON.stringify({ error: "unknown intent" }));
        return textResult(
          JSON.stringify({
            intent: found.doc.meta,
            fingerprint: intentFingerprint(found.doc.meta),
          }),
        );
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  server.tool(
    "ackit_get_checkpoint",
    "Return the latest checkpoint of a task (with resume context)",
    { taskId: z.string() },
    async (args: { taskId: string }) => {
      try {
        const { CheckpointStore, renderResumeContext } = await import(
          "../core/checkpoint/index.js"
        );
        const store = new CheckpointStore({ canonicalPath: repositoryRoot }, repositoryRoot);
        const latest = await store.latest(args.taskId);
        if (latest === null) {
          return textResult(JSON.stringify({ task: args.taskId, checkpoint: null }));
        }
        const resume = renderResumeContext(
          latest,
          { id: args.taskId, title: "(task)", status: "active" },
          null,
        );
        return textResult(JSON.stringify({ checkpoint: latest, resume }));
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  server.tool(
    "ackit_verification_bundle",
    "Build the deterministic verification bundle for a fresh verifier",
    { taskId: z.string() },
    async (args: { taskId: string }) => {
      try {
        const { buildVerificationBundle } = await import("../core/verification/index.js");
        const result = await buildVerificationBundle(
          { canonicalPath: repositoryRoot },
          args.taskId,
        );
        if (!result.ok) {
          return textResult(JSON.stringify({ error: result.diagnostic.message }));
        }
        return textResult(result.bundle.markdown);
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  server.tool(
    "ackit_drift_check",
    "Deterministic workflow drift findings for a task",
    { taskId: z.string() },
    async (args: { taskId: string }) => {
      try {
        // TASK-0070: single canonical evaluator shared with the CLI —
        // same state + same input ⇒ same findings (codes/severities/order).
        // Read-only: assembler never writes; no exit-code semantics over MCP
        // (the CLI `--ci` gate stays CLI-only by design).
        const { assembleDriftInput, detectWorkflowDrift } = await import("../core/drift/index.js");
        const assembled = await assembleDriftInput(repositoryRoot, args.taskId);
        if (!assembled.ok) {
          return textResult(JSON.stringify({ error: assembled.message }));
        }
        const findings = detectWorkflowDrift(assembled.input);
        return textResult(JSON.stringify({ findings }));
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  server.tool("ackit_list_roles", "List portable role contracts", {}, async () => {
    try {
      const { listRoles } = await import("../core/roles/index.js");
      const { roles } = await listRoles(repositoryRoot);
      return textResult(
        JSON.stringify(roles.map((role) => ({ role: role.role, title: role.title }))),
      );
    } catch (error) {
      return textResult(JSON.stringify({ error: (error as Error).message }));
    }
  });

  server.tool(
    "ackit_status",
    "Canonical read-only task status: stage, blockers, staleness, next actions (same snapshot as `ackit status`)",
    { taskId: z.string().optional() },
    async (args: { taskId?: string | undefined }) => {
      try {
        // TASK-0083 parity: the composed 0081 projection, read-only —
        // no mutation surface is added (MCP stays read-only by decision).
        const { buildStatusReport } = await import("../core/status/projection.js");
        const report = await buildStatusReport(repositoryRoot, args.taskId);
        return textResult(JSON.stringify(report));
      } catch (error) {
        return textResult(JSON.stringify({ error: (error as Error).message }));
      }
    },
  );

  // ---- Resources (REQ-MCP-003) -------------------------------------------
  server.resource("repository-summary", "repo://summary", async () => {
    const graph = await buildInstructionGraph({ canonicalPath: repositoryRoot });
    const tasks = new TaskStore(repositoryRoot);
    const activeTasks = (await tasks.list(false)).filter((doc) => doc.meta.status === "active");
    return {
      contents: [
        {
          uri: "repo://summary",
          text: JSON.stringify({
            instructionNodeCount: graph.nodes.length,
            activeTaskIds: activeTasks.map((doc) => doc.meta.id),
          }),
        },
      ],
    };
  });

  server.resource("instructions-graph", "repo://instructions-graph", async () => {
    const graph = await buildInstructionGraph({ canonicalPath: repositoryRoot });
    return { contents: [{ uri: "repo://instructions-graph", text: JSON.stringify(graph.nodes) }] };
  });

  server.resource("skills-catalog", "repo://skills-catalog", async () => {
    const result = await validateSkills({ canonicalPath: repositoryRoot });
    return { contents: [{ uri: "repo://skills-catalog", text: JSON.stringify(result.skills) }] };
  });

  server.resource("active-tasks", "repo://tasks-active", async () => {
    const store = new TaskStore(repositoryRoot);
    const docs = (await store.list(false)).filter((doc) => doc.meta.status === "active");
    return {
      contents: [{ uri: "repo://tasks-active", text: JSON.stringify(docs.map((doc) => doc.meta)) }],
    };
  });

  server.resource("effective-policy", "repo://policy", async () => {
    const configResult = await loadAckitConfig(repositoryRoot);
    const resolved = await resolvePolicy(
      { canonicalPath: repositoryRoot },
      { entryFiles: configResult.ok ? configResult.config.policy.extends : [] },
    );
    return {
      contents: [
        {
          uri: "repo://policy",
          text: JSON.stringify({ digest: policyDigest(resolved.policy), chain: resolved.chain }),
        },
      ],
    };
  });

  // ---- Prompts (REQ-MCP-003) ---------------------------------------------
  server.prompt("onboarding", "Onboard a coding agent to this repository", {}, async () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            "Read AGENTS.md (and provider shims) at the repository root.",
            "Then skim README.md for a product overview.",
            "Finish by listing the active task under docs/tasks and its next unchecked criterion.",
          ].join("\n"),
        },
      },
    ],
  }));

  server.prompt(
    "task-execution",
    "Execute the current active task step-by-step",
    { taskId: z.string().optional() },
    async (args: { taskId?: string | undefined }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Open the task ${args.taskId ?? "(find the single active task)"}. Work ONLY its first unchecked acceptance item, run the listed test plan, record pass/fail evidence, then continue.`,
          },
        },
      ],
    }),
  );

  server.prompt("scan-remediation", "Triage and remediate scan findings safely", {}, async () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Call ackit_scan. Group findings by severity. Fix critical/high first; use inline ackit-ignore only with a written reason (an advisory will surface).",
        },
      },
    ],
  }));

  server.prompt(
    "context-optimization",
    "Build or trim a context pack within budget",
    { maxTokens: z.string().optional() },
    async (args: { maxTokens?: string | undefined }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call ackit_pack${args.maxTokens !== undefined ? ` with maxTokens=${args.maxTokens}` : ""}. Review excluded entries; add explicit includes only when ranking missed real relevance.`,
          },
        },
      ],
    }),
  );

  return { server, context };
}
