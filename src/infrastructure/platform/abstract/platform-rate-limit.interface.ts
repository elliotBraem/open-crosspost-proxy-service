/**
 * Platform Rate Limit Interface
 * Defines the common interface for platform-specific rate limit operations
 */

import { RateLimitStatus } from '@crosspost/types';

export interface PlatformRateLimit {
  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (if applicable)
   * @returns The rate limit status
   */
  getRateLimitStatus(endpoint: string, version?: string): Promise<RateLimitStatus | null>;

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(rateLimitStatus: RateLimitStatus | null): boolean;

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(rateLimitStatus: RateLimitStatus | null): boolean;

  /**
   * Get all rate limit statuses for the platform
   * @returns All rate limit statuses
   */
  getAllRateLimits(): Promise<Record<string, RateLimitStatus>>;

  /**
   * Get the endpoint for a specific action
   * @param action The action to get the endpoint for (e.g., 'post', 'like')
   * @returns The endpoint and version
   */
  getEndpointForAction(action: string): { endpoint: string; version?: string } | null;
}
