import path from "node:path";
import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadAckitConfig } from "../core/config/index.js";
import { buildContextPack } from "../core/context/index.js";
import { resolveRepositoryRoot } from "../core/filesystem/root.js";
import { buildInstructionGraph } from "../core/instructions/index.js";
import { policyDigest, resolvePolicy } from "../core/policy/index.js";
import { defaultRegistry, runScan, severityAtLeast } from "../core/scanner/index.js";
import { validateSkills } from "../core/skills/validate.js";
import { TaskStore } from "../core/tasks/index.js";
import { getPackageIdentity } from "../shared/version.js";

export interface AckitMcpContext {
  repositoryRoot: string;
}

function textResult(text: string): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text }] };
}

async function resolveRoot(requested?: string | undefined): Promise<{ canonicalPath: string }> {
  const rootPath = path.resolve(requested ?? process.env["ACKIT_ROOT"] ?? process.cwd());
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return resolved.root;
}

/**
 * Builds the ACKit MCP server on the OFFICIAL TypeScript SDK (ADR-0008,
 * REQ-MCP-001). Read-only tools only (REQ-MCP-002); future write tools require
 * an explicit capability gate design before any registration is added here.
 */
export function createAckitMcpServer(): McpServer {
  const identity = getPackageIdentity();
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
  server.tool(
    "ackit_scan",
    "Run the ACKit scan pipeline and return the canonical JSON report",
    {
      changed: z.boolean().default(false).optional(),
      ci: z.boolean().default(false).optional(),
      root: z.string().optional(),
    },
    async (args: {
      changed?: boolean | undefined;
      ci?: boolean | undefined;
      root?: string | undefined;
    }) => {
      const root = await resolveRoot(args.root);
      const configResult = await loadAckitConfig(root.canonicalPath);
      if (!configResult.ok)
        return textResult(JSON.stringify({ ok: false, errors: configResult.errors }));
      const result = await runScan(root, {
        rules: defaultRegistry.getAll(),
        limits: configResult.config.limits,
        userExcludeGlobs: configResult.config.scan.exclude,
      });
      const threshold = configResult.config.scan.severityThreshold;
      const exceeded =
        args.ci === true &&
        result.findings.some((finding) => severityAtLeast(finding.severity, threshold));
      return textResult(
        `${JSON.stringify({ report: result })}\nexit_code_hint=${exceeded ? 1 : 0}`,
      );
    },
  );

  server.tool(
    "ackit_doctor",
    "Quick repository health summary (config + tasks integrity)",
    { root: z.string().optional() },
    async (args: { root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const configResult = await loadAckitConfig(root.canonicalPath);
      const store = new TaskStore(root.canonicalPath);
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
    "Build a budgeted deterministic context pack",
    {
      maxTokens: z.number().int().positive().optional(),
      format: z.enum(["markdown", "json"]).default("markdown").optional(),
      includeGlobs: z.array(z.string()).optional(),
      root: z.string().optional(),
    },
    async (args: {
      maxTokens?: number | undefined;
      format?: "markdown" | "json" | undefined;
      includeGlobs?: string[] | undefined;
      root?: string | undefined;
    }) => {
      const root = await resolveRoot(args.root);
      const configResult = await loadAckitConfig(root.canonicalPath);
      const maxTokens =
        args.maxTokens ?? (configResult.ok ? configResult.config.context.maxTokens : 100_000);
      const pack = await buildContextPack(root, {
        format: args.format ?? "markdown",
        maxTokens,
        includeGlobs: args.includeGlobs,
      });
      return textResult(pack.format === "json" ? pack.json : pack.markdown);
    },
  );

  server.tool(
    "ackit_instruction_graph",
    "Return the resolved instruction graph JSON",
    { root: z.string().optional() },
    async (args: { root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const graph = await buildInstructionGraph(root);
      return textResult(JSON.stringify(graph));
    },
  );

  server.tool(
    "ackit_list_skills",
    "List discovered agent skills",
    { root: z.string().optional() },
    async (args: { root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const result = await validateSkills(root);
      return textResult(JSON.stringify(result.skills));
    },
  );

  server.tool(
    "ackit_validate_skills",
    "Validate agent skills and return tiered issues",
    { root: z.string().optional() },
    async (args: { root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const result = await validateSkills(root);
      return textResult(JSON.stringify(result.issues));
    },
  );

  server.tool(
    "ackit_list_tasks",
    "List docs-first tasks",
    { all: z.boolean().default(false).optional(), root: z.string().optional() },
    async (args: { all?: boolean | undefined; root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const store = new TaskStore(root.canonicalPath);
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
    { id: z.string(), root: z.string().optional() },
    async (args: { id: string; root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      const store = new TaskStore(root.canonicalPath);
      const found = await store.find(args.id);
      if (found === null) return textResult(JSON.stringify({ error: "unknown task" }));
      return textResult(JSON.stringify(found.doc));
    },
  );

  server.tool(
    "ackit_policy_check",
    "Resolve the effective offline policy (chain + digest)",
    { root: z.string().optional() },
    async (args: { root?: string | undefined }) => {
      const root = await resolveRoot(args.root);
      try {
        const configResult = await loadAckitConfig(root.canonicalPath);
        const resolved = await resolvePolicy(root, {
          entryFiles: configResult.ok ? configResult.config.policy.extends : [],
        });
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

  // ---- Resources (REQ-MCP-003) -------------------------------------------
  server.resource("repository-summary", "repo://summary", async () => {
    const root = await resolveRoot();
    const graph = await buildInstructionGraph(root);
    const tasks = new TaskStore(root.canonicalPath);
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
    const root = await resolveRoot();
    const graph = await buildInstructionGraph(root);
    return { contents: [{ uri: "repo://instructions-graph", text: JSON.stringify(graph.nodes) }] };
  });

  server.resource("skills-catalog", "repo://skills-catalog", async () => {
    const root = await resolveRoot();
    const result = await validateSkills(root);
    return { contents: [{ uri: "repo://skills-catalog", text: JSON.stringify(result.skills) }] };
  });

  server.resource("active-tasks", "repo://tasks-active", async () => {
    const root = await resolveRoot();
    const store = new TaskStore(root.canonicalPath);
    const docs = (await store.list(false)).filter((doc) => doc.meta.status === "active");
    return {
      contents: [{ uri: "repo://tasks-active", text: JSON.stringify(docs.map((doc) => doc.meta)) }],
    };
  });

  server.resource("effective-policy", "repo://policy", async () => {
    const root = await resolveRoot();
    const configResult = await loadAckitConfig(root.canonicalPath);
    const resolved = await resolvePolicy(root, {
      entryFiles: configResult.ok ? configResult.config.policy.extends : [],
    });
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
            "Then read docs/rebuild/GOAL2_BOOTSTRAP.md if present.",
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

  return server;
}
