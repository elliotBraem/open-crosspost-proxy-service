import {
  ApiErrorCode,
  createEnhancedErrorResponse,
  createErrorDetail,
  PlatformName,
} from '@crosspost/types';
import { Context } from '../../deps.ts';
import { Env } from '../config/env.ts';
import { DEFAULT_CONFIG } from '../config/index.ts';
import { AuthService } from '../domain/services/auth.service.ts';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';
import { unlinkAccountFromNear } from '../utils/account-linking.utils.ts';
import { BaseController } from './base.controller.ts';

/**
 * Auth Controller
 * Handles HTTP requests for authentication-related operations
 */
export class AuthController extends BaseController {
  // Dependencies will be injected
  constructor(
    private authService: AuthService,
    private nearAuthService: NearAuthService,
    private env: Env,
  ) {
    super();
  }

  /**
   * Initialize authentication with NEAR signature
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Extract and validate NEAR auth data
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Check if the NEAR account is authorized
      const authStatus = await this.nearAuthService.getNearAuthorizationStatus(signerId);
      const isAuthorized = authStatus >= 0; // -1 means not authorized, 0 or greater means authorized
      if (!isAuthorized) {
        console.warn(`Unauthorized NEAR account attempt: ${signerId}`);
        c.status(403);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          `NEAR account ${signerId} is not authorized. Please authorize via POST /auth/authorize/near first.`,
          ApiErrorCode.FORBIDDEN,
          true,
          platform,
        )]));
      }

      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

      // Construct the platform-specific callback URL
      const callbackUrl = `${baseUrl}/auth/${platform}/callback`;

      // Get successUrl and errorUrl from query parameters
      const successUrl = requestUrl.searchParams.get('successUrl');
      const errorUrl = requestUrl.searchParams.get('errorUrl');

      // Get the origin from the request headers as fallback
      const origin = c.req.header('origin') || c.req.header('referer') || requestUrl.origin;

      // Initialize auth with the platform-specific callback URL and the client's return URL
      // We need to pass the successUrl to the auth service so it can be stored in KV
      // and retrieved during the callback
      const authData = await this.authService.initializeAuth(
        platform,
        signerId, // Pass the NEAR account ID for linking during callback
        callbackUrl,
        DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES, // scopes can come from request
        successUrl || origin,
        errorUrl || successUrl || origin,
      );

      // Return the auth URL and state
      return c.json({ data: authData });
    } catch (error) {
      console.error('Error initializing auth with NEAR:', error);
      this.handleError(error, c, platform);
      return c.res;
    }
  }

  /**
   * Handle the OAuth callback
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with user ID and tokens or a redirect
   */
  async handleCallback(c: Context, platform: PlatformName): Promise<Response> {
    try {
      // Get the query parameters from the URL
      const url = new URL(c.req.url);

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const error_description = url.searchParams.get('error_description');

      // Check for errors
      if (error) {
        try {
          const callbackResult = await this.authService.getAuthState(state!);
          if (callbackResult && callbackResult.errorUrl) {
            const errorRedirectUrl = new URL(callbackResult.errorUrl);
            errorRedirectUrl.searchParams.set('error', error);
            if (error_description) {
              errorRedirectUrl.searchParams.set('error_description', error_description);
            }
            return c.redirect(errorRedirectUrl.toString());
          }
        } catch (stateError) {
          console.error('Error retrieving auth state:', stateError);
        }

        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          `${platform} authorization error: ${error}${
            error_description ? ` - ${error_description}` : ''
          }`,
          'authentication_error',
          false,
          platform,
        )]));
      }

      if (!code || !state) {
        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'Code and state are required',
          ApiErrorCode.VALIDATION_ERROR,
          true,
          platform,
        )]));
      }

      const callbackResult = await this.authService.handleCallback(
        platform,
        code,
        state,
      );

      const { successUrl } = callbackResult;

      const redirectUrl = new URL(successUrl);

      redirectUrl.searchParams.set('userId', callbackResult.userId);
      redirectUrl.searchParams.set('platform', platform);
      redirectUrl.searchParams.set('success', 'true');

      return c.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Error handling callback:', error);
      this.handleError(error, c, platform);
      return c.res;
    }
  }

  /**
   * Refresh a user's access token
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with new tokens
   */
  async refreshToken(c: Context, platform: PlatformName): Promise<Response> {
    let userId: string | undefined;
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Extract userId from request body
      const body = await c.req.json();
      userId = body.userId;

      if (!userId) {
        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'userId is required',
          ApiErrorCode.VALIDATION_ERROR,
          true,
          platform,
        )]));
      }

      // Refresh token
      const tokens = await this.authService.refreshToken(platform, userId);

      // Save tokens and link account
      await this.nearAuthService.saveTokens(userId, platform, tokens);
      await this.nearAuthService.linkAccount(signerId, platform, userId);

      // Return the new tokens
      return c.json({ data: tokens });
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.handleError(error, c, platform, userId);
      return c.res;
    }
  }

  /**
   * Revoke a user's tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with success status
   */
  async revokeToken(c: Context, platform: PlatformName): Promise<Response> {
    let userId: string | undefined;
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Extract userId from request body
      const body = await c.req.json();
      userId = body.userId;

      if (!userId) {
        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'userId is required',
          ApiErrorCode.VALIDATION_ERROR,
          true,
          platform,
        )]));
      }

      // Revoke token
      const success = await this.authService.revokeToken(platform, userId);

      // Unlink the account from the NEAR wallet
      if (success) {
        await unlinkAccountFromNear(signerId, platform, userId, this.nearAuthService);
      }

      // Return success status
      return c.json({ data: { success } });
    } catch (error) {
      console.error('Error revoking token:', error);
      this.handleError(error, c, platform, userId);
      return c.res;
    }
  }

  /**
   * Check if a user has valid tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with validity status
   */
  async hasValidTokens(c: Context, platform: PlatformName): Promise<Response> {
    let userId: string | undefined;
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Extract userId from request body or query parameters
      userId = c.req.query('userId');

      if (!userId) {
        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'userId is required',
          ApiErrorCode.VALIDATION_ERROR,
          true,
          platform,
        )]));
      }

      // Check if user has valid tokens
      const hasTokens = await this.authService.hasValidTokens(platform, userId);

      // Also check if the tokens are linked to this NEAR account
      const isLinked = await this.nearAuthService.hasAccess(signerId, platform, userId);

      // Return validity status
      return c.json({ data: { hasTokens, isLinked } });
    } catch (error) {
      console.error('Error checking tokens:', error);
      this.handleError(error, c, platform, userId);
      return c.res;
    }
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param c The Hono context
   * @returns HTTP response with connected accounts
   */
  async listConnectedAccounts(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Get all connected accounts
      const accounts = await this.nearAuthService.getLinkedAccounts(signerId);

      // Fetch user profiles for each account
      const accountsWithProfiles = await Promise.all(
        accounts.map(async (account) => {
          // Get the user profile (with automatic refresh if needed)
          const profile = await this.authService.getUserProfile(account.platform, account.userId);

          return {
            ...account,
            profile,
          };
        }),
      );

      // Return the accounts with profiles
      return c.json({ data: { accounts: accountsWithProfiles } });
    } catch (error) {
      console.error('Error listing connected accounts:', error);
      this.handleError(error, c);
      return c.res;
    }
  }

  /**
   * Authorize a NEAR account for interaction with the proxy.
   * @param c The Hono context
   * @returns HTTP response indicating success or failure of authorization.
   */
  async authorizeNear(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Authorize the NEAR account
      const result = await this.nearAuthService.authorizeNearAccount(signerId);

      if (result.success) {
        return c.json({ data: { success: true, signerId: signerId } });
      } else {
        c.status(500);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          result.error || 'Failed to authorize NEAR account',
          ApiErrorCode.INTERNAL_ERROR,
          false,
        )]));
      }
    } catch (error) {
      console.error('Unexpected error authorizing NEAR account:', error);
      this.handleError(error, c);
      return c.res;
    }
  }

  /**
   * Unauthorize a NEAR account, removing its ability to interact with the proxy.
   * Also removes all linked accounts associated with the NEAR account.
   * @param c The Hono context
   * @returns HTTP response indicating success or failure of unauthorization.
   */
  async unauthorizeNear(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Get all linked accounts before removing authorization
      const linkedAccounts = await this.nearAuthService.getLinkedAccounts(signerId);

      // Track any errors that occur during account unlinking
      const unlinkErrors: Array<{ platform: PlatformName; userId: string; error: string }> = [];

      // Revoke tokens and unlink all connected accounts
      for (const account of linkedAccounts) {
        try {
          // Revoke token from the platform
          await this.authService.revokeToken(account.platform, account.userId);

          // Unlink the account from the NEAR wallet
          await unlinkAccountFromNear(
            signerId,
            account.platform,
            account.userId,
            this.nearAuthService,
          );

          console.log(
            `Unlinked ${account.platform} account ${account.userId} from NEAR wallet ${signerId}`,
          );
        } catch (unlinkError) {
          console.error(
            `Error unlinking account ${account.platform}:${account.userId}:`,
            unlinkError,
          );
          unlinkErrors.push({
            platform: account.platform,
            userId: account.userId,
            error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error',
          });
        }
      }

      // Unauthorize the NEAR account
      const result = await this.nearAuthService.unauthorizeNearAccount(signerId);

      if (result.success) {
        return c.json({
          data: {
            success: true,
            signerId: signerId,
            accountsUnlinked: linkedAccounts.length,
            unlinkErrors: unlinkErrors.length > 0 ? unlinkErrors : undefined,
          },
        });
      } else {
        c.status(500);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          result.error || 'Failed to unauthorize NEAR account',
          ApiErrorCode.INTERNAL_ERROR,
          false,
        )]));
      }
    } catch (error) {
      console.error('Unexpected error unauthorizing NEAR account:', error);
      this.handleError(error, c);
      return c.res;
    }
  }

  /**
   * Check if a NEAR account is authorized to interact with the proxy.
   * @param c The Hono context
   * @returns HTTP response indicating whether the account is authorized.
   */
  async checkNearAuthorizationStatus(c: Context): Promise<Response> {
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      // Check the NEAR account authorization status
      const authStatus = await this.nearAuthService.getNearAuthorizationStatus(signerId);
      const isAuthorized = authStatus >= 0; // -1 means not authorized, 0 or greater means authorized

      return c.json({
        data: {
          signerId,
          isAuthorized,
        },
      });
    } catch (error) {
      console.error('Unexpected error checking NEAR account authorization status:', error);
      this.handleError(error, c);
      return c.res;
    }
  }

  /**
   * Refresh a user's profile from the platform API
   * @param c The Hono context
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns HTTP response with the refreshed profile
   */
  async refreshUserProfile(c: Context, platform: PlatformName): Promise<Response> {
    let userId: string | undefined;
    try {
      // Extract and validate NEAR auth data from the header
      const { signerId } = await this.nearAuthService.extractAndValidateNearAuth(c);

      const body = await c.req.json();
      userId = body.userId;

      if (!userId) {
        c.status(400);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'userId is required',
          ApiErrorCode.VALIDATION_ERROR,
          true,
          platform,
        )]));
      }

      // Check if the tokens are linked to this NEAR account
      const hasAccess = await this.nearAuthService.hasAccess(signerId, platform, userId);
      if (!hasAccess) {
        c.status(403);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'Account not linked to this NEAR wallet',
          ApiErrorCode.UNAUTHORIZED,
          true,
          platform,
          userId,
        )]));
      }

      // Force refresh the user profile
      const profile = await this.authService.getUserProfile(platform, userId, true);

      if (!profile) {
        c.status(404);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'User profile not found',
          ApiErrorCode.NOT_FOUND,
          false,
          platform,
          userId,
        )]));
      }

      // Return the refreshed profile
      return c.json({ data: { profile } });
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      this.handleError(error, c, platform, userId);
      return c.res;
    }
  }
}
