import { Context } from '../../../deps.ts';
import { createSuccessDetail, ReplyToPostRequest } from '@crosspost/types';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Reply Controller
 * Handles replying to an existing post
 */
export class ReplyController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Reply to an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as ReplyToPostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'reply',
        async (target) => {
          // Reply to the post
          const result = await this.postService.replyToPost(
            request.platform, // Platform of the post being replied to
            target.userId,
            request.postId,
            request.content,
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            target.platform,
            target.userId,
            result.id,
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: result.id,
              postUrl: result.url || `https://twitter.com/i/web/status/${result.id}`,
              createdAt: result.createdAt,
              inReplyToId: request.postId,
            },
          );
        },
      );

      // Create a multi-status response using the base controller method
      return this.createMultiStatusResponse(c, successResults, errorDetails);
    } catch (error) {
      this.handleError(error, c);
      return c.res;
    }
  }
}
