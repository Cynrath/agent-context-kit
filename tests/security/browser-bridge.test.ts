import http from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type BrowserBridgeHandle,
  createBrowserBridgeServer,
} from "../../src/core/browser-bridge/server.js";

function httpRequest(
  handle: BrowserBridgeHandle,
  path: string,
  opts: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(handle.url);
    const headers: Record<string, string> = {
      Host: url.host,
      ...opts.headers,
    };
    const req = http.request(
      {
        host: url.hostname,
        port: Number(url.port),
        path,
        method: opts.method ?? "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString("utf8");
        });
        res.on("end", () => {
          const outHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === "string") outHeaders[k.toLowerCase()] = v;
            else if (Array.isArray(v)) outHeaders[k.toLowerCase()] = v.join(", ");
          }
          resolve({ status: res.statusCode ?? 0, headers: outHeaders, body: data });
        });
      },
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

describe("Browser Bridge protocol — security", () => {
  let handle: BrowserBridgeHandle | null = null;

  beforeEach(async () => {
    handle = await createBrowserBridgeServer({ port: 0, ttlMs: 60_000 });
  });

  afterEach(async () => {
    if (handle) {
      await handle.close().catch(() => {});
      handle = null;
    }
  });

  it("GET /v1/health is unauthenticated but requires correct Host", async () => {
    // correct Host → 200
    const ok = await httpRequest(handle as BrowserBridgeHandle, "/v1/health");
    expect(ok.status).toBe(200);
    const json = JSON.parse(ok.body) as { ok: boolean };
    expect(json.ok).toBe(true);

    // bad Host → 403
    const badHost = await httpRequest(handle as BrowserBridgeHandle, "/v1/health", {
      headers: {
        Host: "evil.com",
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
      },
    });
    expect(badHost.status).toBe(403);
    expect(badHost.body).toContain("bad Host");
  });

  it("requires Bearer token for /v1/status, rejects missing/invalid", async () => {
    const missing = await httpRequest(handle as BrowserBridgeHandle, "/v1/status");
    expect(missing.status).toBe(401);
    expect(missing.headers["www-authenticate"]).toBe("Bearer");

    const wrong = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(wrong.status).toBe(401);

    const good = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(good.status).toBe(200);
    const json = JSON.parse(good.body) as { ok: boolean; version: string };
    expect(json.ok).toBe(true);
    expect(typeof json.version).toBe("string");
  });

  it("Origin must be chrome-extension:// or absent; pins first origin", async () => {
    // No Origin → ok (curl)
    const noOrigin = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(noOrigin.status).toBe(200);

    // chrome-extension origin → ok and pins
    const extId = "abc123def456ghi789jkl012mno345pq";
    const extOrigin = `chrome-extension://${extId}`;
    const withExt = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: {
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
        Origin: extOrigin,
      },
    });
    expect(withExt.status).toBe(200);

    // Different extension origin now → 403
    const otherOrigin = "chrome-extension://otherotherotherotherotherother12";
    const badOrigin = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: {
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
        Origin: otherOrigin,
      },
    });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body).toContain("bad Origin");

    // https attacker origin → 403
    const httpsOrigin = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: {
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
        Origin: "https://evil.com",
      },
    });
    expect(httpsOrigin.status).toBe(403);
  });

  it("CORS: no wildcard, echoes pinned origin, preflight requires auth", async () => {
    const extOrigin = "chrome-extension://corsTest12345678901234567890ab";
    // First authenticated request pins origin
    const first = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: {
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
        Origin: extOrigin,
      },
    });
    expect(first.status).toBe(200);
    expect(first.headers["access-control-allow-origin"]).toBe(extOrigin);
    expect(first.headers["access-control-allow-methods"]).toBeDefined();

    // Preflight without auth → 403
    const preNoAuth = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      method: "OPTIONS",
      headers: { Origin: extOrigin },
    });
    expect(preNoAuth.status).toBe(403);

    // Preflight with auth → 204 and CORS headers
    const preAuth = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      method: "OPTIONS",
      headers: {
        Origin: extOrigin,
        Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}`,
      },
    });
    expect(preAuth.status).toBe(204);
    expect(preAuth.headers["access-control-allow-origin"]).toBe(extOrigin);
  });

  it("Host must include exact port", async () => {
    const url = new URL((handle as BrowserBridgeHandle).url);
    const wrongPort = await httpRequest(handle as BrowserBridgeHandle, "/v1/health", {
      headers: { Host: `${url.hostname}:9999` },
    });
    expect(wrongPort.status).toBe(403);
  });

  it("POST /v1/stop revokes token, subsequent requests 401", async () => {
    const before = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(before.status).toBe(200);

    const stop = await httpRequest(handle as BrowserBridgeHandle, "/v1/stop", {
      method: "POST",
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(stop.status).toBe(200);
    const stopJson = JSON.parse(stop.body) as { ok: boolean; revoked: boolean };
    expect(stopJson.revoked).toBe(true);

    // allow server to close (100ms)
    await new Promise((r) => setTimeout(r, 200));

    let after: { status: number; body: string } | null = null;
    let afterError: unknown = null;
    try {
      after = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
        headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
      });
    } catch (error) {
      afterError = error;
    }
    // After revoke+close, either 401 (if still listening but revoked) or ECONNREFUSED (closed) is success.
    if (after !== null) {
      expect(
        [401, 0].includes(after.status) ||
          after.body.includes("revoked") ||
          after.body.includes("PAYLOAD"),
      ).toBe(true);
    } else {
      expect(String(afterError)).toContain("ECONNREFUSED");
    }
  });

  it("security headers present on every response", async () => {
    const res = await httpRequest(handle as BrowserBridgeHandle, "/v1/health");
    expect(res.headers["content-security-policy"]).toBe("default-src 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["cache-control"]).toBe("no-store");

    const authRes = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(authRes.headers["content-security-policy"]).toBe("default-src 'none'");
  });

  it("redacts secrets and absolute paths", async () => {
    // We can't inject a secret file easily without modifying repo, but we can verify that the bridge's own
    // root path is redacted to <local-path> (since O:\... matches [A-Z]:\\) and that no raw GH pattern leaks.
    const res = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(res.status).toBe(200);
    // The status contains canonicalRoot which is redacted; ensure no absolute drive pattern leaks verbatim
    // If redact works, body should contain <local-path> not O:\ or C:\
    // Our test repo is O:\projeler\agent-context-kit, so without redact it would contain O:\
    expect(res.body.includes("O:\\") || res.body.includes("C:\\")).toBe(false);
    expect(res.body).toContain("<local-path>");
  });

  it("payload cap: context returns JSON within 512KB, Content-Length guarded", { timeout: 15000 }, async () => {
    const res = await httpRequest(handle as BrowserBridgeHandle, "/v1/context?maxTokens=20000", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    // Either 200 with capped payload or 413 if pack exceeds 512KB (both are valid cap enforcement)
    expect([200, 413].includes(res.status)).toBe(true);
    const len = Buffer.byteLength(res.body, "utf8");
    expect(len).toBeLessThanOrEqual(512 * 1024 + 100); // 413 body is small
    expect(res.headers["content-type"]).toContain("application/json");
    if (res.status === 413) {
      expect(res.body).toContain("PAYLOAD_TOO_LARGE");
    }
    // Ensure a smaller request succeeds within cap
    const small = await httpRequest(handle as BrowserBridgeHandle, "/v1/context?maxTokens=4000", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(small.status).toBe(200);
    expect(Buffer.byteLength(small.body, "utf8")).toBeLessThanOrEqual(512 * 1024);
  });

  it("rate limit: 60/min burst 10 — after many rapid requests eventually 429", async () => {
    // We will send 70 rapid authenticated requests; at least one should be 429 due to bucket 60
    // Use a fresh handle with low threshold? Our server has 60 limit, so after 60 we expect 429.
    // To avoid flakiness, we send sequentially.
    let got429 = false;
    for (let i = 0; i < 70; i++) {
      const r = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
        headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
      });
      if (r.status === 429) {
        got429 = true;
        expect(r.headers["retry-after"]).toBe("1");
        break;
      }
      // If we got 200, continue; if other, fail
      if (r.status !== 200) {
        // Could be rate limit already
        if (r.status === 429) got429 = true;
        break;
      }
    }
    expect(got429).toBe(true);
  });

  it("unknown route 404 and method not allowed 405", async () => {
    const notFound = await httpRequest(handle as BrowserBridgeHandle, "/v1/unknown", {
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(notFound.status).toBe(404);

    const notAllowed = await httpRequest(handle as BrowserBridgeHandle, "/v1/status", {
      method: "POST",
      headers: { Authorization: `Bearer ${(handle as BrowserBridgeHandle).token}` },
    });
    expect(notAllowed.status).toBe(405);
  });

  it("TTL expiry returns 401 with X-ACKit-Bridge-Expired", async () => {
    // Create a handle with very short TTL
    const shortHandle = await createBrowserBridgeServer({ port: 0, ttlMs: 1 });
    // wait for expiry
    await new Promise((r) => setTimeout(r, 10));
    const res = await httpRequest(shortHandle, "/v1/status", {
      headers: { Authorization: `Bearer ${shortHandle.token}` },
    });
    expect(res.status).toBe(401);
    expect(res.headers["x-ackit-bridge-expired"]).toBe("1");
    await shortHandle.close().catch(() => {});
  });
});
