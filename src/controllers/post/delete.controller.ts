import { createSuccessDetail, DeletePostRequest } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Delete Post Controller
 * Handles deleting existing posts
 */
export class DeleteController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Delete posts
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as DeletePostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'delete',
        async (target) => {
          // Find posts for this target
          const targetPosts = request.posts.filter(
            (post) => post.platform === target.platform && post.userId === target.userId,
          );

          if (targetPosts.length === 0) {
            console.log(`No posts found for target ${target.platform}:${target.userId}`);
            return null; // Skip this target if no matching posts
          }

          // Process the first matching post (we could process all, but for simplicity let's do one)
          const post = targetPosts[0];

          // Delete the post
          const deleteResult = await this.postService.deletePost(
            post.platform,
            post.userId,
            post.postId,
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: post.postId,
              success: deleteResult.success,
            },
          );
        },
      );

      // Filter out null results (targets with no matching posts)
      const filteredResults = successResults.filter((result) => result !== null);

      return this.createMultiStatusResponse(c, filteredResults, errorDetails);
    } catch (error) {
      this.handleError(error, c);
      return c.res;
    }
  }
}
