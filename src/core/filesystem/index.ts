export {
  CLASSIFICATION_HEADER_BYTES,
  type ContentKind,
  classifyContent,
} from "./classify.js";
export { FilesystemEngine } from "./engine.js";
export { BUILTIN_IGNORED_DIRECTORIES, IgnoreEngine } from "./ignore.js";
export { isInsideRoot, normalizeRelativePath, toPosix } from "./paths.js";
export { createFilesystemEngine, resolveRepositoryRoot } from "./root.js";
export { collectScanTargets, type ScanTarget } from "./scan-targets.js";
export type {
  FilesystemDiagnostic,
  FilesystemDiagnosticCode,
  TraversalLimits,
  WalkEntry,
} from "./types.js";
export { type WalkEvent, walkRepository } from "./walk.js";
