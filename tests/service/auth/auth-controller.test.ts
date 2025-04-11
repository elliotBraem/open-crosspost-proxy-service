import { Platform } from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { Env } from '../../../src/config/env.ts';
import { AuthController } from '../../../src/controllers/auth.controller.ts';
import { createMockContext } from '../../utils/test-utils.ts';

describe('Auth Controller', () => {
  let authController: AuthController;
  let mockAuthService: any;
  let mockNearAuthService: any;
  let mockEnv: Env;

  beforeEach(() => {
    // Create mock auth service
    mockAuthService = {
      initializeAuth: () =>
        Promise.resolve({
          authUrl: 'https://example.com/auth',
          state: 'mock-state',
        }),
      getAuthState: () =>
        Promise.resolve({
          successUrl: 'https://example.com/success',
          errorUrl: 'https://example.com/error',
        }),
      handleCallback: () =>
        Promise.resolve({
          userId: 'twitter-user-id',
          successUrl: 'https://example.com/success',
        }),
      refreshToken: () =>
        Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      revokeToken: () => Promise.resolve(true),
      hasValidTokens: () => Promise.resolve(true),
      getUserProfile: () =>
        Promise.resolve({
          id: 'twitter-user-id',
          username: 'twitteruser',
          displayName: 'Twitter User',
        }),
    };

    // Create mock token manager
    mockNearAuthService = {
      getNearAuthorizationStatus: () => Promise.resolve(1), // Authorized
      authorizeNearAccount: () => Promise.resolve({ success: true }),
      unauthorizeNearAccount: () => Promise.resolve({ success: true }),
      saveTokens: () => Promise.resolve(),
      linkAccount: () => Promise.resolve(),
      unlinkAccount: () => Promise.resolve(),
      hasAccess: () => Promise.resolve(true),
      getLinkedAccounts: () =>
        Promise.resolve([
          { platform: Platform.TWITTER, userId: 'twitter-user-id' },
        ]),
      extractAndValidateNearAuth: () =>
        Promise.resolve({
          authData: {
            account_id: 'test.near',
            public_key: 'ed25519:mock-public-key',
            signature: 'mock-signature',
            message: 'mock-message',
            nonce: 'mock-nonce',
            recipient: 'crosspost.near',
          },
          signerId: 'test.near',
        }),
    };

    // Create mock env
    mockEnv = {} as Env;

    // Create the controller instance with mock dependencies
    authController = new AuthController(mockAuthService, mockNearAuthService, mockEnv);
  });

  describe('NEAR Authorization', () => {
    it('should authorize a NEAR account', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.authorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.success, true);
    });

    it('should handle errors when authorizing a NEAR account', async () => {
      // Override the mock to simulate an error
      mockNearAuthService.authorizeNearAccount = () =>
        Promise.resolve({ success: false, error: 'Authorization failed' });

      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.authorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 500);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].error, 'Authorization failed');
      assertEquals(responseBody.errors[0].errorCode, 'INTERNAL_ERROR');
    });

    it('should unauthorize a NEAR account', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.unauthorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.success, true);
    });

    it('should check NEAR account authorization status', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.checkNearAuthorizationStatus(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.isAuthorized, true);
    });
  });

  describe('Platform Authentication', () => {
    it('should initialize authentication for a platform', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Call the controller
      const response = await authController.initializeAuth(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.authUrl);
      assertEquals(responseBody.data.authUrl, 'https://example.com/auth');
    });

    it('should handle auth callback from a platform', async () => {
      // Create a mock context with URL that includes code and state
      const context = createMockContext({
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the URL to include code and state
      (context.req as any).url =
        'https://example.com/auth/twitter/callback?code=auth-code&state=state-token';

      // Call the controller
      const response = await authController.handleCallback(context, Platform.TWITTER);

      // Verify the response is a redirect
      assertEquals(response.status, 302);
      assertEquals(response.headers.get('Location')?.includes('success=true'), true);
    });

    it('should handle errors in auth callback', async () => {
      // Create a mock context with URL that includes an error
      const context = createMockContext({
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the URL to include an error
      (context.req as any).url =
        'https://example.com/auth/twitter/callback?error=access_denied&error_description=User%20denied%20access';

      // Override the getAuthState method to simulate no state found
      mockAuthService.getAuthState = () => Promise.reject(new Error('State not found'));

      // Call the controller
      const response = await authController.handleCallback(context, Platform.TWITTER);

      // For error cases without a valid state, we should get a JSON response
      assertEquals(response.status, 400);

      // Parse the response body
      const responseBody = await response.json();
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].errorCode, 'authentication_error');
    });

    it('should refresh a token', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the request body
      (context.req as any)._json = Promise.resolve({ userId: 'twitter-user-id' });

      // Call the controller
      const response = await authController.refreshToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.accessToken);
    });

    it('should revoke a token', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the request body
      (context.req as any)._json = Promise.resolve({ userId: 'twitter-user-id' });

      // Call the controller
      const response = await authController.revokeToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.success, true);
    });

    it('should check if a user has valid tokens', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the query method to return userId
      (context.req as any).query = (param: string) => param === 'userId' ? 'twitter-user-id' : null;

      // Call the controller
      const response = await authController.hasValidTokens(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.hasTokens, true);
      assertEquals(responseBody.data.isLinked, true);
    });

    it('should list connected accounts', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.listConnectedAccounts(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.accounts);
      assertEquals(responseBody.data.accounts.length, 1);
      assertEquals(responseBody.data.accounts[0].platform, Platform.TWITTER);
    });

    it('should refresh a user profile', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the request body
      (context.req as any)._json = Promise.resolve({ userId: 'twitter-user-id' });

      // Call the controller
      const response = await authController.refreshUserProfile(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.profile);
      assertEquals(responseBody.data.profile.id, 'twitter-user-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized NEAR account', async () => {
      // Override the mock to simulate an unauthorized NEAR account
      mockNearAuthService.getNearAuthorizationStatus = () => Promise.resolve(-1); // Not authorized

      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Call the controller
      const response = await authController.initializeAuth(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 403);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].errorCode, 'FORBIDDEN');
    });

    it('should handle missing userId in token operations', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the request body with missing userId
      (context.req as any)._json = Promise.resolve({});

      // Call the controller
      const response = await authController.refreshToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 400);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].errorCode, 'VALIDATION_ERROR');
    });

    it('should handle errors when refreshing user profile', async () => {
      // Override the mock to simulate an error
      mockAuthService.getUserProfile = () => Promise.resolve(null);

      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the request body
      (context.req as any)._json = Promise.resolve({ userId: 'twitter-user-id' });

      // Call the controller
      const response = await authController.refreshUserProfile(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 404);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].errorCode, 'NOT_FOUND');
    });
  });
});
