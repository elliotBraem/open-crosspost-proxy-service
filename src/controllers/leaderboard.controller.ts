import { Context } from '../../deps.ts';
import { getEnv } from '../config/env.ts';
import {
  ActivityTrackingService,
  PlatformAccountActivity,
  TimePeriod,
} from '../domain/services/activity-tracking.service.ts';
import { PlatformName } from '@crosspost/types';

/**
 * Leaderboard Controller
 * Handles HTTP requests for leaderboard-related operations
 */
export class LeaderboardController {
  private activityTrackingService: ActivityTrackingService;

  constructor() {
    const env = getEnv();
    this.activityTrackingService = new ActivityTrackingService(env);
  }

  /**
   * Get leaderboard
   * @param c The Hono context
   * @returns HTTP response
   */
  async getLeaderboard(c: Context): Promise<Response> {
    try {
      // Parse query parameters
      const limit = parseInt(c.req.query('limit') || '10');
      const offset = parseInt(c.req.query('offset') || '0');
      const timePeriodParam = c.req.query('timeframe') || TimePeriod.ALL_TIME;
      const platform = c.req.query('platform') as PlatformName | undefined;

      // Validate time period
      let timePeriod: TimePeriod;
      if (Object.values(TimePeriod).includes(timePeriodParam as TimePeriod)) {
        timePeriod = timePeriodParam as TimePeriod;
      } else {
        timePeriod = TimePeriod.ALL_TIME;
      }

      // Get leaderboard data
      let leaderboard;
      let total;

      if (platform) {
        // Get platform-specific leaderboard
        leaderboard = await this.activityTrackingService.getPlatformLeaderboard(
          platform,
          limit,
          offset,
          timePeriod,
        );
        total = await this.activityTrackingService.getTotalPlatformAccounts(platform, timePeriod);
      } else {
        // Get global leaderboard
        leaderboard = await this.activityTrackingService.getLeaderboard(limit, offset, timePeriod);
        total = await this.activityTrackingService.getTotalAccounts(timePeriod);
      }

      // Return the result
      return c.json({
        data: {
          entries: leaderboard,
          pagination: {
            total,
            limit,
            offset,
          },
          timeframe: timePeriod,
          platform,
        },
      });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
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
   * Get account activity
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAccountActivity(c: Context): Promise<Response> {
    try {
      const signerId = c.req.param('signerId');
      const platform = c.req.query('platform') as PlatformName | undefined;

      let activity;
      if (platform) {
        // Get platform-specific account activity
        activity = await this.activityTrackingService.getPlatformAccountActivity(
          signerId,
          platform,
        );
      } else {
        // Get global account activity
        activity = await this.activityTrackingService.getAccountActivity(signerId);
      }

      if (!activity) {
        return c.json({
          error: {
            type: 'not_found',
            message: 'Account activity not found',
            status: 404,
          },
        }, 404);
      }

      // Return the result
      return c.json({
        data: activity,
      });
    } catch (error) {
      console.error('Error getting account activity:', error);
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
   * Get account posts
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAccountPosts(c: Context): Promise<Response> {
    try {
      const signerId = c.req.param('signerId');
      const platform = c.req.query('platform') as PlatformName | undefined;
      const limit = parseInt(c.req.query('limit') || '10');
      const offset = parseInt(c.req.query('offset') || '0');

      let posts;
      if (platform) {
        // Get platform-specific account posts
        posts = await this.activityTrackingService.getAccountPlatformPosts(
          signerId,
          platform,
          limit,
          offset,
        );
      } else {
        // Get all account posts
        posts = await this.activityTrackingService.getAccountPosts(signerId, limit, offset);
      }

      // Return the result
      return c.json({
        data: {
          posts,
          pagination: {
            limit,
            offset,
          },
          platform,
        },
      });
    } catch (error) {
      console.error('Error getting account posts:', error);
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
