import { CreatePostRequest, createSuccessDetail } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { addContentVariation } from '../../utils/spam-detection.utils.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Create Post Controller
 * Handles creating new posts, potentially across multiple platforms
 */
export class CreateController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Create a new post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as CreatePostRequest;

      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'post',
        async (target, index) => {
          // Add content variation to avoid duplicate content detection
          const modifiedContent = addContentVariation(request.content, index);

          // Create the post
          const result = await this.postService.createPost(
            target.platform,
            target.userId,
            modifiedContent,
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            target.platform,
            target.userId,
            result.id, // The post ID from the platform
          );

          // Return success detail
          return createSuccessDetail(
            target.platform,
            target.userId,
            {
              postId: result.id,
              postUrl: result.url,
              createdAt: result.createdAt,
              threadIds: result.threadIds,
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
