import { createSuccessDetail, LikePostRequest } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Like Controller
 * Handles liking an existing post
 */
export class LikeController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Like a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as LikePostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'like',
        async (target) => {
          // Like the post
          const likeResult = await this.postService.likePost(
            request.platform, // Platform of the post being liked
            target.userId,
            request.postId,
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: request.postId,
              success: likeResult.success,
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
