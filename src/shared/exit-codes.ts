/**
 * Stable CLI exit-code taxonomy frozen by ADR-0007.
 *
 * - 0 success / threshold passed
 * - 1 findings exceeded configured CI threshold
 * - 2 invalid CLI usage or invalid config
 * - 3 environment/repository error
 * - 4 security boundary violation blocked
 * - 5 internal unexpected failure
 */
export const EXIT_CODES = Object.freeze({
  ok: 0,
  thresholdExceeded: 1,
  usage: 2,
  environment: 3,
  securityBoundary: 4,
  internal: 5,
} as const);

export type ExitCodeValue = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
