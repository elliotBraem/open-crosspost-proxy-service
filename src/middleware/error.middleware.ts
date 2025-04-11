import {
  ApiError,
  ApiErrorCode,
  BaseError,
  createEnhancedErrorResponse,
  createErrorDetail,
  ErrorDetail,
  Platform,
  PlatformError,
} from '@crosspost/types';
import { Context, HTTPException, MiddlewareHandler, Next } from '../../deps.ts';
import type { StatusCode } from 'hono/utils/http-status';
import { getStatusCodeForError } from '../utils/error-handling.utils.ts';

/**
 * Error middleware for Hono
 * @returns Middleware handler
 */
export const errorMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err: unknown) {
      console.error('Error:', err);

      // Handle HTTPException from Hono
      if (err instanceof HTTPException) {
        c.status(err.status);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle our new ApiError
      if (err instanceof ApiError) {
        // Use the status from the error or get it from our map
        const statusCode = err.status || getStatusCodeForError(err.code);
        c.status(statusCode as StatusCode);

        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              undefined,
              undefined,
              err.details,
            ),
          ]),
        );
      }

      // Handle our new PlatformError
      if (err instanceof PlatformError) {
        // Use the status from the error or get it from our map
        const statusCode = err.status || getStatusCodeForError(err.code);
        c.status(statusCode as StatusCode);

        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              err.platform as Platform,
              err.userId,
              err.details,
            ),
          ]),
        );
      }

      // Handle array of PlatformErrors (for multi-status responses)
      if (Array.isArray(err) && err.length > 0 && err[0] instanceof PlatformError) {
        const platformErrors = err as PlatformError[];

        // Use the highest status code from the errors
        const statusCode = Math.max(...platformErrors.map((e) => e.status!));

        // If all errors have the same status code, use that, otherwise use 207 Multi-Status
        const finalStatusCode = platformErrors.every((e) => e.status === statusCode)
          ? statusCode
          : 207;

        c.status(finalStatusCode as StatusCode);

        // Convert platform errors to error details
        const errorDetails: ErrorDetail[] = platformErrors.map((e) =>
          createErrorDetail(
            e.message,
            e.code,
            e.recoverable,
            e.platform as Platform,
            e.userId,
            e.details,
          )
        );

        return c.json(createEnhancedErrorResponse(errorDetails));
      }

      // Handle other BaseError types
      if (err instanceof BaseError) {
        c.status(500);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle standard Error objects
      if (err instanceof Error) {
        c.status(500);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message || 'An unexpected error occurred',
              ApiErrorCode.INTERNAL_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle unknown errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            'An unexpected error occurred',
            ApiErrorCode.UNKNOWN_ERROR,
            false,
            undefined,
            undefined,
          ),
        ]),
      );
    }
  };
};
