import { randomBytes } from "node:crypto";

/**
 * Generates a 256-bit session token encoded as base64url (43 chars, no pad).
 * Used for Browser Companion authentication (ADR-0025 §3).
 */
export function generateBrowserToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Validates that a token looks like base64url 32B (43 chars, optional pad stripped).
 * Rejects query-string or non-base64url characters.
 */
export function isValidTokenFormat(token: string): boolean {
  if (token.length < 32 || token.length > 50) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
}
