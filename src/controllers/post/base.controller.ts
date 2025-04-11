import {
  ApiErrorCode,
  createEnhancedErrorResponse,
  createErrorDetail,
  createMultiStatusResponse,
  createSuccessDetail,
  PlatformError,
  PlatformName
} from '@crosspost/types';
import type { StatusCode } from 'hono/utils/http-status';
import { Context } from '../../../deps.ts';
import { getEnv } from '../../config/env.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { MediaCache } from '../../utils/media-cache.utils.ts';
import { getPostDelay } from '../../utils/spam-detection.utils.ts';

/**
 * Base Post Controller
 * Contains common functionality for all post-related controllers
 */
export abstract class BasePostController {
  protected postService: PostService;
  protected rateLimitService: RateLimitService;
  protected activityTrackingService: ActivityTrackingService;
  protected authService: AuthService;
  protected mediaCache: MediaCache;

  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    this.postService = postService;
    this.rateLimitService = rateLimitService;
    this.activityTrackingService = activityTrackingService;
    this.authService = authService;
    this.mediaCache = MediaCache.getInstance(); // MediaCache remains a singleton for now
  }

  /**
   * Verify platform access for a user
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param c Optional Hono context for response (for backward compatibility)
   * @returns Object with success flag and error details if applicable
   */
  protected async verifyAccess(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<{ success: boolean; errorDetail?: ReturnType<typeof createErrorDetail> }> {
    try {
      // Check if the NEAR account has access to this platform and userId
      const hasAccess = await this.authService.hasAccess(signerId, platform, userId);

      if (!hasAccess) {
        throw new Error(`No connected ${platform} account found for user ID ${userId}`);
      }

      return { success: true };
    } catch (error) {
      // Create a standardized error for unauthorized access
      const errorDetail = createErrorDetail(
        error instanceof Error
          ? error.message
          : `No connected ${platform} account found for user ID ${userId}`,
        ApiErrorCode.UNAUTHORIZED,
        true, // Recoverable by connecting the account
        platform,
        userId,
      );
      return { success: false, errorDetail };
    }
  }

  /**
   * Check rate limits for a specific action
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param action Action to check rate limits for
   * @returns Object with success flag and error details if applicable
   */
  protected async checkRateLimits(
    platform: PlatformName,
    userId: string,
    action: string,
  ): Promise<{ success: boolean; errorDetail?: ReturnType<typeof createErrorDetail> }> {
    const canPerform = await this.rateLimitService.canPerformAction(platform, action);
    if (canPerform) {
      return { success: true };
    }

    const errorDetail = createErrorDetail(
      `Rate limit reached for ${platform}. Please try again later.`,
      ApiErrorCode.RATE_LIMITED,
      true, // Recoverable by waiting
      platform,
      userId,
    );

    return { success: false, errorDetail };
  }

  /**
   * Process multiple targets for an operation
   * @param signerId NEAR account ID
   * @param targets Array of operation targets
   * @param action Action type for rate limiting
   * @param processor Function to process each target
   * @returns Object with success results and error details
   */
  protected async processMultipleTargets<T extends { platform: PlatformName; userId: string }>(
    signerId: string,
    targets: T[],
    action: string,
    processor: (target: T, index: number) => Promise<any>
  ): Promise<{
    successResults: ReturnType<typeof createSuccessDetail>[];
    errorDetails: ReturnType<typeof createErrorDetail>[]
  }> {
    const successResults: ReturnType<typeof createSuccessDetail>[] = [];
    const errorDetails: ReturnType<typeof createErrorDetail>[] = [];

    // Initialize media cache for this operation
    this.mediaCache.clearCache();

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        // Verify platform access
        const accessResult = await this.verifyAccess(signerId, target.platform, target.userId);
        if (!accessResult.success && accessResult.errorDetail) {
          errorDetails.push(accessResult.errorDetail);
          continue;
        }

        // Check rate limits
        const rateLimitResult = await this.checkRateLimits(target.platform, target.userId, action);
        if (!rateLimitResult.success && rateLimitResult.errorDetail) {
          errorDetails.push(rateLimitResult.errorDetail);
          continue;
        }

        // Process the target
        const result = await processor(target, i);
        successResults.push(result);

        // Add a small delay between operations to avoid spam detection
        if (i < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, getPostDelay(target.platform)));
        }
      } catch (error) {
        errorDetails.push(
          createErrorDetail(
            error instanceof Error ? error.message : 'Unknown error',
            ApiErrorCode.PLATFORM_ERROR,
            false,
            target.platform,
            target.userId,
            error instanceof Error ? { errorStack: error.stack } : undefined
          )
        );
      }
    }

    // Clear the media cache after all targets are processed
    this.mediaCache.clearCache();

    return { successResults, errorDetails };
  }

  /**
   * Create appropriate response based on operation results
   * @param c Hono context
   * @param successResults Array of successful operations
   * @param errorDetails Array of error details
   * @returns HTTP response
   */
  protected createMultiStatusResponse(
    c: Context,
    successResults: ReturnType<typeof createSuccessDetail>[],
    errorDetails: ReturnType<typeof createErrorDetail>[]
  ): Response {
    // Create a multi-status response
    const response = createMultiStatusResponse(successResults, errorDetails);

    // Determine appropriate status code
    let statusCode = 200;
    if (successResults.length === 0 && errorDetails.length > 0) {
      // Complete failure - use appropriate status code based on error type
      const firstError = errorDetails[0];
      switch (firstError.errorCode) {
        case ApiErrorCode.RATE_LIMITED:
          statusCode = 429;
          break;
        case ApiErrorCode.UNAUTHORIZED:
          statusCode = 401;
          break;
        case ApiErrorCode.CONTENT_POLICY_VIOLATION:
          statusCode = 400;
          break;
        case ApiErrorCode.PLATFORM_ERROR:
          statusCode = 500;
          break;
        default:
          statusCode = 400;
      }
    } else if (successResults.length > 0 && errorDetails.length > 0) {
      // Partial success - use 207 Multi-Status
      statusCode = 207;
    }

    // Return the response with appropriate status code
    c.status(statusCode as StatusCode);
    return c.json(response);
  }

  /**
   * Handle errors from platform operations
   * @param error Error to handle
   * @param c Hono context for response
   * @param platform Platform name (for generic errors)
   * @param userId User ID on the platform (for generic errors)
   */
  protected handleError(
    error: unknown,
    c: Context,
    platform?: PlatformName,
    userId?: string,
  ): void {
    console.error(`Error in ${this.constructor.name}:`, error);

    // Handle platform-specific errors
    if (error instanceof PlatformError) {
      c.status((error.status || 500) as StatusCode);
      c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error.message,
            error.code,
            error.recoverable,
            error.platform,
            error.userId,
            error.details,
          ),
        ]),
      );
      return;
    }

    // Handle generic errors
    c.status(500);
    c.json(
      createEnhancedErrorResponse([
        createErrorDetail(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          ApiErrorCode.INTERNAL_ERROR,
          false,
          platform,
          userId,
        ),
      ]),
    );
  }
}
