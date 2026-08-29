import http from "node:http";
import { createBrowserBridgeServer } from "../../core/browser-bridge/server.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";

export type BrowserStartOptions = {
  host?: string;
  port?: number;
  ttlMs?: number;
  extensionId?: string;
  root?: string;
  json?: boolean;
  quiet?: boolean;
  allowNonLocal?: boolean;
};

export type BrowserStatusOptions = {
  host?: string;
  port?: number;
  json?: boolean;
  quiet?: boolean;
};

export type BrowserStopOptions = {
  host?: string;
  port?: number;
  json?: boolean;
  quiet?: boolean;
};

async function probeHealth(
  host: string,
  port: number,
  timeoutMs = 1500,
): Promise<{ ok: boolean; revoked?: boolean }> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host,
        port,
        path: "/v1/health",
        method: "GET",
        timeout: timeoutMs,
        headers: { Host: `${host}:${port}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString("utf8");
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(data) as { ok?: boolean; revoked?: boolean };
            resolve({ ok: json.ok === true, revoked: json.revoked });
          } catch {
            resolve({ ok: res.statusCode === 200 });
          }
        });
      },
    );
    req.on("error", () => resolve({ ok: false }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false });
    });
    req.end();
  });
}

export async function runBrowserStartCommand(options: BrowserStartOptions): Promise<ExitCodeValue> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port;
  const ttlMs = options.ttlMs;
  const extensionId = options.extensionId;
  const root = options.root;
  const allowNonLocal = options.allowNonLocal ?? false;
  try {
    const handle = await createBrowserBridgeServer({
      host,
      port,
      ttlMs,
      extensionId,
      root,
      allowNonLocal,
    });
    if (!options.quiet) {
      if (options.json) {
        // stdout: machine JSON; stderr: human token notice
        process.stdout.write(
          `${JSON.stringify({ url: handle.url, host: handle.host, port: handle.port, ttlMs: handle.ttlMs, extensionId: extensionId ?? null })}\n`,
        );
        process.stderr.write(
          `ACKit Browser Bridge running at ${handle.url}\nToken: ${handle.token}\n`,
        );
      } else {
        process.stdout.write(
          `ACKit Browser Bridge running at ${handle.url}\nToken: ${handle.token}\n`,
        );
        process.stdout.write(`Extension: paste token into ACKit Side Panel → Connect\n`);
        process.stdout.write(`Stop with: ackit browser stop --port ${handle.port}\n`);
      }
    }
    // Keep alive until SIGINT/SIGTERM
    await new Promise<void>((resolve) => {
      const onSignal = () => resolve();
      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);
    });
    await handle.close();
    return EXIT_CODES.ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitDiagnostic(
      { code: "browser-start-failed", message },
      { quiet: options.quiet ?? false, debug: false },
    );
    return EXIT_CODES.usage;
  }
}

export async function runBrowserStatusCommand(
  options: BrowserStatusOptions,
): Promise<ExitCodeValue> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  if (port === 0) {
    const msg = "no port specified; try: ackit browser status --port <port>";
    emitDiagnostic(
      { code: "browser-status-missing-port", message: msg },
      { quiet: options.quiet ?? false, debug: false },
    );
    return EXIT_CODES.usage;
  }
  const probed = await probeHealth(host, port);
  if (!options.quiet) {
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify({ host, port, ok: probed.ok, revoked: probed.revoked ?? false })}\n`,
      );
    } else {
      process.stdout.write(
        `browser bridge ${host}:${port} — ${probed.ok ? "reachable" : "unreachable"}${probed.revoked ? " (revoked)" : ""}\n`,
      );
    }
  }
  return probed.ok ? EXIT_CODES.ok : EXIT_CODES.environment;
}

export async function runBrowserStopCommand(options: BrowserStopOptions): Promise<ExitCodeValue> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 0;
  if (port === 0) {
    const msg = "no port specified; try: ackit browser stop --port <port>";
    emitDiagnostic(
      { code: "browser-stop-missing-port", message: msg },
      { quiet: options.quiet ?? false, debug: false },
    );
    return EXIT_CODES.usage;
  }
  // Try fetching token from env ACKIT_BROWSER_TOKEN if available (not required for stop — bridge will check Bearer)
  const token = process.env["ACKIT_BROWSER_TOKEN"] ?? "";
  return new Promise<ExitCodeValue>((resolve) => {
    const headers: Record<string, string> = { Host: `${host}:${port}` };
    if (token.length > 0) headers["Authorization"] = `Bearer ${token}`;
    // Even without token, attempt POST — server will 401 if token required, but we still surface that
    const req = http.request({ host, port, path: "/v1/stop", method: "POST", headers }, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString("utf8");
      });
      res.on("end", () => {
        if (!options.quiet) {
          if (options.json) {
            process.stdout.write(
              `${JSON.stringify({ host, port, status: res.statusCode, body: data })}\n`,
            );
          } else {
            process.stdout.write(`stop ${host}:${port} → ${res.statusCode}\n`);
          }
        }
        if (res.statusCode === 200) resolve(EXIT_CODES.ok);
        else if (res.statusCode === 401) resolve(EXIT_CODES.securityBoundary);
        else resolve(EXIT_CODES.environment);
      });
    });
    req.on("error", (error: Error) => {
      emitDiagnostic(
        { code: "browser-stop-failed", message: error.message },
        { quiet: options.quiet ?? false, debug: false },
      );
      resolve(EXIT_CODES.environment);
    });
    req.end();
  });
}
