import { ApiError, ApiErrorCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';

/**
 * Authentication middleware for Hono
 * Validates NEAR Signature
 */
export class AuthMiddleware {
  private static nearAuthService: NearAuthService;

  /**
   * Initialize the middleware with dependencies
   * @param nearAuthService The NEAR authentication service
   */
  static initialize(nearAuthService: NearAuthService) {
    AuthMiddleware.nearAuthService = nearAuthService;
  }

  /**
   * Validate NEAR signature middleware
   * @returns Middleware handler
   * @throws {ApiError} If authentication fails
   */
  static validateNearSignature(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        if (!AuthMiddleware.nearAuthService) {
          throw new ApiError(
            'NearAuthService not initialized',
            ApiErrorCode.INTERNAL_ERROR,
            500,
          );
        }

        // Extract and validate NEAR auth data using the service
        const { signerId } = await AuthMiddleware.nearAuthService.extractAndValidateNearAuth(c);

        // Set the NEAR account ID in the context for use in controllers
        c.set('signerId', signerId);

        await next();
      } catch (error) {
        // If it's already an ApiError, rethrow it
        if (error instanceof ApiError) {
          throw error;
        }
        // Otherwise wrap it in an ApiError
        throw new ApiError(
          'NEAR authentication failed',
          ApiErrorCode.UNAUTHORIZED,
          401,
          { originalError: error instanceof Error ? error.message : String(error) },
        );
      }
    };
  }
}
