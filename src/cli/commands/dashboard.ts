import { serveDashboard } from "../../core/dashboard/server.js";
import type { PolicyError } from "../../core/policy/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import type { ExitCodeValue } from "../../shared/exit-codes.js";
import { EXIT_CODES } from "../../shared/exit-codes.js";

export async function runDashboardCommand(options: {
  root?: string;
  host?: string;
  port?: number;
  allowNonLocal?: boolean;
  open?: boolean;
  json?: boolean;
  quiet?: boolean;
}): Promise<ExitCodeValue> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port;
  const allowNonLocal = options.allowNonLocal ?? false;
  try {
    const handle = await serveDashboard({ host, port, allowNonLocal, root: options.root });
    if (!options.quiet) {
      const msg = `dashboard serving at ${handle.url} (Ctrl+C to stop)\n`;
      if (options.json) {
        process.stdout.write(JSON.stringify({ url: handle.url, port: handle.port }) + "\n");
      } else {
        process.stdout.write(msg);
      }
    }
    if (options.open) {
      try {
        const { spawn } = await import("node:child_process");
        const url = `http://${host}:${handle.port}`;
        const cmd =
          process.platform === "win32"
            ? "cmd"
            : process.platform === "darwin"
              ? "open"
              : "xdg-open";
        const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
        spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
      } catch {}
    }
    await new Promise<void>((resolve) => process.on("SIGINT", resolve));
    await handle.close();
    return EXIT_CODES.ok;
  } catch (error) {
    const code = (error as PolicyError)?.code ?? "dashboard-error";
    emitDiagnostic(
      { code: String(code).toLowerCase(), message: (error as Error).message },
      { quiet: options.quiet ?? false, debug: false },
    );
    return EXIT_CODES.usage;
  }
}
