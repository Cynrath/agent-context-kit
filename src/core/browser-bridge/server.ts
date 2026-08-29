import http from "node:http";
import path from "node:path";
import { getPackageIdentity } from "../../shared/version.js";
import { assertBindableHost } from "../reporting/serve.js";
import { redactForBridge, redactObjectForBridge } from "./redact.js";
import { generateBrowserToken } from "./token.js";

const MAX_RESPONSE_BYTES = 512 * 1024;
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_BURST = 10;

type RateEntry = { windowStart: number; count: number };

function isLoopbackHost(value: string): boolean {
  const n = value.toLowerCase();
  return n === "localhost" || n === "127.0.0.1" || n === "::1" || n === "[::1]";
}

export interface BrowserBridgeOptions {
  host?: string;
  port?: number;
  ttlMs?: number;
  extensionId?: string;
  root?: string;
  allowNonLocal?: boolean;
  token?: string;
}

export interface BrowserBridgeHandle {
  host: string;
  port: number;
  url: string;
  token: string;
  ttlMs: number;
  close(): Promise<void>;
}

function parseHostHeader(
  hostHeader: string | undefined,
): { host: string; port: string | null } | null {
  if (hostHeader === undefined || hostHeader.length === 0) return null;
  const trimmed = hostHeader.trim();
  // Handle IPv6 bracket: [::1]:1234
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    if (end === -1) return null;
    const hostPart = trimmed.slice(0, end + 1);
    const rest = trimmed.slice(end + 1);
    if (rest.length === 0) return { host: hostPart, port: null };
    if (rest.startsWith(":")) return { host: hostPart, port: rest.slice(1) };
    return null;
  }
  const colon = trimmed.lastIndexOf(":");
  if (colon === -1) return { host: trimmed, port: null };
  // Distinguish IPv4:port vs missing port: last colon is port separator only if after it is numeric
  const portPart = trimmed.slice(colon + 1);
  if (/^\d+$/.test(portPart)) return { host: trimmed.slice(0, colon), port: portPart };
  return { host: trimmed, port: null };
}

function buildSecurityHeaders(): Record<string, string> {
  return {
    "content-security-policy": "default-src 'none'",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "cache-control": "no-store",
  };
}

function sendJson(
  response: http.ServerResponse,
  status: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  const headers = { ...buildSecurityHeaders(), ...extraHeaders };
  const redacted = redactObjectForBridge(payload);
  const body = JSON.stringify(redacted);
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_RESPONSE_BYTES) {
    const oversized = JSON.stringify({
      code: "PAYLOAD_TOO_LARGE",
      message: "response exceeds 512KB cap",
    });
    response.writeHead(413, {
      ...headers,
      "content-type": "application/json; charset=utf-8",
      "content-length": String(Buffer.byteLength(oversized, "utf8")),
    });
    response.end(oversized);
    return;
  }
  response.writeHead(status, {
    ...headers,
    "content-type": "application/json; charset=utf-8",
    "content-length": String(bytes),
  });
  response.end(body);
}

function sendText(
  response: http.ServerResponse,
  status: number,
  text: string,
  extraHeaders: Record<string, string> = {},
): void {
  const headers = { ...buildSecurityHeaders(), ...extraHeaders };
  const redacted = redactForBridge(text);
  response.writeHead(status, {
    ...headers,
    "content-type": "text/plain; charset=utf-8",
    "content-length": String(Buffer.byteLength(redacted, "utf8")),
  });
  response.end(redacted);
}

export async function createBrowserBridgeServer(
  options: BrowserBridgeOptions = {},
): Promise<BrowserBridgeHandle> {
  const host = options.host ?? "127.0.0.1";
  const allowNonLocal = options.allowNonLocal ?? false;
  assertBindableHost(host, allowNonLocal);
  const portInput = options.port;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const rootInput = options.root ?? process.cwd();
  const token = options.token ?? generateBrowserToken();
  const pinnedOriginSeed = options.extensionId ? `chrome-extension://${options.extensionId}` : null;

  const packageIdentity = getPackageIdentity();
  const startedAt = Date.now();
  let revoked = false;
  let pinnedOrigin: string | null = pinnedOriginSeed;
  const rateMap = new Map<string, RateEntry>();

  function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = rateMap.get(key);
    if (entry === undefined) {
      rateMap.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      entry.windowStart = now;
      entry.count = 1;
      return true;
    }
    entry.count += 1;
    // Burst 10 allowed instantly, then 60/min window
    if (entry.count <= RATE_LIMIT_BURST) return true;
    if (entry.count > RATE_LIMIT_MAX) return false;
    return true;
  }

  function extractAuth(request: http.IncomingMessage): string | null {
    const raw = request.headers["authorization"];
    if (typeof raw !== "string") return null;
    const m = /^Bearer\s+(\S+)$/.exec(raw.trim());
    if (m === null || m[1] === undefined) return null;
    return m[1];
  }

  function checkHost(request: http.IncomingMessage, actualPort: number): boolean {
    const hostHeader = request.headers["host"];
    if (typeof hostHeader !== "string") return false;
    const parsed = parseHostHeader(hostHeader);
    if (parsed === null) return false;
    if (parsed.port === null) return false;
    if (String(actualPort) !== parsed.port) return false;
    const hostPart = parsed.host.toLowerCase();
    if (isLoopbackHost(hostPart)) return true;
    return false;
  }

  function checkOrigin(request: http.IncomingMessage): {
    ok: boolean;
    originToEcho: string | null;
  } {
    const originHeader = request.headers["origin"];
    if (originHeader === undefined) {
      return { ok: true, originToEcho: null };
    }
    if (typeof originHeader !== "string" || originHeader.length === 0) {
      return { ok: false, originToEcho: null };
    }
    const origin = originHeader.trim();
    if (origin === "null") return { ok: false, originToEcho: null };
    if (origin.startsWith("chrome-extension://")) {
      if (pinnedOrigin === null) {
        // First time we see an extension origin, we will pin it after successful auth.
        // For Host-only validation we tentatively allow, auth will gate.
        return { ok: true, originToEcho: origin };
      }
      if (origin === pinnedOrigin) return { ok: true, originToEcho: origin };
      return { ok: false, originToEcho: null };
    }
    // Any https/http/file origin is rejected
    return { ok: false, originToEcho: null };
  }

  const server = http.createServer(async (request, response) => {
    // Cheap URL parse for path; host for URL is the bound host (not the Host header)
    const url = new URL(request.url ?? "/", `http://${host}`);

    // Set security headers helper: we set via sendJson/sendText, but for 403 early we also need CORS absence.
    // Decide host/origin validity before auth (T21/T23).
    const address = server.address();
    const actualPort =
      typeof address === "object" && address !== null ? address.port : (portInput ?? 0);
    const isPreflight = request.method === "OPTIONS";

    if (!checkHost(request, actualPort)) {
      sendText(response, 403, "forbidden: bad Host");
      return;
    }

    const originCheck = checkOrigin(request);
    if (!originCheck.ok) {
      sendText(response, 403, "forbidden: bad Origin");
      return;
    }

    const corsHeaders: Record<string, string> =
      originCheck.originToEcho !== null
        ? {
            "access-control-allow-origin": originCheck.originToEcho,
            "access-control-allow-methods": "GET, POST",
            "access-control-allow-headers": "Authorization, Content-Type",
            "access-control-max-age": "600",
            vary: "Origin",
          }
        : {};

    if (isPreflight) {
      // Preflight must carry Origin chrome-extension:// and will be checked for auth via Access-Control-Request-Headers
      // We require Authorization header present even on preflight per protocol §5.
      const auth = extractAuth(request);
      if (auth === null) {
        sendText(response, 403, "forbidden: missing Authorization on preflight", corsHeaders);
        return;
      }
      response.writeHead(204, { ...buildSecurityHeaders(), ...corsHeaders });
      response.end();
      return;
    }

    // Health route is unauthenticated but still host/origin gated
    const pathName = url.pathname;
    const isHealth = pathName === "/v1/health";

    // TTL check before auth (expired session)
    if (ttlMs > 0 && Date.now() - startedAt > ttlMs && !isHealth) {
      sendJson(
        response,
        401,
        { code: "EXPIRED", message: "bridge session expired" },
        { ...corsHeaders, "x-ackit-bridge-expired": "1" },
      );
      return;
    }

    if (revoked && !isHealth) {
      sendJson(
        response,
        401,
        { code: "UNAUTHORIZED", message: "bridge session revoked" },
        { ...corsHeaders, "x-ackit-bridge-expired": "1" },
      );
      return;
    }

    if (!isHealth) {
      const auth = extractAuth(request);
      if (auth === null || auth !== token) {
        response.setHeader("www-authenticate", "Bearer");
        sendJson(
          response,
          401,
          { code: "UNAUTHORIZED", message: "missing or invalid Authorization header" },
          corsHeaders,
        );
        return;
      }
      // Pin origin on first successful auth if it carried chrome-extension://
      if (originCheck.originToEcho !== null && pinnedOrigin === null) {
        pinnedOrigin = originCheck.originToEcho;
      }
      // If origin was pinned to a different value, we already 403'd above; after pin we stay.
      if (
        pinnedOrigin !== null &&
        originCheck.originToEcho !== null &&
        pinnedOrigin !== originCheck.originToEcho
      ) {
        sendText(response, 403, "forbidden: bad Origin", corsHeaders);
        return;
      }
      // Rate limit per token (all authenticated requests share the same token in v0.3)
      if (!checkRateLimit(token)) {
        sendJson(
          response,
          429,
          { code: "RATE_LIMITED", message: "rate limit exceeded" },
          { ...corsHeaders, "retry-after": "1" },
        );
        return;
      }
    }

    // Route handling
    try {
      if (request.method === "GET" && pathName === "/v1/health") {
        sendJson(response, 200, { ok: true, revoked }, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/status") {
        const canonicalRoot = await resolveRootCanonical(rootInput);
        sendJson(
          response,
          200,
          {
            ok: true,
            version: packageIdentity.version,
            engineVersion: packageIdentity.version,
            root: rootInput,
            canonicalRoot,
            uptimeMs: Date.now() - startedAt,
            ttlMs,
            revoked,
          },
          corsHeaders,
        );
        return;
      }
      if (request.method === "GET" && pathName === "/v1/repository") {
        const canonicalRoot = await resolveRootCanonical(rootInput);
        // Workspaces probe is best-effort
        let workspaces: unknown = [];
        try {
          const { resolveRepositoryRoot } = await import("../filesystem/root.js");
          const { detectWorkspaces } = await import("../workspace/index.js").catch(() => ({
            detectWorkspaces: null,
          }));
          const rootRes = await resolveRepositoryRoot(rootInput);
          if (rootRes.ok && typeof detectWorkspaces === "function") {
            const ws = await detectWorkspaces(rootRes.root).catch(() => []);
            workspaces = ws;
          }
        } catch {
          workspaces = [];
        }
        sendJson(response, 200, { root: rootInput, canonicalRoot, workspaces }, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/task/active") {
        const result = await handleActiveTask(rootInput);
        sendJson(response, 200, result, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/instructions/effective") {
        const forParam = url.searchParams.get("for") ?? ".";
        const providerParam = url.searchParams.get("provider") ?? undefined;
        const normalized = normalizeRepoRelative(forParam);
        if (normalized === null) {
          sendJson(
            response,
            400,
            { code: "BAD_REQUEST", message: "invalid for param" },
            corsHeaders,
          );
          return;
        }
        const result = await handleInstructions(rootInput, normalized, providerParam);
        if (result.error !== null) {
          sendJson(response, result.status, result.error, corsHeaders);
          return;
        }
        sendJson(response, 200, result.payload, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/context") {
        const profile = url.searchParams.get("profile") ?? undefined;
        const maxTokensRaw = url.searchParams.get("maxTokens");
        const maxTokens = maxTokensRaw !== null ? Number.parseInt(maxTokensRaw, 10) : 40000;
        const clamped =
          Number.isFinite(maxTokens) && maxTokens > 0 ? Math.min(maxTokens, 80000) : 40000;
        const result = await handleContextPack(rootInput, profile, clamped);
        if (result.error !== null) {
          sendJson(response, result.status, result.error, corsHeaders);
          return;
        }
        sendJson(response, 200, result.payload, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/readiness") {
        const result = await handleReadiness(rootInput);
        sendJson(response, 200, result, corsHeaders);
        return;
      }
      if (request.method === "GET" && pathName === "/v1/evidence") {
        const limitRaw = url.searchParams.get("limit");
        const offsetRaw = url.searchParams.get("offset");
        const limit = limitRaw !== null ? Number.parseInt(limitRaw, 10) : 100;
        const offset = offsetRaw !== null ? Number.parseInt(offsetRaw, 10) : 0;
        const clampedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 100;
        const clampedOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const result = await handleEvidence(rootInput, clampedLimit, clampedOffset);
        sendJson(response, 200, result, corsHeaders);
        return;
      }
      if (request.method === "POST" && pathName === "/v1/stop") {
        revoked = true;
        sendJson(response, 200, { ok: true, revoked: true }, corsHeaders);
        setTimeout(() => {
          server.close(() => {});
        }, 100);
        return;
      }
      if (request.method !== "GET" && pathName.startsWith("/v1/")) {
        sendJson(
          response,
          405,
          { code: "METHOD_NOT_ALLOWED", message: "method not allowed" },
          { ...corsHeaders, allow: "GET" },
        );
        return;
      }
      sendJson(response, 404, { code: "NOT_FOUND", message: "not found" }, corsHeaders);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 500, { code: "INTERNAL", message: redactForBridge(message) }, corsHeaders);
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(portInput ?? 0, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const actualPort =
    typeof address === "object" && address !== null ? (address.port as number) : (portInput ?? 0);
  const url = `http://${host}:${actualPort}`;

  return {
    host,
    port: actualPort,
    url,
    token,
    ttlMs,
    close: () =>
      new Promise<void>((resolve) => {
        if (revoked) {
          server.close(() => resolve());
          return;
        }
        revoked = true;
        server.close(() => resolve());
      }),
  };
}

async function resolveRootCanonical(rootInput: string): Promise<string> {
  try {
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const res = await resolveRepositoryRoot(rootInput);
    if (res.ok) return res.root.canonicalPath;
    return path.resolve(rootInput);
  } catch {
    return path.resolve(rootInput);
  }
}

function normalizeRepoRelative(input: string): string | null {
  if (input.length === 0) return ".";
  if (input.length > 500) return null;
  // Disallow absolute, traversal, backslash, and parent segments
  if (path.isAbsolute(input)) return null;
  const normalized = path.posix.normalize(input.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || normalized.includes("../")) return null;
  if (normalized.includes("\0")) return null;
  return normalized;
}

async function handleActiveTask(rootInput: string): Promise<{ task: unknown | null }> {
  try {
    const { TaskStore } = await import("../tasks/store.js");
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const rootRes = await resolveRepositoryRoot(rootInput);
    if (!rootRes.ok) return { task: null };
    const store = new TaskStore(rootRes.root.canonicalPath);
    const docs = await store.list(false);
    const active =
      docs.find((d) => d.meta.status === "active") ??
      docs.find((d) => d.meta.status === "pending") ??
      null;
    if (active === null) return { task: null };
    const bodyPreview = active.body.slice(0, 800);
    return {
      task: {
        id: active.meta.id,
        title: active.meta.title,
        status: active.meta.status,
        dependencies: active.meta.dependencies,
        bodyPreview,
      },
    };
  } catch {
    return { task: null };
  }
}

async function handleInstructions(
  rootInput: string,
  forPath: string,
  providerRaw: string | undefined,
): Promise<{ error: unknown | null; status: number; payload: unknown | null }> {
  try {
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const rootRes = await resolveRepositoryRoot(rootInput);
    if (!rootRes.ok) {
      return {
        error: { code: "BAD_REQUEST", message: "cannot resolve repository root" },
        status: 400,
        payload: null,
      };
    }
    const { buildInstructionGraph, resolveEffectiveStack } = await import(
      "../instructions/graph.js"
    );
    const graph = await buildInstructionGraph(rootRes.root);
    // Provider filter: normalize provider ids
    const provider = providerRaw !== undefined ? providerRaw.toLowerCase() : "generic";
    const allowed = ["codex", "claude", "gemini", "copilot", "generic"] as const;
    if (!(allowed as readonly string[]).includes(provider)) {
      return {
        error: { code: "BAD_REQUEST", message: "invalid provider" },
        status: 400,
        payload: null,
      };
    }
    const effective = resolveEffectiveStack(
      graph,
      provider as import("../instructions/types.js").ProviderId,
      forPath,
    );
    return {
      error: null,
      status: 200,
      payload: {
        graph: { nodes: graph.nodes, diagnostics: graph.diagnostics },
        effective,
        provider: provider ?? null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: { code: "INTERNAL", message }, status: 500, payload: null };
  }
}

async function handleContextPack(
  rootInput: string,
  profile: string | undefined,
  maxTokens: number,
): Promise<{ error: unknown | null; status: number; payload: unknown | null }> {
  try {
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const rootRes = await resolveRepositoryRoot(rootInput);
    if (!rootRes.ok) {
      return {
        error: { code: "BAD_REQUEST", message: "cannot resolve repository root" },
        status: 400,
        payload: null,
      };
    }
    const { buildContextPack } = await import("../context/pack.js");
    // Profile string validated separately; pack receives no profile object in this MVP (avoid type mismatch)
    // Future: resolve profile string via resolveProfileForCommand → ResolvedProfile
    void profile;
    const pack = await buildContextPack(rootRes.root, { maxTokens });
    return { error: null, status: 200, payload: { pack } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Invalid profile etc. map to 400
    if (message.includes("profile") || message.includes("Profile")) {
      return { error: { code: "BAD_REQUEST", message }, status: 400, payload: null };
    }
    return { error: { code: "INTERNAL", message }, status: 500, payload: null };
  }
}

async function handleReadiness(rootInput: string): Promise<{ score: unknown }> {
  try {
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const rootRes = await resolveRepositoryRoot(rootInput);
    if (!rootRes.ok) return { score: { overall: 0, categories: [], deductions: [] } };
    const { buildInstructionGraph } = await import("../instructions/graph.js");
    const { buildContextPack } = await import("../context/pack.js");
    const { validateSkills } = await import("../skills/validate.js");
    const { executeConfiguredScan } = await import("../scanner/orchestrate.js");
    const { scoreRepository } = await import("../readiness/index.js");
    const { TaskStore } = await import("../tasks/store.js");
    const executed = await executeConfiguredScan(rootRes.root.canonicalPath, {});
    const graph = await buildInstructionGraph(rootRes.root);
    const pack = await buildContextPack(rootRes.root, { maxTokens: 100000 });
    const skills = await validateSkills(rootRes.root);
    const store = new TaskStore(rootRes.root.canonicalPath);
    const tasks = await store.list(true).catch(() => []);
    const policy = {
      findings: executed.result.findings.filter((f) => f.category === "config-problem"),
    } as unknown;
    const taskHealth = { dirExists: true, totalTasks: tasks.length } as unknown;
    const readiness = scoreRepository(
      {
        graph: graph as never,
        pack: pack as never,
        scan: executed.result,
        skills: skills as never,
        policy: policy as never,
        tasks: taskHealth as never,
      },
      {},
    );
    return { score: readiness };
  } catch {
    return { score: { overall: 0, categories: [], deductions: [] } };
  }
}

async function handleEvidence(
  rootInput: string,
  limit: number,
  offset: number,
): Promise<{ findings: unknown[]; total: number; limit: number; offset: number }> {
  try {
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const rootRes = await resolveRepositoryRoot(rootInput);
    if (!rootRes.ok) return { findings: [], total: 0, limit, offset };
    const { executeConfiguredScan } = await import("../scanner/orchestrate.js");
    const executed = await executeConfiguredScan(rootRes.root.canonicalPath, {});
    const total = executed.result.findings.length;
    const slice = executed.result.findings.slice(offset, offset + limit);
    return { findings: slice, total, limit, offset };
  } catch {
    return { findings: [], total: 0, limit, offset };
  }
}
