import { Context } from '../../../deps.ts';
import { createSuccessDetail, RepostRequest } from '@crosspost/types';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Repost Controller
 * Handles reposting an existing post
 */
export class RepostController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Repost an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as RepostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'repost',
        async (target) => {
          // Repost the post
          const repostResult = await this.postService.repost(
            request.platform, // Platform of the post being reposted
            target.userId,
            request.postId,
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            target.platform,
            target.userId,
            repostResult.id,
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: repostResult.id,
              success: repostResult.success,
            },
          );
        },
      );

      return this.createMultiStatusResponse(c, successResults, errorDetails);
    } catch (error) {
      this.handleError(error, c);
      return c.res;
    }
  }
}
