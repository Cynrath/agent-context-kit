export interface StaleRef {
  line: number;
  text: string;
}

export declare const CURRENT_FILES: string[];
export declare const MUST_SHOW_CURRENT: string[];
export declare const STRIP_ALLOWLIST: string[];

export declare function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
};
export declare function stripAllowed(content: string): string;
export declare function findStaleRefs(content: string, current: string): StaleRef[];
export declare function readCurrentVersion(): string;
export declare function checkParity(): { current: string; failures: string[] };
