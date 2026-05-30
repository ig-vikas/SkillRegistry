import type { ApiEnvelope, ApiError, PaginatedMeta } from '@skillregistry/core';

export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

/**
 * Build success API envelope.
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns API envelope
 */
export function ok<T>(
  data: T,
  meta: PaginatedMeta | Record<string, unknown> | null = null,
): ApiEnvelope<T> {
  return { success: true, data, error: null, meta };
}

/**
 * Build error API envelope.
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status
 * @returns Status and envelope
 */
export function fail(
  code: string,
  message: string,
  status: ErrorStatus,
): { status: ErrorStatus; body: ApiEnvelope<null> } {
  const error: ApiError = { code, message };
  return {
    status,
    body: { success: false, data: null, error, meta: null },
  };
}
