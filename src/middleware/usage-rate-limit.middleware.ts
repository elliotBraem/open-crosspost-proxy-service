import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import { ApiError, ApiErrorCode } from '@crosspost/types';
import { PrefixedKvStore } from '../utils/kv-store.utils.ts';

/**
 * Configuration for NEAR account rate limiting
 */
export interface UsageRateLimitConfig {
  /**
   * Maximum number of posts allowed per day per NEAR account
   * Default: 10
   */
  maxPostsPerDay: number;
}

/**
 * Rate limit record for a NEAR account
 */
interface UsageRateLimitRecord {
  /**
   * NEAR account ID
   */
  signerId: string;

  /**
   * Endpoint being rate limited
   */
  endpoint: string;

  /**
   * Count of requests made today
   */
  count: number;

  /**
   * Timestamp when the count was last reset
   */
  resetTimestamp: number;
}

/**
 * Usage Rate Limit Middleware
 * Limits the number of requests a NEAR account can make to specific endpoints
 */
export class UsageRateLimitMiddleware {
  private static kvStore: PrefixedKvStore = new PrefixedKvStore(['usage_rate_limit']);

  /**
   * Default configuration
   */
  private static defaultConfig: UsageRateLimitConfig = {
    maxPostsPerDay: 10,
  };

  /**
   * Current configuration
   */
  private static config: UsageRateLimitConfig;

  /**
   * Initialize the middleware with configuration
   * @param config Rate limit configuration
   */
  static initialize(config?: Partial<UsageRateLimitConfig>): void {
    UsageRateLimitMiddleware.config = {
      ...UsageRateLimitMiddleware.defaultConfig,
      ...config,
    };
  }

  /**
   * Get the current configuration
   * @returns Current rate limit configuration
   */
  static getConfig(): UsageRateLimitConfig {
    if (!UsageRateLimitMiddleware.config) {
      UsageRateLimitMiddleware.initialize();
    }
    return UsageRateLimitMiddleware.config;
  }

  /**
   * Update the configuration
   * @param config New configuration (partial)
   */
  static updateConfig(config: Partial<UsageRateLimitConfig>): void {
    UsageRateLimitMiddleware.config = {
      ...UsageRateLimitMiddleware.getConfig(),
      ...config,
    };

    console.log(`Usage Rate Limit Middleware config updated:`, UsageRateLimitMiddleware.config);
  }

  /**
   * Get the start of the current day in milliseconds
   * @returns Timestamp for the start of the current day
   */
  private static getDayStart(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  /**
   * Check and update rate limit for a NEAR account
   * @param signerId NEAR account ID
   * @param endpoint Endpoint being accessed
   * @returns Whether the request is allowed
   */
  private static async checkAndUpdateRateLimit(
    signerId: string,
    endpoint: string,
  ): Promise<{ allowed: boolean; current: number; limit: number; reset: number }> {
    const config = UsageRateLimitMiddleware.getConfig();
    const dayStart = UsageRateLimitMiddleware.getDayStart();
    const key = [signerId, endpoint];

    // Get current rate limit record
    let record = await UsageRateLimitMiddleware.kvStore.get<UsageRateLimitRecord>(key);

    // If no record exists or it's from a previous day, create a new one
    if (!record || record.resetTimestamp < dayStart) {
      record = {
        signerId,
        endpoint,
        count: 0,
        resetTimestamp: dayStart,
      };
    }

    // Check if limit is reached
    const allowed = record.count < config.maxPostsPerDay;

    // If allowed, increment the count
    if (allowed) {
      record.count += 1;
      await UsageRateLimitMiddleware.kvStore.set(key, record);
    }

    // Calculate next reset time (start of next day)
    const nextDay = new Date(dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    const resetTime = nextDay.getTime();

    return {
      allowed,
      current: record.count,
      limit: config.maxPostsPerDay,
      reset: resetTime,
    };
  }

  /**
   * Middleware to limit requests to specific endpoints by NEAR account
   * @param endpoint Endpoint to rate limit (e.g., 'post')
   * @returns Middleware handler
   */
  static limitByNearAccount(endpoint: string): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        // Get NEAR account ID from context (set by AuthMiddleware.validateNearSignature)
        const signerId = c.get('signerId') as string;

        if (!signerId) {
          throw new ApiError(
            'NEAR account ID not found in context',
            ApiErrorCode.UNAUTHORIZED,
            401,
          );
        }

        // Check and update rate limit
        const result = await UsageRateLimitMiddleware.checkAndUpdateRateLimit(signerId, endpoint);

        // If not allowed, return rate limit error
        if (!result.allowed) {
          // Add rate limit headers
          c.header('X-RateLimit-Limit', result.limit.toString());
          c.header('X-RateLimit-Remaining', '0');
          c.header('X-RateLimit-Reset', Math.floor(result.reset / 1000).toString());

          throw new ApiError(
            `Rate limit exceeded for NEAR account ${signerId}. Maximum ${result.limit} requests per day allowed.`,
            ApiErrorCode.RATE_LIMITED,
            429,
            {
              limit: result.limit,
              current: result.current,
              reset: result.reset,
              signerId,
            },
          );
        }

        // Add rate limit headers
        c.header('X-RateLimit-Limit', result.limit.toString());
        c.header('X-RateLimit-Remaining', (result.limit - result.current).toString());
        c.header('X-RateLimit-Reset', Math.floor(result.reset / 1000).toString());

        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          'Error checking rate limit',
          ApiErrorCode.INTERNAL_ERROR,
          500,
          { originalError: error instanceof Error ? error.message : String(error) },
        );
      }
    };
  }
}

// Initialize with default config
UsageRateLimitMiddleware.initialize();
