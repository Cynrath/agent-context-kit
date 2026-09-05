import dgram from "node:dgram";
import dns from "node:dns";
import { promises as fsp } from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanRepository } from "../../src/api/scan-repository.js";
import { buildContextPack } from "../../src/core/context/pack.js";
import { buildInstructionGraph } from "../../src/core/instructions/graph.js";
import { loadRulePacks } from "../../src/core/policy/packs/load.js";
import { executeConfiguredScan } from "../../src/core/scanner/orchestrate.js";

/**
 * Runtime deny-egress harness.
 * Patches outbound primitives to throw, then runs representative product commands.
 * Loopback http.createServer is still allowed.
 */

let egressAttempts: string[] = [];

/** Typed helper to monkey-patch Node globals without ts-ignore. */
function patchObject(target: object, key: PropertyKey, value: unknown): void {
  (target as Record<PropertyKey, unknown>)[key] = value;
}

function patchEgress() {
  egressAttempts = [];

  const originalFetch = globalThis.fetch;
  patchObject(globalThis as unknown as object, "fetch", (...args: unknown[]) => {
    const url = String(args[0] ?? "");
    if (url.startsWith("/api/") || url === "/") {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    }
    if (/^https?:\/\//i.test(url) || url.startsWith("//") || url.includes("://")) {
      egressAttempts.push(`fetch:${url.slice(0, 60)}`);
      return Promise.reject(new Error(`EGRESS BLOCKED: fetch ${url.slice(0, 60)}`));
    }
    // Any other fetch with absolute or dynamic is treated as blocked
    // But product code never calls fetch; if they do with relative allowed, we already handled.
    // For absolute test case: https://example.com will be caught above.
    // For other cases, allow passthrough to original (which would attempt network)
    // Instead, we consider any fetch not starting with /api/ or / as potential egress and block if it looks like http
    return originalFetch
      ? (originalFetch as typeof fetch)(...(args as Parameters<typeof fetch>))
      : Promise.reject(new Error("fetch not available"));
  });

  const origHttpRequest = http.request;
  const origHttpGet = http.get;
  patchObject(http as unknown as object, "request", (...args: unknown[]) => {
    egressAttempts.push(`http.request:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: http.request");
  });
  patchObject(http as unknown as object, "get", (...args: unknown[]) => {
    egressAttempts.push(`http.get:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: http.get");
  });

  const origHttpsRequest = https.request;
  const origHttpsGet = https.get;
  patchObject(https as unknown as object, "request", (...args: unknown[]) => {
    egressAttempts.push(`https.request:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: https.request");
  });
  patchObject(https as unknown as object, "get", (...args: unknown[]) => {
    egressAttempts.push(`https.get:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: https.get");
  });

  const origNetConnect = net.connect;
  const origSocketConnect = net.Socket.prototype.connect as unknown as (
    ...args: unknown[]
  ) => unknown;
  patchObject(net as unknown as object, "connect", (...args: unknown[]) => {
    egressAttempts.push(`net.connect:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: net.connect");
  });
  patchObject(net.Socket.prototype as unknown as object, "connect", (...args: unknown[]) => {
    egressAttempts.push(`Socket.connect:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: Socket.connect");
  });

  const origTlsConnect = tls.connect;
  patchObject(tls as unknown as object, "connect", (...args: unknown[]) => {
    egressAttempts.push(`tls.connect:${String(args[0]).slice(0, 40)}`);
    throw new Error("EGRESS BLOCKED: tls.connect");
  });

  const origDgramCreate = dgram.createSocket;
  patchObject(dgram as unknown as object, "createSocket", (...args: unknown[]) => {
    const socket = origDgramCreate(...(args as Parameters<typeof dgram.createSocket>));
    patchObject(socket as unknown as object, "send", (...sargs: unknown[]) => {
      egressAttempts.push(`dgram.send:${String(sargs[0]).slice(0, 40)}`);
      throw new Error("EGRESS BLOCKED: dgram.send");
    });
    return socket;
  });

  const origDnsResolve = dns.resolve;
  const origDnsLookup = dns.lookup;
  patchObject(dns as unknown as object, "resolve", (...args: unknown[]) => {
    egressAttempts.push(`dns.resolve:${String(args[0])}`);
    throw new Error("EGRESS BLOCKED: dns.resolve");
  });
  patchObject(dns as unknown as object, "lookup", (...args: unknown[]) => {
    const host = String(args[0] ?? "");
    // Allow loopback hosts — needed for http.createServer listen(0, '127.0.0.1')
    if (host === "127.0.0.1" || host === "localhost" || host === "::1") {
      // Call original for loopback
      return (origDnsLookup as (...a: unknown[]) => unknown)(...args);
    }
    egressAttempts.push(`dns.lookup:${host}`);
    throw new Error("EGRESS BLOCKED: dns.lookup");
  });

  const origWebSocket = (globalThis as unknown as { WebSocket?: unknown }).WebSocket;
  patchObject(globalThis as unknown as object, "WebSocket", (...args: unknown[]) => {
    egressAttempts.push(`WebSocket:${String(args[0])}`);
    throw new Error("EGRESS BLOCKED: WebSocket");
  });

  const origEventSource = (globalThis as unknown as { EventSource?: unknown }).EventSource;
  patchObject(globalThis as unknown as object, "EventSource", (...args: unknown[]) => {
    egressAttempts.push(`EventSource:${String(args[0])}`);
    throw new Error("EGRESS BLOCKED: EventSource");
  });

  return () => {
    patchObject(globalThis as unknown as object, "fetch", originalFetch);
    patchObject(http as unknown as object, "request", origHttpRequest);
    patchObject(http as unknown as object, "get", origHttpGet);
    patchObject(https as unknown as object, "request", origHttpsRequest);
    patchObject(https as unknown as object, "get", origHttpsGet);
    patchObject(net as unknown as object, "connect", origNetConnect);
    patchObject(net.Socket.prototype as unknown as object, "connect", origSocketConnect);
    patchObject(tls as unknown as object, "connect", origTlsConnect);
    patchObject(dgram as unknown as object, "createSocket", origDgramCreate);
    patchObject(dns as unknown as object, "resolve", origDnsResolve);
    patchObject(dns as unknown as object, "lookup", origDnsLookup);
    if (origWebSocket) patchObject(globalThis as unknown as object, "WebSocket", origWebSocket);
    else delete (globalThis as unknown as { WebSocket?: unknown }).WebSocket;
    if (origEventSource)
      patchObject(globalThis as unknown as object, "EventSource", origEventSource);
    else delete (globalThis as unknown as { EventSource?: unknown }).EventSource;
  };
}

describe("offline-runtime deny-egress harness", () => {
  let restore: () => void;
  let tmpRepo: string;

  beforeEach(async () => {
    restore = patchEgress();
    tmpRepo = await fsp.mkdtemp(path.join(os.tmpdir(), "ackit-offline-"));
    await fsp.writeFile(path.join(tmpRepo, "README.md"), "# test repo\n");
    await fsp.writeFile(path.join(tmpRepo, "file.txt"), "hello\n");
  });

  afterEach(async () => {
    restore();
    await fsp.rm(tmpRepo, { recursive: true, force: true });
    egressAttempts = [];
  });

  it("blocks fetch absolute URL", async () => {
    await expect(fetch("https://example.com")).rejects.toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("fetch:"))).toBe(true);
    egressAttempts = [];
  });

  it("blocks http.request outbound", () => {
    expect(() => http.request("http://example.com")).toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("http.request"))).toBe(true);
    egressAttempts = [];
  });

  it("blocks https.request outbound", () => {
    expect(() => https.request("https://example.com")).toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("https.request"))).toBe(true);
    egressAttempts = [];
  });

  it("blocks net.connect outbound", () => {
    expect(() => net.connect(80, "example.com")).toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("net.connect"))).toBe(true);
    egressAttempts = [];
  });

  it("blocks tls.connect outbound", () => {
    expect(() => tls.connect(443, "example.com")).toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("tls.connect"))).toBe(true);
    egressAttempts = [];
  });

  it("blocks dns resolve", () => {
    expect(() => dns.resolve("example.com", () => {})).toThrow(/EGRESS BLOCKED/);
    expect(egressAttempts.some((e) => e.startsWith("dns.resolve"))).toBe(true);
    egressAttempts = [];
  });

  it("scanRepository runs offline without egress", async () => {
    const result = await scanRepository({ canonicalPath: tmpRepo });
    expect(result.findings).toBeDefined();
    expect(egressAttempts).toEqual([]);
  });

  it("executeConfiguredScan runs offline", async () => {
    const executed = await executeConfiguredScan(tmpRepo, {});
    expect(executed.result).toBeDefined();
    expect(egressAttempts).toEqual([]);
  });

  it("buildInstructionGraph runs offline", async () => {
    await fsp.writeFile(path.join(tmpRepo, "AGENTS.md"), "# AGENTS\n");
    const graph = await buildInstructionGraph({ canonicalPath: tmpRepo });
    expect(graph.nodes.length).toBeGreaterThanOrEqual(1);
    expect(egressAttempts).toEqual([]);
  });

  it("buildContextPack runs offline", async () => {
    const pack = await buildContextPack({ canonicalPath: tmpRepo }, { maxTokens: 5000 });
    expect(pack.manifest).toBeDefined();
    expect(pack.markdown).toBeDefined();
    expect(egressAttempts).toEqual([]);
  });

  it("workflow expansion families run offline without egress (TASK-0060)", async () => {
    // Exercise every new family end-to-end under the egress spy: task refs,
    // intent, workflow, checkpoint, evidence, verdict/bundle, drift, roles,
    // journal, skills export, policy v2 — all local fs/git only.
    const { TaskStore } = await import("../../src/core/tasks/store.js");
    const { IntentStore } = await import("../../src/core/intent/index.js");
    const { WorkflowStore } = await import("../../src/core/workflow/index.js");
    const { CheckpointStore } = await import("../../src/core/checkpoint/index.js");
    const { EvidenceStore } = await import("../../src/core/evidence/index.js");
    const { syncRegistry } = await import("../../src/core/evidence/sync.js");
    const { VerdictStore, buildVerificationBundle } = await import(
      "../../src/core/verification/index.js"
    );
    const { detectWorkflowDrift } = await import("../../src/core/drift/index.js");
    const { computeStateBinding } = await import("../../src/core/verification/binding.js");
    const { listRoles } = await import("../../src/core/roles/index.js");
    const { JournalStore } = await import("../../src/core/journal/index.js");
    const { resolveAutonomy, resolveReview } = await import("../../src/core/policy/index.js");
    const { validateEvidence } = await import("../../src/core/evidence/index.js");
    const root = { canonicalPath: tmpRepo };

    const tasks = new TaskStore(tmpRepo);
    const created = await tasks.create("offline workflow fixture", [], {
      planRef: "docs/plans/p.md",
    });
    const taskId = created.meta.id;
    await fsp.mkdir(path.join(tmpRepo, "docs", "plans"), { recursive: true });
    await fsp.writeFile(path.join(tmpRepo, "docs", "plans", "p.md"), "# plan\n", "utf8");
    await new IntentStore(tmpRepo).create("offline intent fixture");
    const workflow = new WorkflowStore(root);
    await workflow.setProfile(taskId, "quick");
    await workflow.recordVerificationAttempt(taskId, "pass");
    const doc = await tasks.find(taskId);
    if (doc === null) throw new Error("task missing");
    const checkpoints = new CheckpointStore(root, tmpRepo);
    await checkpoints.create(
      taskId,
      doc.doc,
      { profile: "quick" },
      { objective: "offline checkpoint" },
    );
    const evidenceStore = new EvidenceStore(root);
    const registry = syncRegistry(doc.doc, null, "2026-08-31");
    await evidenceStore.save(taskId, registry);
    validateEvidence(registry);
    const verdicts = new VerdictStore(tmpRepo);
    await verdicts.register(
      taskId,
      {
        schemaId: "ackit.verdict.v1",
        verdict: "PASS",
        verifier: { agent: "offline-verifier", context: "fresh", issuedAt: "2026-08-31" },
        findings: [],
        checkedCriteria: registry.criteria.map((c) => c.id),
        summary: "offline",
      },
      { binding: await computeStateBinding(tmpRepo, taskId) },
    );
    const bundle = await buildVerificationBundle(root, taskId);
    expect(bundle.ok).toBe(true);
    detectWorkflowDrift({
      taskId,
      taskDoc: doc.doc,
      workflow: { profile: "quick", stage: "task" },
      requiredArtifacts: ["task"],
      existingArtifacts: ["task"],
      referencePathsExist: [],
      evidence: registry,
      latestVerdict: { verdict: "PASS" },
      checkpoint: null,
      checkpointProblems: [],
      changedFiles: [],
      dependencies: [],
    });
    const { roles, problems } = await listRoles(tmpRepo);
    expect(roles.length).toBeGreaterThanOrEqual(7);
    expect(problems).toEqual([]);
    const journal = new JournalStore(root);
    await journal.append("ackit-command", { command: "offline", outcome: "ok" });
    resolveAutonomy([{ tier2: "deny" }]);
    resolveReview([{ required: ["security"] }]);
    expect(egressAttempts).toEqual([]);
  });

  it("rule-pack evaluation refuses remote URL without egress", async () => {
    // Direct remote URL as pack spec should be refused without attempting fetch
    const { diagnostics } = await loadRulePacks({ canonicalPath: tmpRepo }, [
      "https://example.com/pack.yml",
    ]);
    expect(diagnostics.some((d) => d.code === "POL-NETWORK-REFUSED")).toBe(true);
    expect(egressAttempts).toEqual([]);

    // Also test via extends in a local file containing remote extend — minimal valid pack
    const packPath = path.join(tmpRepo, "local-pack.yml");
    await fsp.writeFile(
      packPath,
      [
        "schemaVersion: 1",
        "packId: test-pack",
        "namespace: test.ns",
        "version: 1.0.0",
        "severity: medium",
        "rules:",
        "  - id: test-pack:r001",
        "    type: presence",
        '    message: "test rule"',
        '    glob: "**/*.ts"',
        "composition:",
        "  extends:",
        "    - https://example.com/other.yml",
      ].join("\n"),
    );
    const { diagnostics: d2 } = await loadRulePacks({ canonicalPath: tmpRepo }, ["local-pack.yml"]);
    expect(egressAttempts).toEqual([]);
    expect(d2.some((d) => d.code === "POL-NETWORK-REFUSED")).toBe(true);
  });

  it("SDK consumer can be imported and scanned without egress", async () => {
    const { scanRepository: scan } = await import("../../src/index.js");
    const res = await scan({ canonicalPath: tmpRepo });
    expect(Array.isArray(res.findings)).toBe(true);
    expect(egressAttempts).toEqual([]);
  });

  it("dashboard loopback bind is allowed", async () => {
    const server = http.createServer((_req, res) => {
      res.end("ok");
    });
    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", () => resolve());
      server.on("error", reject);
    });
    const addr = server.address() as { port: number };
    expect(addr.port).toBeGreaterThan(0);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    expect(egressAttempts).toEqual([]);
  });
});
