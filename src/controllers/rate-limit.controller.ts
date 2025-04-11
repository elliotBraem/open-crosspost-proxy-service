import { PlatformName } from '@crosspost/types';
import { Context } from '../../deps.ts';
import { RateLimitService } from '../domain/services/rate-limit.service.ts';
import { UsageRateLimitMiddleware } from '../middleware/usage-rate-limit.middleware.ts';
import { PrefixedKvStore } from '../utils/kv-store.utils.ts';

/**
 * Rate Limit Controller
 * Handles HTTP requests for rate limit-related operations
 */
export class RateLimitController {
  private rateLimitService: RateLimitService;

  constructor(rateLimitService: RateLimitService) {
    this.rateLimitService = rateLimitService;
  }

  /**
   * Get rate limit status for a specific endpoint
   * @param c The Hono context
   * @returns HTTP response
   */
  async getRateLimitStatus(c: Context): Promise<Response> {
    try {
      // Get parameters from the request
      const platform = c.req.param('platform') as PlatformName;
      const endpoint = c.req.param('endpoint');
      const version = c.req.query('version');

      // Get the rate limit status
      const status = await this.rateLimitService.getRateLimitStatus(
        platform,
        endpoint,
        version,
      );

      // Return the result
      return c.json({ data: status });
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Get all rate limits
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAllRateLimits(c: Context): Promise<Response> {
    try {
      // Get platform from the request
      const platform = c.req.param('platform') as PlatformName;

      // Get all rate limits for the platform
      const limits = await this.rateLimitService.getAllRateLimits(platform);

      // Return the result
      return c.json({ data: limits });
    } catch (error) {
      console.error('Error getting all rate limits:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Get usage rate limit status
   * @param c The Hono context
   * @returns HTTP response
   */
  async getUsageRateLimit(c: Context): Promise<Response> {
    try {
      // Get NEAR account ID from context (set by AuthMiddleware.validateNearSignature)
      const signerId = c.get('signerId') as string;

      if (!signerId) {
        return c.json({
          error: {
            type: 'authentication_error',
            message: 'NEAR account ID not found in context',
            status: 401,
          },
        }, 401);
      }

      // Get endpoint from the request
      const endpoint = c.req.param('endpoint') || 'post';

      // Get the current configuration
      const config = UsageRateLimitMiddleware.getConfig();

      // Get the start of the current day
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      // Calculate next reset time (start of next day)
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const resetTime = nextDay.getTime();

      // Get current rate limit record
      const kvStore = new PrefixedKvStore(['usage_rate_limit']);
      const key = [signerId, endpoint];
      const record = await kvStore.get<{
        signerId: string;
        endpoint: string;
        count: number;
        resetTimestamp: number;
      }>(key);

      // If no record exists, create a default response
      if (!record) {
        return c.json({
          data: {
            signerId,
            endpoint,
            limit: config.maxPostsPerDay,
            remaining: config.maxPostsPerDay,
            reset: Math.floor(resetTime / 1000),
          },
        });
      }

      // Return the rate limit status
      return c.json({
        data: {
          signerId,
          endpoint,
          limit: config.maxPostsPerDay,
          remaining: Math.max(0, config.maxPostsPerDay - record.count),
          reset: Math.floor(resetTime / 1000),
        },
      });
    } catch (error) {
      console.error('Error getting usage rate limit:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }
}
