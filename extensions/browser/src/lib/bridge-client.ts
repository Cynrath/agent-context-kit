// Bridge client — talks only to 127.0.0.1 with Bearer token, never to remote hosts.
// CSP in manifest: connect-src is implicitly limited to host_permissions (127.0.0.1) for extension pages.

import type { BridgeSession } from "./storage.js";

const PAYLOAD_LIMIT_BYTES = 1_048_576; // 1MB guard before JSON parse (bridge caps at 512KB)

export type BridgeError = { code: string; message: string; status: number };

export async function bridgeFetch(
  session: BridgeSession,
  path: string,
  options: { method?: string; signal?: AbortSignal } = {},
): Promise<{ ok: true; data: unknown } | { ok: false; error: BridgeError }> {
  const url = `${session.endpoint}${path}`;
  // Enforce loopback-only target at client side as well (defense in depth)
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]" && host !== "::1") {
      return {
        ok: false,
        error: { code: "BAD_TARGET", message: "bridge target must be loopback", status: 400 },
      };
    }
  } catch {
    return { ok: false, error: { code: "BAD_TARGET", message: "invalid bridge url", status: 400 } };
  }

  const controller = new AbortController();
  const combinedSignal = options.signal
    ? anySignal([controller.signal, options.signal])
    : controller.signal;

  // Timeout guard 10s
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      signal: combinedSignal,
    });

    // Guard Content-Type and size before parsing
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        error: {
          code: "BAD_CONTENT_TYPE",
          message: `expected json, got ${contentType}`,
          status: response.status,
        },
      };
    }
    const lengthHeader = response.headers.get("content-length");
    if (lengthHeader !== null) {
      const len = Number.parseInt(lengthHeader, 10);
      if (Number.isFinite(len) && len > PAYLOAD_LIMIT_BYTES) {
        return {
          ok: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "bridge payload exceeds client limit",
            status: 413,
          },
        };
      }
    }

    const text = await response.text();
    if (text.length > PAYLOAD_LIMIT_BYTES) {
      return {
        ok: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "bridge payload exceeds client limit",
          status: 413,
        },
      };
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: { code: "BAD_JSON", message: "invalid json from bridge", status: response.status },
      };
    }

    if (!response.ok) {
      const code = (json as { code?: string })?.code ?? "BRIDGE_ERROR";
      const message = (json as { message?: string })?.message ?? `bridge error ${response.status}`;
      return { ok: false, error: { code, message, status: response.status } };
    }

    return { ok: true, data: json };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return {
        ok: false,
        error: { code: "ABORTED", message: "bridge request aborted", status: 0 },
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: { code: "NETWORK_ERROR", message, status: 0 } };
  } finally {
    clearTimeout(timeout);
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) controller.abort();
    else s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function fetchStatus(session: BridgeSession, signal?: AbortSignal) {
  return bridgeFetch(session, "/v1/status", { signal });
}

export async function fetchActiveTask(session: BridgeSession, signal?: AbortSignal) {
  return bridgeFetch(session, "/v1/task/active", { signal });
}

export async function fetchContext(
  session: BridgeSession,
  params: { profile?: string; maxTokens?: number },
  signal?: AbortSignal,
) {
  const qs = new URLSearchParams();
  if (params.profile) qs.set("profile", params.profile);
  if (params.maxTokens) qs.set("maxTokens", String(params.maxTokens));
  const suffix = qs.toString().length > 0 ? `?${qs.toString()}` : "";
  return bridgeFetch(session, `/v1/context${suffix}`, { signal });
}

export async function fetchReadiness(session: BridgeSession, signal?: AbortSignal) {
  return bridgeFetch(session, "/v1/readiness", { signal });
}

export async function fetchEvidence(session: BridgeSession, limit = 20, signal?: AbortSignal) {
  return bridgeFetch(session, `/v1/evidence?limit=${limit}`, { signal });
}

export async function postStop(session: BridgeSession, signal?: AbortSignal) {
  return bridgeFetch(session, "/v1/stop", { method: "POST", signal });
}
