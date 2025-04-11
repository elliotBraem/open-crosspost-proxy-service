import {
  ApiErrorCode,
  createEnhancedErrorResponse,
  createErrorDetail,
  PlatformError,
  PlatformName,
} from '@crosspost/types';
import type { StatusCode } from 'hono/utils/http-status';
import { Context } from '../deps.ts';

/**
 * Base Controller
 * Contains common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Handle errors from platform operations
   * @param error Error to handle
   * @param c Hono context for response
   * @param platform Platform name (for generic errors)
   * @param userId User ID on the platform (for generic errors)
   */
  protected handleError(
    error: unknown,
    c: Context,
    platform?: PlatformName,
    userId?: string,
  ): void {
    console.error(`Error in ${this.constructor.name}:`, error);

    // Handle platform-specific errors
    if (error instanceof PlatformError) {
      c.status((error.status || 500) as StatusCode);
      c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error.message,
            error.code,
            error.recoverable,
            error.platform,
            error.userId,
            error.details,
          ),
        ]),
      );
      return;
    }

    // Handle generic errors
    c.status(500);
    c.json(
      createEnhancedErrorResponse([
        createErrorDetail(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          ApiErrorCode.INTERNAL_ERROR,
          false,
          platform,
          userId,
        ),
      ]),
    );
  }
}
