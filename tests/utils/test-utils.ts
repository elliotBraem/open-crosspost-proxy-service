import { PlatformName, PostResult } from '@crosspost/types';
import { Context } from '../../deps.ts';
import { ActivityTrackingService } from '../../src/domain/services/activity-tracking.service.ts';
import { AuthService } from '../../src/domain/services/auth.service.ts';
import { PostService } from '../../src/domain/services/post.service.ts';
import { RateLimitService } from '../../src/domain/services/rate-limit.service.ts';

/**
 * Create a mock context for testing
 * @param options Options for the mock context
 * @returns A mock context
 */
export function createMockContext(options: {
  signerId?: string;
  validatedBody?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): Context {
  // Create default Authorization header with NEAR signature if signerId is provided
  const defaultHeaders: Record<string, string> = {};
  if (options.signerId) {
    const nearAuthData = {
      account_id: options.signerId,
      public_key: 'ed25519:mock-public-key',
      signature: 'mock-signature',
      message: 'mock-message',
      nonce: 'mock-nonce',
      recipient: 'crosspost.near',
    };
    defaultHeaders['Authorization'] = `Bearer ${JSON.stringify(nearAuthData)}`;
  }

  // Merge default headers with provided headers
  const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };

  const c = {
    // Mock basic context properties
    req: {
      url: 'https://example.com',
      method: 'GET',
      headers: new Headers(mergedHeaders),
      header: (name: string) => {
        return mergedHeaders[name] || null;
      },
      query: (param: string) => {
        // Mock implementation for query parameters
        if (param === 'userId' && options.params?.userId) {
          return options.params.userId;
        }
        return null;
      },
      json: async () => {
        // Return the mock request body if _json is set, otherwise return validatedBody
        return (c.req as any)._json || options.validatedBody || {};
      },
    },
    // Mock context methods
    get: (key: string) => {
      if (key === 'signerId') return options.signerId || 'test.near';
      if (key === 'validatedBody') return options.validatedBody || {};
      return undefined;
    },
    set: (key: string, value: unknown) => {},
    status: (code: number) => {
      // Store the status code on the context
      (c as any)._status = code;
      return c;
    },
    json: (data: unknown) => {
      // Create a response with the stored status code
      return new Response(JSON.stringify(data), {
        status: (c as any)._status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    redirect: (url: string) => {
      // Create a redirect response
      return new Response(null, {
        status: 302,
        headers: { 'Location': url },
      });
    },
    // Add params if provided
    params: options.params || {},
  } as unknown as Context;

  return c;
}

/**
 * Create a test user ID
 * @param platform Platform name
 * @returns A test user ID for the platform
 */
export function createTestUserId(platform: PlatformName): string {
  return `test-user-${platform}`;
}

/**
 * Create mock services for testing
 * @returns Mock services for testing
 */
export function createMockServices() {
  // Create mock service objects with all required methods
  const mockPostService = {
    createPost: (_platform: PlatformName, userId: string, _content: any) => {
      return Promise.resolve({
        id: `mock-post-id-${userId}`,
        url: `https://mock.platform/${userId}/posts/mock-post-id-${userId}`,
        createdAt: new Date().toISOString(),
        success: true,
      } as PostResult);
    },
  };

  const mockAuthService = {
    hasAccess: (_signerId: string, _platform: PlatformName, _userId: string) =>
      Promise.resolve(true),
    getTokensForUser: () => Promise.resolve({ accessToken: 'mock-token' }),
  };

  const mockRateLimitService = {
    canPerformAction: (_platform: PlatformName, _action?: string) => Promise.resolve(true),
  };

  const mockActivityTrackingService = {
    trackPost: (_signerId: string, _platform: PlatformName, _userId: string, _postId: string) =>
      Promise.resolve(),
  };

  return {
    postService: mockPostService as unknown as PostService,
    authService: mockAuthService as unknown as AuthService,
    rateLimitService: mockRateLimitService as unknown as RateLimitService,
    activityTrackingService: mockActivityTrackingService as unknown as ActivityTrackingService,
  };
}

/**
 * Create mock services for rate limit error testing
 * @returns Mock services with rate limit error
 */
export function createRateLimitErrorServices() {
  const services = createMockServices();
  return {
    ...services,
    rateLimitService: {
      canPerformAction: () => Promise.resolve(false),
    } as unknown as RateLimitService,
  };
}

/**
 * Create mock services for authentication error testing
 * @returns Mock services with authentication error
 */
export function createAuthErrorServices() {
  const services = createMockServices();
  return {
    ...services,
    authService: {
      hasAccess: () => Promise.resolve(false),
      getTokensForUser: () => Promise.resolve({ accessToken: 'mock-token' }),
    } as unknown as AuthService,
  };
}

/**
 * Create mock services for platform error testing
 * @param error The platform error to throw
 * @returns Mock services with platform error
 */
export function createPlatformErrorServices(error: Error) {
  const services = createMockServices();
  return {
    ...services,
    postService: {
      createPost: () => Promise.reject(error),
    } as unknown as PostService,
  };
}
