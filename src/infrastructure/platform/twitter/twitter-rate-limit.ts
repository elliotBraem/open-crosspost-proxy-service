import { TwitterClient } from './twitter-client.ts';
import { Env } from '../../../config/env.ts';
import { RateLimitStatus } from '@crosspost/types';
import { PlatformRateLimit } from '../abstract/platform-rate-limit.interface.ts';

/**
 * Twitter Rate Limit
 * Implements the PlatformRateLimit interface for Twitter
 */
export class TwitterRateLimit implements PlatformRateLimit {
  private twitterClient: TwitterClient;
  private actionEndpointMap: Record<string, { endpoint: string; version: 'v1' | 'v2' }>;

  constructor(env: Env, twitterClient: TwitterClient) {
    this.twitterClient = twitterClient;

    // Map common actions to their corresponding endpoints
    this.actionEndpointMap = {
      post: { endpoint: '/2/tweets', version: 'v2' },
      like: { endpoint: '/2/users/:id/likes', version: 'v2' },
      retweet: { endpoint: '/2/users/:id/retweets', version: 'v2' },
      media: { endpoint: 'media/upload', version: 'v1' },
      user: { endpoint: '/2/users/me', version: 'v2' },
      timeline: { endpoint: '/2/users/:id/tweets', version: 'v2' },
    };
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   * @returns The rate limit status
   */
  async getRateLimitStatus(
    endpoint: string,
    version: 'v1' | 'v2' = 'v2',
  ): Promise<RateLimitStatus | null> {
    try {
      const rateLimitData = await this.twitterClient.getRateLimitStatus(endpoint, version);

      if (!rateLimitData) {
        return null;
      }

      // Calculate resetSeconds from reset timestamp
      const resetDate = new Date(rateLimitData.reset * 1000);
      const now = new Date();
      const resetSeconds = Math.max(0, Math.floor((resetDate.getTime() - now.getTime()) / 1000));

      return {
        limit: rateLimitData.limit,
        remaining: rateLimitData.remaining,
        reset: resetDate.toISOString(), // Convert to ISO string as required by RateLimitStatus
        endpoint,
        resetSeconds,
      };
    } catch (error) {
      console.error('Error getting Twitter rate limit status:', error);
      return null;
    }
  }

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(rateLimitStatus: RateLimitStatus | null): boolean {
    if (!rateLimitStatus) return false;
    return this.twitterClient.isRateLimited(rateLimitStatus);
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(rateLimitStatus: RateLimitStatus | null): boolean {
    if (!rateLimitStatus) return true;
    return this.twitterClient.isRateLimitObsolete(rateLimitStatus);
  }

  /**
   * Get all rate limit statuses
   * @returns All rate limit statuses
   */
  async getAllRateLimits(): Promise<Record<string, RateLimitStatus>> {
    try {
      // Common endpoints to check
      const endpoints = {
        v2: [
          '/2/tweets',
          '/2/users/me',
          '/2/users/:id/tweets',
          '/2/users/:id/likes',
          '/2/users/:id/retweets',
        ],
        v1: [
          'statuses/update',
          'statuses/retweet/:id',
          'favorites/create',
          'favorites/destroy',
          'media/upload',
        ],
      };

      const rateLimits: Record<string, RateLimitStatus> = {};

      // Get rate limits for v2 endpoints
      for (const endpoint of endpoints.v2) {
        const status = await this.getRateLimitStatus(endpoint, 'v2');
        if (status) {
          rateLimits[`v2:${endpoint}`] = status;
        }
      }

      // Get rate limits for v1 endpoints
      for (const endpoint of endpoints.v1) {
        const status = await this.getRateLimitStatus(endpoint, 'v1');
        if (status) {
          rateLimits[`v1:${endpoint}`] = status;
        }
      }

      return rateLimits;
    } catch (error) {
      console.error('Error getting all Twitter rate limits:', error);
      return {};
    }
  }

  /**
   * Get the endpoint for a specific action
   * @param action The action to get the endpoint for (e.g., 'post', 'like')
   * @returns The endpoint and version
   */
  getEndpointForAction(action: string): { endpoint: string; version: 'v1' | 'v2' } | null {
    return this.actionEndpointMap[action] || null;
  }
}
