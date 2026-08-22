export {
  type ConfigError,
  type ConfigErrorCode,
  type ConfigErrorLocation,
  nearestKey,
} from "./errors.js";
export { ackitConfigJsonSchema } from "./json-schema.js";
export {
  applyLayers,
  configDigest,
  type FailedConfig,
  type LoadConfigOptions,
  type LoadedConfig,
  loadAckitConfig,
  stableStringify,
} from "./load.js";
export {
  type AckitConfig,
  type AckitConfigLayer,
  AckitConfigSchema,
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG,
} from "./schema.js";
