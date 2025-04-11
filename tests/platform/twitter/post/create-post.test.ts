import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { assert, assertEquals, assertInstanceOf, assertThrows, fail } from 'jsr:@std/assert';
import { TwitterCreatePost } from '../../../../src/infrastructure/platform/twitter/post/create.ts';
import {
  TwitterError,
  TwitterErrorCode,
} from '../../../../src/infrastructure/platform/twitter/twitter-error.ts';
import { TwitterClientMock } from '../../../mocks/twitter/twitter-client-mock.ts';
import { ApiErrorCode, MediaContent, Platform, PlatformError, PostContent } from '@crosspost/types';
import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from 'twitter-api-v2';
import { createMockTwitterError } from '../../../utils/twitter-utils.ts';
import { enhanceErrorWithContext } from '../../../../src/utils/error-handling.utils.ts';

// Mock TwitterMedia class for testing
class TwitterMediaMock {
  async uploadMedia(userId: string, media: MediaContent) {
    return { mediaId: `mock-media-id-${Date.now()}` };
  }
}

describe('TwitterCreatePost', () => {
  // Test the createPost method
  describe('createPost', () => {
    it('should successfully create a post', async () => {
      // Setup TwitterClientMock without errors
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Create a post
      const result = await createPost.createPost('test-user-id', { text: 'Test post' });

      // Verify result
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
    });

    it('should successfully create a post with media', async () => {
      // Setup TwitterClientMock without errors
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Create content with media
      const content: PostContent = {
        text: 'Test post with media',
        media: [{ data: 'https://example.com/image.jpg', mimeType: 'image/jpeg' }],
      };

      // Create a post with media
      const result = await createPost.createPost('test-user-id', content);

      // Verify result
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      assert(Array.isArray(result.mediaIds));
    });

    it('should successfully create a thread', async () => {
      // Setup TwitterClientMock without errors
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Create a thread
      const threadContent = [
        { text: 'First tweet in thread' },
        { text: 'Second tweet in thread' },
      ];

      // Create a thread
      const result = await createPost.createPost('test-user-id', threadContent);

      // Verify result
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      assert(Array.isArray(result.threadIds));
      assertEquals(result.threadIds?.length, 2);
    });
  });

  // // Test error handling in createPost
  // describe('createPost error handling', () => {
  //   it('should properly handle and transform rate limit errors', async () => {
  //     // Setup TwitterClientMock with rate_limit error scenario
  //     const twitterClient = new TwitterClientMock({}, 'rate_limit');
  //     const twitterMedia = new TwitterMediaMock();
  //     const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

  //     try {
  //       await createPost.createPost('test-user-id', { text: 'Test post' });
  //       fail('Expected error was not thrown');
  //     } catch (error) {
  //       // Verify error is properly transformed
  //       assertInstanceOf(error, TwitterError);
  //       assertEquals(error.code, ApiErrorCode.RATE_LIMITED);
  //       assertEquals(error.status, 429);
  //       assertEquals(error.platform, Platform.TWITTER);
  //       assertEquals(error.recoverable, true);
  //       assert(error.message.includes('Failed to createPost'));
  //       assert(error.message.includes('Twitter rate limit exceeded'));

  //       // Verify error details
  //       assert(error.details);
  //       assertEquals(error.details.twitterErrorCode, TwitterErrorCode.RATE_LIMIT_EXCEEDED);
  //     }
  //   });

  //   it('should properly handle and transform authentication errors', async () => {
  //     // Setup TwitterClientMock with auth_error scenario
  //     const twitterClient = new TwitterClientMock({}, 'auth_error');
  //     const twitterMedia = new TwitterMediaMock();
  //     const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

  //     try {
  //       await createPost.createPost('test-user-id', { text: 'Test post' });
  //       fail('Expected error was not thrown');
  //     } catch (error) {
  //       // Verify error is properly transformed
  //       assertInstanceOf(error, TwitterError);
  //       assertEquals(error.code, ApiErrorCode.UNAUTHORIZED);
  //       assertEquals(error.status, 401);
  //       assertEquals(error.platform, Platform.TWITTER);

  //       // Verify error message contains operation context
  //       assert(error.message.includes('Failed to createPost'));
  //       assert(error.message.includes('Twitter authentication error'));

  //       // Verify error details
  //       assert(error.details);
  //       assertEquals(error.details.twitterErrorCode, TwitterErrorCode.INVALID_OR_EXPIRED_TOKEN);
  //     }
  //   });
  // });

  // Test error handling in createThread
  describe('createThread error handling', () => {
    it('should properly propagate Twitter errors from thread creation', async () => {
      // Setup TwitterClientMock with tweetThread error scenario
      const twitterClient = new TwitterClientMock({}, 'tweetThread');
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Create a thread
      const threadContent = [
        { text: 'First tweet in thread' },
        { text: 'Second tweet in thread' },
      ];

      try {
        await createPost.createPost('test-user-id', threadContent);
        fail('Expected error was not thrown');
      } catch (error) {
        // Verify error is properly transformed
        assertInstanceOf(error, TwitterError);

        // Verify error message contains operation context
        assert(error.message.includes('Failed to createThread'));

        // Verify original error details are preserved
        assert(error.details);
      }
    });
  });
});

// Test the TwitterError.fromTwitterApiError function directly
describe('TwitterError.fromTwitterApiError', () => {
  it('should correctly transform ApiResponseError with media error code', () => {
    // Create a mock ApiResponseError with media error
    const mediaError = createMockTwitterError(323, 'The media you tried to upload is too large.');
    const responseError = new ApiResponseError('Media error', mediaError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(responseError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.MEDIA_UPLOAD_FAILED);
    assertEquals(twitterError.status, 400);
    assertEquals(twitterError.recoverable, true);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Media upload failed'));
    assertEquals(twitterError.details?.twitterErrorCode, 323);
  });

  // it('should correctly transform ApiResponseError with rate limit error code', () => {
  //   // Create a mock ApiResponseError with rate limit error
  //   const rateLimitError = createMockTwitterError(88, 'Rate limit exceeded');

  //   // Transform the error
  //   const twitterError = TwitterError.fromTwitterApiError(rateLimitError, 'test-user-id');

  //   // Verify transformation
  //   assertEquals(twitterError.code, ApiErrorCode.RATE_LIMITED);
  //   assertEquals(twitterError.status, 429);
  //   assertEquals(twitterError.recoverable, true);
  //   assertEquals(twitterError.userId, 'test-user-id');
  //   assert(twitterError.message.includes('Twitter rate limit exceeded'));
  //   assertEquals(twitterError.details?.twitterErrorCode, 88);
  // });

  // it('should correctly transform ApiResponseError with authentication error code', () => {
  //   // Create a mock ApiResponseError with authentication error
  //   const authError = createMockTwitterError(89, 'Invalid or expired token');
  //   // Transform the error
  //   const twitterError = TwitterError.fromTwitterApiError(authError, 'test-user-id');

  //   // Verify transformation
  //   assertEquals(twitterError.code, ApiErrorCode.UNAUTHORIZED);
  //   assertEquals(twitterError.status, 401);
  //   assertEquals(twitterError.recoverable, true);
  //   assertEquals(twitterError.userId, 'test-user-id');
  //   assert(twitterError.message.includes('Twitter authentication error'));
  //   assertEquals(twitterError.details?.twitterErrorCode, 89);
  // });

  it('should correctly transform ApiResponseError with duplicate content error code', () => {
    // Create a mock ApiResponseError with duplicate content error
    const duplicateError = createMockTwitterError(187, 'Status is a duplicate');
    const responseError = new ApiResponseError('Duplicate error', duplicateError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(
      responseError as unknown as ApiResponseError,
      'test-user-id',
    );

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.DUPLICATE_CONTENT);
    assertEquals(twitterError.status, 400);
    assertEquals(twitterError.recoverable, true);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Duplicate content'));
    assertEquals(twitterError.details?.twitterErrorCode, 187);
  });

  it('should correctly transform ApiResponseError with content policy violation error code', () => {
    // Create a mock ApiResponseError with content policy violation error
    const policyError = createMockTwitterError(
      226,
      'This request looks like it might be automated',
    );
    const responseError = new ApiResponseError('Policy error', policyError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(responseError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.CONTENT_POLICY_VIOLATION);
    assertEquals(twitterError.status, 400);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Content policy violation'));
    assertEquals(twitterError.details?.twitterErrorCode, 226);
  });

  it('should correctly transform ApiResponseError with resource not found error code', () => {
    // Create a mock ApiResponseError with resource not found error
    const notFoundError = createMockTwitterError(34, 'Resource not found');
    const responseError = new ApiResponseError('Not found error', notFoundError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(responseError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.NOT_FOUND);
    assertEquals(twitterError.status, 404);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Resource not found'));
    assertEquals(twitterError.details?.twitterErrorCode, 34);
  });

  it('should correctly transform ApiResponseError with account suspended error code', () => {
    // Create a mock ApiResponseError with account suspended error
    const suspendedError = createMockTwitterError(64, 'Your account is suspended');
    const responseError = new ApiResponseError('Suspended error', suspendedError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(responseError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.FORBIDDEN);
    assertEquals(twitterError.status, 403);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Account suspended'));
    assertEquals(twitterError.details?.twitterErrorCode, 64);
  });

  it('should correctly transform ApiResponseError with service error code', () => {
    // Create a mock ApiResponseError with service error
    const serviceError = createMockTwitterError(130, 'Over capacity');
    const responseError = new ApiResponseError('Service error', serviceError);

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(responseError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.PLATFORM_UNAVAILABLE);
    assertEquals(twitterError.status, 503);
    assertEquals(twitterError.recoverable, true);
    assertEquals(twitterError.userId, 'test-user-id');
    assert(twitterError.message.includes('Twitter service error'));
    assertEquals(twitterError.details?.twitterErrorCode, 130);
  });

  it('should correctly transform generic Error', () => {
    // Create a generic Error
    const genericError = new Error('Generic error');

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(genericError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.UNKNOWN_ERROR);
    assertEquals(twitterError.status, 500);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assertEquals(twitterError.message, 'Generic error');
  });

  it('should correctly transform unknown error types', () => {
    // Create an unknown error type
    const unknownError = 'This is not an Error object';

    // Transform the error
    const twitterError = TwitterError.fromTwitterApiError(unknownError, 'test-user-id');

    // Verify transformation
    assertEquals(twitterError.code, ApiErrorCode.UNKNOWN_ERROR);
    assertEquals(twitterError.status, 500);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assertEquals(twitterError.message, 'Unknown Twitter API error');
  });
});

// Test the enhanceErrorWithContext function
describe('enhanceErrorWithContext', () => {
  it('should add operation context to error message', () => {
    // Create a TwitterError
    const twitterError = new TwitterError(
      'Original error message',
      ApiErrorCode.PLATFORM_ERROR,
      500,
      new Error('Original error'),
      { detail: 'Test detail' },
      false,
      'test-user-id',
    );

    // Enhance the error with context
    const enhancedError = enhanceErrorWithContext(twitterError, 'testOperation');

    // Verify the error message is enhanced
    assert(enhancedError.message.includes('Failed to testOperation'));
    assert(enhancedError.message.includes('Original error message'));
  });

  it('should not duplicate operation context if already present', () => {
    // Create a TwitterError with operation context already in the message
    const twitterError = new TwitterError(
      'Failed to testOperation: Original error message',
      ApiErrorCode.PLATFORM_ERROR,
      500,
      new Error('Original error'),
      { detail: 'Test detail' },
      false,
      'test-user-id',
    );

    // Enhance the error with the same context
    const enhancedError = enhanceErrorWithContext(twitterError, 'testOperation');

    // Verify the error message is not duplicated
    assertEquals(enhancedError.message, 'Failed to testOperation: Original error message');
    assert(!enhancedError.message.includes('Failed to testOperation: Failed to testOperation'));
  });
});

// Test the TwitterError class directly
describe('TwitterError', () => {
  it('should follow the application error pattern', () => {
    // Create a TwitterError directly
    const twitterError = new TwitterError(
      'Test error message',
      ApiErrorCode.PLATFORM_ERROR,
      502,
      new Error('Original error'),
      { detail: 'Test detail' },
      false,
      'test-user-id',
    );

    // Verify error structure follows application pattern
    assertEquals(twitterError.platform, Platform.TWITTER);
    assertEquals(twitterError.code, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(twitterError.status, 502);
    assertEquals(twitterError.recoverable, false);
    assertEquals(twitterError.userId, 'test-user-id');
    assertEquals(twitterError.details?.detail, 'Test detail');

    // Verify it extends PlatformError
    assert(twitterError instanceof PlatformError);
  });
});
