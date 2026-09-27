import type { Response } from 'express';
import type { ApiResponse, ApiErrorResponse } from '@sentinelkey/shared-types';

/** Send a successful JSON response */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, message?: string): void {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

/** Send an error JSON response */
export function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (details) body.error.details = details;
  res.status(statusCode).json(body);
}

/**
 * Normalize a thrown value into a status/code/message for error responses.
 * Handles Errors with optional statusCode/code, plus non-Error thrown values.
 */
export function extractError(
  err: unknown,
  fallbackCode = 'INTERNAL_ERROR',
  fallbackMessage = 'Internal server error',
  fallbackStatusCode = 500,
): { statusCode: number; code: string; message: string } {
  const e = (err ?? {}) as { statusCode?: unknown; code?: unknown; message?: unknown };
  return {
    statusCode: typeof e.statusCode === 'number' ? e.statusCode : fallbackStatusCode,
    code: typeof e.code === 'string' ? e.code : fallbackCode,
    message: typeof e.message === 'string' ? e.message : fallbackMessage,
  };
}
