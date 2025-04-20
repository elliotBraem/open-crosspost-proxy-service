import { ApiErrorCode, PlatformName, RateLimitStatus } from '@crosspost/types';
import { Env } from '../../config/env.ts';
import { createPlatformError, PlatformError } from '../../errors/platform-error.ts';
import { PlatformRateLimit } from '../../infrastructure/platform/abstract/platform-rate-limit.interface.ts';

export class RateLimitService {
  private env: Env;
  private platformRateLimits: Map<PlatformName, PlatformRateLimit>;

  constructor(env: Env, platformRateLimits: Map<PlatformName, PlatformRateLimit>) {
    this.env = env;

    this.platformRateLimits = platformRateLimits;
  }

  /**
   * Get the appropriate platform implementation
   * @param platform The platform name
   * @returns The platform implementation
   */
  private getPlatformRateLimit(platform: PlatformName): PlatformRateLimit {
    const platformRateLimit = this.platformRateLimits.get(platform);

    if (!platformRateLimit) {
      throw createPlatformError(
        ApiErrorCode.PLATFORM_UNAVAILABLE,
        `Unsupported platform: ${platform}`,
        platform,
      );
    }

    return platformRateLimit;
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param platform The platform to check
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (if applicable)
   * @returns The rate limit status
   */
  async getRateLimitStatus(
    platform: PlatformName,
    endpoint: string,
    version?: string,
  ): Promise<RateLimitStatus> {
    try {
      const platformRateLimit = this.getPlatformRateLimit(platform);
      return await platformRateLimit.getRateLimitStatus(endpoint, version);
    } catch (error) {
      console.error(`Error getting rate limit status for ${platform}:`, error);

      if (error instanceof PlatformError) {
        throw error;
      }

      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get rate limit status for ${platform}`,
        platform,
      );
    }
  }

  /**
   * Check if a rate limit has been hit
   * @param platform The platform to check
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(platform: PlatformName, rateLimitStatus: RateLimitStatus | null): boolean {
    if (!rateLimitStatus) return false;
    try {
      const platformRateLimit = this.getPlatformRateLimit(platform);
      return platformRateLimit.isRateLimited(rateLimitStatus);
    } catch (error) {
      console.error(`Error checking if rate limited for ${platform}:`, error);
      // For this method, we'll return false instead of throwing since it's a boolean check
      return false;
    }
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param platform The platform to check
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(platform: PlatformName, rateLimitStatus: RateLimitStatus | null): boolean {
    if (!rateLimitStatus) return true;
    try {
      const platformRateLimit = this.getPlatformRateLimit(platform);
      return platformRateLimit.isRateLimitObsolete(rateLimitStatus);
    } catch (error) {
      console.error(`Error checking if rate limit obsolete for ${platform}:`, error);
      // For this method, we'll return true instead of throwing since it's a boolean check
      return true;
    }
  }

  /**
   * Check if an action is allowed for a specific platform
   * @param platform The platform to check
   * @param action The action to check (default: 'post')
   * @returns True if the action is allowed, false if rate limited
   */
  async canPerformAction(platform: PlatformName, action: string = 'post'): Promise<boolean> {
    try {
      const platformRateLimit = this.getPlatformRateLimit(platform);

      // Get the endpoint for the specified action
      const endpointInfo = platformRateLimit.getEndpointForAction(action);

      if (!endpointInfo) {
        // If we don't have endpoint info for this action, assume it's ok
        console.warn(`No rate limit endpoint defined for ${platform}/${action}`);
        return true;
      }

      // Check rate limits for the endpoint
      const rateLimitStatus = await platformRateLimit.getRateLimitStatus(
        endpointInfo.endpoint,
        endpointInfo.version,
      );

      if (platformRateLimit.isRateLimited(rateLimitStatus)) {
        console.warn(`Rate limit reached for ${platform}/${action}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error checking rate limits for ${platform}/${action}:`, error);

      if (error instanceof PlatformError) {
        // For this method, we'll return true instead of throwing since it's a boolean check
        return true;
      }

      // If we can't check rate limits, assume it's ok to proceed
      return true;
    }
  }

  /**
   * Get all rate limit statuses for a specific platform
   * @param platform The platform to get rate limits for
   * @returns All rate limit statuses for the platform
   */
  async getAllRateLimits(platform: PlatformName): Promise<Record<string, RateLimitStatus>> {
    try {
      const platformRateLimit = this.getPlatformRateLimit(platform);
      return await platformRateLimit.getAllRateLimits();
    } catch (error) {
      console.error(`Error getting all rate limits for ${platform}:`, error);

      if (error instanceof PlatformError) {
        throw error;
      }
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get all rate limits for ${platform}`,
        platform,
      );
    }
  }
}
