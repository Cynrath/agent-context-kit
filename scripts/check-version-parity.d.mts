export interface StaleRef {
  line: number;
  text: string;
}

export interface ReleaseState {
  schemaVersion: 1;
  publishedStable: string;
  maintenanceSeries: string[];
}

export declare const CURRENT_FILES: string[];
export declare const MUST_SHOW_STABLE: string[];
export declare const MUST_SHOW_CURRENT: string[];
export declare const SOURCE_TRACKING_FILES: string[];
export declare const STRIP_ALLOWLIST: string[];

export declare function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
};
export declare function isPrereleaseVersion(version: string): boolean;
export declare function isStableReleaseTag(tag: string): boolean;
export declare function stripAllowed(content: string): string;
export declare function findStaleRefs(content: string, baseline: string): StaleRef[];
export declare function validateReleaseState(state: unknown): string[];
export declare function readReleaseState(): ReleaseState;
export declare function readSourceVersion(): string;
export declare function readCurrentVersion(): string;
export declare function readPublishedStable(): string;
export declare function checkParity(overrides?: {
  sourceVersion?: string;
  releaseState?: unknown;
  files?: Record<string, string>;
}): {
  source: string | undefined;
  stable: string | undefined;
  current: string | undefined;
  failures: string[];
};
