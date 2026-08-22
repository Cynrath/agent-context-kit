import { promises as fsp } from "node:fs";
import { CLASSIFICATION_HEADER_BYTES, type ContentKind, classifyContent } from "./classify.js";
import { IgnoreEngine } from "./ignore.js";
import type { RepositoryRoot } from "./root.js";
import type { FilesystemDiagnostic, TraversalLimits } from "./types.js";
import { walkRepository } from "./walk.js";

/**
 * A scannable repository file with its content-based classification.
 * Unknown extensions are classified by content like everything else
 * (REQ-FS-004) — nothing is excluded from scanning by extension.
 */
export interface ScanTarget {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  kind: ContentKind;
}

export interface CollectScanTargetsOptions {
  limits?: TraversalLimits | undefined;
  userExcludeGlobs?: readonly string[] | undefined;
  /** Disable classification (kind becomes "text" placeholder) for pure listing use cases. */
  skipClassification?: boolean | undefined;
}

export interface ScanTargetCollection {
  targets: ScanTarget[];
  diagnostics: FilesystemDiagnostic[];
}

const ROOT_DIR_KEY = "";

/**
 * Composed traversal: safe walk + ignore filtering + content classification.
 * Deterministic order (sorted BFS); limit breaches surface as diagnostics.
 */
export async function collectScanTargets(
  root: RepositoryRoot,
  options: CollectScanTargetsOptions = {},
): Promise<ScanTargetCollection> {
  const ignoreEngine = new IgnoreEngine({ userExcludeGlobs: options.userExcludeGlobs });
  await ignoreEngine.loadGitignore(root.canonicalPath, ROOT_DIR_KEY);
  const targets: ScanTarget[] = [];
  const diagnostics: FilesystemDiagnostic[] = [];

  for await (const event of walkRepository(root, { limits: options.limits })) {
    if (event.kind === "diagnostic") {
      diagnostics.push(event.diagnostic);
      continue;
    }
    if (event.kind === "directory") {
      await ignoreEngine.loadGitignore(root.canonicalPath, event.relativePath);
      continue;
    }
    const decision = ignoreEngine.decideFile(event.entry.relativePath);
    if (decision.ignored) {
      continue;
    }
    const kind =
      options.skipClassification === true
        ? ("text" as const)
        : await classifyFile(event.entry.absolutePath);
    targets.push({
      relativePath: event.entry.relativePath,
      absolutePath: event.entry.absolutePath,
      sizeBytes: event.entry.sizeBytes,
      kind,
    });
  }

  return { targets, diagnostics };
}

async function classifyFile(absolutePath: string): Promise<ContentKind> {
  const handle = await fsp.open(absolutePath, "r");
  try {
    const header = Buffer.alloc(CLASSIFICATION_HEADER_BYTES);
    const { bytesRead } = await handle.read(header, 0, CLASSIFICATION_HEADER_BYTES, 0);
    return classifyContent(header.subarray(0, bytesRead));
  } finally {
    await handle.close();
  }
}
