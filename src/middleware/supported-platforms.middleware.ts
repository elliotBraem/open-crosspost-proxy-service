import { ApiError, ApiErrorCode, Platform, PlatformName } from '@crosspost/types';
import { Context, Next } from '../../deps.ts';

/**
 * Check if a string is a valid platform name
 * @param platform The platform name to check
 * @returns True if the platform is supported
 */
export function isSupportedPlatform(platform: string): platform is PlatformName {
  return Object.values(Platform).includes(platform as Platform);
}

/**
 * Platform Middleware
 * Validates that the platform parameter is supported and adds it to the context
 */
export class PlatformMiddleware {
  /**
   * Validate that the platform parameter is supported
   * @returns Middleware function
   */
  static validatePlatform() {
    return async (c: Context, next: Next) => {
      const platform = c.req.param('platform');

      if (!platform) {
        throw new ApiError(
          'Platform parameter is required',
          ApiErrorCode.VALIDATION_ERROR,
          400,
        );
      }

      if (!isSupportedPlatform(platform)) {
        throw new ApiError(
          `Unsupported platform: ${platform}`,
          ApiErrorCode.VALIDATION_ERROR,
          400,
          { platform },
        );
      }

      // Add the validated platform to the context variables
      c.set('platform', platform as PlatformName);

      // Continue to the next middleware or route handler
      await next();
    };
  }

  /**
   * Get the validated platform from the context
   * @param c The Hono context
   * @returns The validated platform
   */
  static getPlatform(c: Context): PlatformName {
    return c.get('platform');
  }
}
