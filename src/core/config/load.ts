import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import path from "node:path";
import type { Node as YamlNode } from "yaml";
import { type Document, isMap, isScalar, parseDocument } from "yaml";
import { type ConfigError, type ConfigErrorLocation, nearestKey } from "./errors.js";
import {
  type AckitConfig,
  type AckitConfigLayer,
  AckitConfigSchema,
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG,
} from "./schema.js";

export interface LoadedConfig {
  ok: true;
  config: AckitConfig;
  /** Absolute path of the file that was loaded, or null when defaults were used. */
  sourceFile: string | null;
  digest: string;
}

export interface FailedConfig {
  ok: false;
  errors: ConfigError[];
}

export interface LoadConfigOptions {
  /** Explicit --config path; resolved against cwd when absolute is false. */
  configPath?: string | undefined;
  /** Policy `extends` layer resolved by the policy engine (TASK-0282 seam). */
  policyLayer?: AckitConfigLayer | undefined;
  /** CLI flag overrides (highest precedence). */
  cliLayer?: AckitConfigLayer | undefined;
}

/**
 * Loads ackit.yml (ADR-0004) or falls back to defaults when absent.
 * Merge precedence (deterministic): defaults < config < policy extends < CLI flags.
 */
export async function loadAckitConfig(
  repositoryRoot: string,
  options: LoadConfigOptions = {},
): Promise<LoadedConfig | FailedConfig> {
  const configFile =
    options.configPath !== undefined
      ? path.resolve(repositoryRoot, options.configPath)
      : path.join(repositoryRoot, "ackit.yml");

  let raw: string;
  try {
    raw = await fsp.readFile(configFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (options.configPath !== undefined) {
        return {
          ok: false,
          errors: [
            {
              code: "CFG-FILE-MISSING",
              message: `config file not found: ${options.configPath}`,
            },
          ],
        };
      }
      const merged = applyLayers(DEFAULT_CONFIG, undefined, options.policyLayer, options.cliLayer);
      return {
        ok: true,
        config: merged,
        sourceFile: null,
        digest: configDigest(merged),
      };
    }
    return {
      ok: false,
      errors: [
        {
          code: "CFG-READ-FAILED",
          message: `cannot read config file: ${(error as Error).message}`,
          file: configFile,
        },
      ],
    };
  }

  const document = parseDocument(raw);
  if (document.errors.length > 0) {
    const first = document.errors[0];
    if (!first) {
      return { ok: false, errors: [{ code: "CFG-YAML-SYNTAX", message: "unparsable YAML" }] };
    }
    return {
      ok: false,
      errors: [
        {
          code: "CFG-YAML-SYNTAX",
          message: first.message,
          file: configFile,
          location: offsetToLocation(raw, first.pos?.[0] ?? 0),
        },
      ],
    };
  }

  const parsedUnknown = document.toJS();
  if (typeof parsedUnknown !== "object" || parsedUnknown === null || Array.isArray(parsedUnknown)) {
    return {
      ok: false,
      errors: [
        {
          code: "CFG-INVALID-VALUE",
          message: "config root must be a mapping",
          file: configFile,
          location: { line: 1, column: 1 },
        },
      ],
    };
  }
  const parsed = parsedUnknown as Record<string, unknown>;

  // schemaVersion gate BEFORE full validation so upgrades get a dedicated hint.
  if (parsed["schemaVersion"] !== CONFIG_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        {
          code: "CFG-SCHEMA-VERSION",
          message: `unsupported schemaVersion ${JSON.stringify(parsed["schemaVersion"])}; this build supports ${CONFIG_SCHEMA_VERSION}. Upgrade ACKit or migrate the config.`,
          file: configFile,
          path: ["schemaVersion"],
          received: parsed["schemaVersion"],
        },
      ],
    };
  }

  const unknownKeyErrors = findUnknownKeys(parsed, raw, configFile);
  if (unknownKeyErrors.length > 0) {
    return { ok: false, errors: unknownKeyErrors };
  }

  const validated = AckitConfigSchema.safeParse(parsed);
  if (!validated.success) {
    const errors: ConfigError[] = [];
    for (const issue of validated.error.issues) {
      errors.push({
        code: "CFG-INVALID-VALUE",
        message: issue.message,
        file: configFile,
        location: offsetToLocation(
          raw,
          documentRangeFor(
            document,
            issue.path.filter((segment): segment is string | number => typeof segment !== "symbol"),
          ),
        ),
        path: issue.path.filter(
          (segment): segment is string | number => typeof segment !== "symbol",
        ),
        received: "input" in issue ? safeRepr(issue.input) : undefined,
      });
    }
    return { ok: false, errors };
  }

  const merged = applyLayers(validated.data, parsed, options.policyLayer, options.cliLayer);
  return {
    ok: true,
    config: merged,
    sourceFile: configFile,
    digest: configDigest(merged),
  };
}

/** Deterministic deep merge; arrays replace wholesale. Precedence: later layers win. */
export function applyLayers(
  base: AckitConfig,
  _parsed: Record<string, unknown> | undefined,
  policyLayer?: AckitConfigLayer,
  cliLayer?: AckitConfigLayer,
): AckitConfig {
  let result: AckitConfig = structuredClone(base);
  for (const layer of [policyLayer, cliLayer]) {
    if (layer === undefined) continue;
    result = mergeValue(result, layer as Partial<AckitConfig>) as AckitConfig;
  }
  return result;
}

function mergeValue(target: unknown, patch: unknown): unknown {
  if (
    Array.isArray(patch) ||
    typeof patch !== "object" ||
    patch === null ||
    Array.isArray(target) ||
    typeof target !== "object" ||
    target === null
  ) {
    return structuredClone(patch);
  }
  const output: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    output[key] = key in output ? mergeValue(output[key], value) : structuredClone(value);
  }
  return output;
}

const SECTION_KEYS: Record<string, readonly string[]> = {
  scan: ["include", "exclude", "severityThreshold"],
  limits: ["maxFiles", "maxFileBytes", "maxTotalBytes", "maxDepth", "deadlineMs"],
  instructions: ["enabled", "maxTokenEstimatePerFile"],
  skills: ["enabled"],
  context: ["maxTokens"],
  policy: ["extends", "rulePacks"],
  baseline: [],
  output: ["format"],
  cache: ["enabled"],
  workspaces: ["enabled"],
  profiles: ["extend"],
  readiness: ["weights", "strictThreshold"],
};

const ROOT_KEYS = [
  "schemaVersion",
  "scan",
  "limits",
  "instructions",
  "skills",
  "context",
  "policy",
  "baseline",
  "output",
  "cache",
  "workspaces",
  "profile",
  "profiles",
  "readiness",
];

/**
 * Pre-validation pass that reports every unexpected key with its exact YAML
 * location and a did-you-mean suggestion when one is close enough.
 */
function findUnknownKeys(
  parsed: Record<string, unknown>,
  raw: string,
  configFile: string,
): ConfigError[] {
  const errors: ConfigError[] = [];
  for (const key of Object.keys(parsed)) {
    if (!ROOT_KEYS.includes(key)) {
      errors.push({
        code: "CFG-UNKNOWN-KEY",
        message: `unknown config key '${key}'`,
        file: configFile,
        location: keyLocation(raw, key),
        received: key,
        suggestion: nearestKey(key, ROOT_KEYS),
      });
      continue;
    }
    const value = parsed[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const allowed = SECTION_KEYS[key] ?? [];
      for (const innerKey of Object.keys(value as Record<string, unknown>)) {
        if (!allowed.includes(innerKey)) {
          errors.push({
            code: "CFG-UNKNOWN-KEY",
            message: `unknown key '${innerKey}' inside '${key}'`,
            file: configFile,
            location: keyLocation(raw, innerKey),
            path: [key, innerKey],
            received: innerKey,
            suggestion: nearestKey(innerKey, allowed),
          });
        }
      }
    }
  }
  return errors;
}

function offsetToLocation(source: string, offset: number): ConfigErrorLocation {
  const clamped = Math.max(0, Math.min(offset, source.length));
  let line = 1;
  let column = 1;
  for (let index = 0; index < clamped; index += 1) {
    if (source.charCodeAt(index) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function keyLocation(source: string, key: string): ConfigErrorLocation {
  const pattern = new RegExp(`^[ \\t]*(?:-[ \\t]+)?${escapeRegExp(key)}[ \\t]*:`, "m");
  const match = pattern.exec(source);
  if (match === null || match.index === undefined) {
    return { line: 1, column: 1 };
  }
  return offsetToLocation(source, match.index + match[0].indexOf(key));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function documentRangeFor(
  document: Document.Parsed,
  issuePath: readonly (string | number)[],
): number {
  let node: YamlNode | null = document.contents as YamlNode | null;
  for (const segment of issuePath) {
    if (node && isMap(node)) {
      const pair = node.items.find((item) => {
        const key = item.key;
        return isScalar(key) && String(key.value) === String(segment);
      });
      node = pair !== undefined && pair.value != null ? (pair.value as YamlNode) : null;
    } else if (
      node &&
      typeof node === "object" &&
      "items" in node &&
      Array.isArray((node as { items?: unknown }).items)
    ) {
      const index = typeof segment === "number" ? segment : Number(segment);
      const seqNode = node as unknown as { get(index: number): YamlNode | undefined };
      node = Number.isInteger(index) ? (seqNode.get(index) ?? null) : null;
    } else {
      node = null;
    }
  }
  if (node !== null && typeof node === "object") {
    const range = (node as { range?: unknown }).range;
    if (Array.isArray(range) && typeof range[0] === "number") {
      return range[0];
    }
  }
  return 0;
}

function safeRepr(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined || value === null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unrepresentable]";
  }
}

/** Stable sha256 over canonical JSON (sorted keys) — cache-key input (REQ-BASE-004). */
export function configDigest(config: AckitConfig): string {
  return createHash("sha256").update(stableStringify(config)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
