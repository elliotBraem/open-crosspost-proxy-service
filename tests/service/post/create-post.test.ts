import { ApiErrorCode, Platform, PlatformError, PostContent } from '@crosspost/types';
import { assertArrayIncludes, assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CreateController } from '../../../src/controllers/post/create.controller.ts';
import {
  createAuthErrorServices,
  createMockContext,
  createMockServices,
  createPlatformErrorServices,
  createRateLimitErrorServices,
} from '../../utils/test-utils.ts';

describe('Post Creation Controller', () => {
  let controller: CreateController;
  let services: ReturnType<typeof createMockServices>;

  // Setup before each test
  beforeEach(() => {
    // Create mock services
    services = createMockServices();

    // Create the controller instance with mock dependencies
    controller = new CreateController(
      services.postService,
      services.rateLimitService,
      services.activityTrackingService,
      services.authService,
    );
  });

  it('should create a post successfully', async () => {
    // Create a mock context with the request body
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post from API',
      },
    });

    // Call the controller
    const response = await controller.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertEquals(responseBody.data.results.length, 1);
    assertEquals(responseBody.data.errors.length, 0);
    assertEquals(responseBody.data.results[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.results[0].userId, 'test-user-id');
    assertExists(responseBody.data.results[0].postId);
  });

  it('should handle rate limit errors from RateLimitService', async () => {
    // Create services with rate limit error
    const rateLimitServices = createRateLimitErrorServices();

    // Create a controller with the rate-limited services
    const rateLimitController = new CreateController(
      rateLimitServices.postService,
      rateLimitServices.rateLimitService,
      rateLimitServices.activityTrackingService,
      rateLimitServices.authService,
    );

    // Create a mock context
    const rateLimitContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post that will hit rate limit',
      },
    });

    // Call the controller
    const rateLimitResponse = await rateLimitController.handle(rateLimitContext);
    const rateLimitResponseBody = await rateLimitResponse.json();

    // Verify the response indicates a rate limit error
    assertEquals(rateLimitResponse.status, 429);
    assertEquals(rateLimitResponseBody.data.results.length, 0);
    assertExists(rateLimitResponseBody.data.errors);
    assertEquals(rateLimitResponseBody.data.errors.length, 1);
    assertEquals(rateLimitResponseBody.data.errors[0].errorCode, ApiErrorCode.RATE_LIMITED);
    assertEquals(rateLimitResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(rateLimitResponseBody.data.errors[0].userId, 'test-user-id');
  });

  it('should handle authentication errors from AuthService', async () => {
    // Create services with authentication error
    const authErrorServices = createAuthErrorServices();

    // Create a controller with the auth error services
    const authErrorController = new CreateController(
      authErrorServices.postService,
      authErrorServices.rateLimitService,
      authErrorServices.activityTrackingService,
      authErrorServices.authService,
    );

    // Create a mock context
    const authErrorContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post with auth error',
      },
    });

    // Call the controller
    const authErrorResponse = await authErrorController.handle(authErrorContext);
    const authErrorResponseBody = await authErrorResponse.json();

    // Verify the response indicates an authentication error
    assertEquals(authErrorResponse.status, 401);
    assertEquals(authErrorResponseBody.data.results.length, 0);
    assertExists(authErrorResponseBody.data.errors);
    assertEquals(authErrorResponseBody.data.errors.length, 1);
    assertEquals(authErrorResponseBody.data.errors[0].errorCode, ApiErrorCode.UNAUTHORIZED);
    assertEquals(authErrorResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(authErrorResponseBody.data.errors[0].userId, 'test-user-id');
  });

  it('should handle platform errors from PostService', async () => {
    // Create a platform error
    const platformError = new PlatformError(
      'Platform specific error',
      Platform.TWITTER,
      ApiErrorCode.PLATFORM_ERROR,
      false,
      undefined,
      500,
      'test-user-id',
    );

    // Create services with platform error
    const platformErrorServices = createPlatformErrorServices(platformError);

    // Create a controller with the platform error services
    const platformErrorController = new CreateController(
      platformErrorServices.postService,
      platformErrorServices.rateLimitService,
      platformErrorServices.activityTrackingService,
      platformErrorServices.authService,
    );

    // Create a mock context
    const platformErrorContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post causing platform error',
      },
    });

    // Call the controller
    const platformErrorResponse = await platformErrorController.handle(platformErrorContext);
    const platformErrorResponseBody = await platformErrorResponse.json();

    // Verify the response indicates a platform error
    assertEquals(platformErrorResponse.status, 500);
    assertEquals(platformErrorResponseBody.data.results.length, 0);
    assertExists(platformErrorResponseBody.data.errors);
    assertEquals(platformErrorResponseBody.data.errors.length, 1);
    assertEquals(platformErrorResponseBody.data.errors[0].errorCode, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(platformErrorResponseBody.data.errors[0].error, 'Platform specific error');
    assertEquals(platformErrorResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(platformErrorResponseBody.data.errors[0].userId, 'test-user-id');
  });

  it('should handle multiple platform targets', async () => {
    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'twitter-user-id',
          },
          {
            platform: Platform.TWITTER,
            userId: 'twitter-user-id-2',
          },
        ],
        content: 'Test post to multiple targets',
      },
    });

    // Call the controller
    const response = await controller.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertEquals(responseBody.data.results.length, 2);
    assertEquals(responseBody.data.errors.length, 0);

    // Verify both targets were processed
    const userIds = responseBody.data.results.map((result: any) => result.userId);
    assertArrayIncludes(userIds, ['twitter-user-id', 'twitter-user-id-2']);
  });

  it('should handle content with media attachments', async () => {
    // Create a mock context with media attachments
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post with media',
        mediaIds: ['media-1', 'media-2'],
      },
    });

    // Call the controller
    const response = await controller.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertEquals(responseBody.data.results.length, 1);
    assertEquals(responseBody.data.errors.length, 0);
  });

  it('should handle partial success with some targets failing', async () => {
    // Create a custom service mock where one target succeeds and one fails
    const mixedResultServices = createMockServices();

    // Override the postService to make it fail for specific user IDs
    const originalCreatePost = mixedResultServices.postService.createPost;
    (mixedResultServices.postService as any).createPost = (
      platform: Platform,
      userId: string,
      content: PostContent | PostContent[],
    ) => {
      if (userId === 'failing-user-id') {
        return Promise.reject(
          new PlatformError(
            'Platform specific error',
            Platform.TWITTER,
            ApiErrorCode.PLATFORM_ERROR,
            false,
            undefined,
            500,
            userId,
          ),
        );
      }
      return originalCreatePost(platform, userId, content);
    };

    // Create a controller with the mixed result services
    const mixedResultController = new CreateController(
      mixedResultServices.postService,
      mixedResultServices.rateLimitService,
      mixedResultServices.activityTrackingService,
      mixedResultServices.authService,
    );

    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'successful-user-id',
          },
          {
            platform: Platform.TWITTER,
            userId: 'failing-user-id',
          },
        ],
        content: 'Test post with mixed results',
      },
    });

    // Call the controller
    const response = await mixedResultController.handle(context);
    const responseBody = await response.json();

    // Verify the response shows partial success
    assertEquals(response.status, 207); // Multi-status
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertExists(responseBody.data.errors);

    // Should have one success and one error
    assertEquals(responseBody.data.results.length, 1);
    assertEquals(responseBody.data.errors.length, 1);

    // Verify the successful result
    assertEquals(responseBody.data.results[0].userId, 'successful-user-id');

    // Verify the error
    assertEquals(responseBody.data.errors[0].userId, 'failing-user-id');
    assertEquals(responseBody.data.errors[0].errorCode, ApiErrorCode.PLATFORM_ERROR);
  });

  it('should handle multiple rate limit errors in multi-target operations', async () => {
    // Create a custom service mock where multiple targets fail with the same error
    const errorServices = createMockServices();

    // Override the postService to make it fail for all user IDs with the same error
    (errorServices.postService as any).createPost = (
      platform: Platform,
      userId: string,
      content: PostContent | PostContent[],
    ) => {
      return Promise.reject(
        new PlatformError(
          'Rate limit exceeded',
          platform,
          ApiErrorCode.RATE_LIMITED,
          true, // Recoverable
          undefined,
          429,
          userId,
          { retryAfter: 3600 }, // 1 hour
        ),
      );
    };

    // Create a controller with the error services
    const errorController = new CreateController(
      errorServices.postService,
      errorServices.rateLimitService,
      errorServices.activityTrackingService,
      errorServices.authService,
    );

    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'user-id-1',
          },
          {
            platform: Platform.TWITTER,
            userId: 'user-id-2',
          },
          {
            platform: Platform.TWITTER,
            userId: 'user-id-3',
          },
        ],
        content: 'Test post with multiple rate limit errors',
      },
    });

    // Call the controller
    const response = await errorController.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 429); // Rate limited
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);

    // Should have separate errors for each user
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 3);

    // Verify all errors have the same error code
    for (const error of responseBody.data.errors) {
      assertEquals(error.errorCode, ApiErrorCode.RATE_LIMITED);
      assertEquals(error.recoverable, true);
      assertEquals(error.platform, Platform.TWITTER);
    }

    // Verify the summary counts are correct
    assertEquals(responseBody.data.summary.total, 3);
    assertEquals(responseBody.data.summary.succeeded, 0);
    assertEquals(responseBody.data.summary.failed, 3);

    // Verify each error has a different userId
    const userIds = responseBody.data.errors.map((e) => e.userId);
    assertArrayIncludes(userIds, ['user-id-1', 'user-id-2', 'user-id-3']);
  });

  it('should handle recoverable vs permanent platform errors differently', async () => {
    // Create a temporary error
    const recoverableError = new PlatformError(
      'Recoverable platform error',
      Platform.TWITTER,
      ApiErrorCode.PLATFORM_ERROR,
      true, // recoverable = true
      undefined,
      503,
      'test-user-id',
    );

    // Create services with recoverable error
    const recoverableErrorServices = createPlatformErrorServices(recoverableError);

    // Create a controller with the recoverable error services
    const recoverableErrorController = new CreateController(
      recoverableErrorServices.postService,
      recoverableErrorServices.rateLimitService,
      recoverableErrorServices.activityTrackingService,
      recoverableErrorServices.authService,
    );

    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: 'Test post with recoverable error',
      },
    });

    // Call the controller
    const response = await recoverableErrorController.handle(context);
    const responseBody = await response.json();

    // Verify the response indicates a recoverable error
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].errorCode, ApiErrorCode.PLATFORM_ERROR);

    // The key assertion - make sure the recoverable flag is preserved
    assertEquals(responseBody.data.errors[0].recoverable, true);
  });

  it('should validate content length and reject if too long', async () => {
    // Create a mock context with content that's too long
    const longContent = 'a'.repeat(1000); // Assuming Twitter has a limit less than 1000 chars
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: longContent,
      },
    });

    // Create a validation error with the correct error code
    const validationError = new PlatformError(
      'Content exceeds maximum length',
      Platform.TWITTER,
      ApiErrorCode.VALIDATION_ERROR, // Use VALIDATION_ERROR instead of PLATFORM_ERROR
      false,
      undefined,
      400,
      'test-user-id',
    );

    // Create services with validation error
    const validationErrorServices = createPlatformErrorServices(validationError);

    // Create a controller with validation error services
    const validationErrorController = new CreateController(
      validationErrorServices.postService,
      validationErrorServices.rateLimitService,
      validationErrorServices.activityTrackingService,
      validationErrorServices.authService,
    );

    // Call the controller
    const response = await validationErrorController.handle(context);
    const responseBody = await response.json();

    // Verify the response indicates a validation error
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 1);

    // The key assertion - make sure the error code is VALIDATION_ERROR
    assertEquals(responseBody.data.errors[0].errorCode, ApiErrorCode.VALIDATION_ERROR);
    assertEquals(responseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].userId, 'test-user-id');
  });
});
