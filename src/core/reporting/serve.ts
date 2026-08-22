import { promises as fsp } from "node:fs";
import http from "node:http";
import path from "node:path";
import { PolicyError } from "../policy/index.js";

export class NonLocalBindRefusedError extends Error {
  readonly code = "RPT-NONLOCAL-REFUSED";
}

/**
 * Local read-only report UI (REQ-RPT-002). Binds loopback by default; any
 * non-loopback host requires an explicit allow flag at the CLI layer, which
 * refuses with exit-class 2 otherwise.
 */
export function assertBindableHost(host: string, allowNonLocal: boolean): void {
  const normalized = host.toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1") return;
  if (!allowNonLocal) {
    throw new PolicyError(
      `refusing to bind non-loopback host '${host}' without --allow-nonlocal`,
      "POL-INVALID",
    );
  }
}

export interface ServeHandle {
  port: number;
  close(): Promise<void>;
}

export async function serveReportFile(options: {
  file: string;
  host?: string | undefined;
  port?: number | undefined;
}): Promise<ServeHandle> {
  const host = options.host ?? "127.0.0.1";
  const content = await fsp.readFile(path.resolve(options.file), "utf8");
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(content);
  });
  await new Promise<void>((resolve) => server.listen(options.port ?? 0, host, resolve));
  const address = server.address();
  return {
    port: typeof address === "object" && address !== null ? address.port : (options.port ?? 0),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
