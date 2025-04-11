import { createSuccessDetail, UnlikePostRequest } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Unlike Controller
 * Handles unliking a previously liked post
 */
export class UnlikeController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Unlike a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as UnlikePostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'like', // Use 'like' for rate limiting since it's the same action type
        async (target) => {
          // Unlike the post
          const unlikeResult = await this.postService.unlikePost(
            request.platform, // Platform of the post being unliked
            target.userId,
            request.postId,
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: request.postId,
              success: unlikeResult.success,
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
