import { ApiErrorCode, PlatformError, PlatformName } from '@crosspost/types';
import type { StatusCode } from 'hono/utils/http-status'; // Import StatusCode
import { Env } from '../../../config/env.ts';
import { AuthToken } from '../../storage/auth-token-storage.ts';
import { PlatformClient } from './platform-client.interface.ts';

/**
 * Base Platform Client
 * Base implementation of the PlatformClient interface with common functionality
 */
export abstract class BasePlatformClient implements PlatformClient {
  /**
   * Create a new base platform client
   * @param env Environment configuration
   * @param platform Platform name
   */
  constructor(
    protected env: Env,
    protected platform: PlatformName,
  ) {}

  /**
   * Initialize the client with necessary credentials
   */
  abstract initialize(): Promise<void>;

  /**
   * Get a client instance for a specific user
   * @param userId The user ID to get a client for
   * @param token The token to use for authentication
   * @throws PlatformError if the client cannot be created
   */
  abstract getClientForUser(userId: string, token: AuthToken): Promise<any>;

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  abstract getAuthUrl(redirectUri: string, state: string, scopes: string[]): string;

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The tokens from the platform
   * @throws PlatformError if the exchange fails
   */
  abstract exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<any>;

  /**
   * Refresh a platform token using a refresh token
   * This method only interacts with the platform API and does not update storage
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   * @throws PlatformError if the refresh fails
   */
  abstract refreshPlatformToken(refreshToken: string): Promise<any>;

  /**
   * Revoke platform tokens
   * This method only interacts with the platform API and does not update storage
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  abstract revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean>;

  /**
   * Handle common API errors
   * @param error The error to handle
   * @param context Additional context for the error
   * @throws PlatformError with appropriate type
   */
  protected handleApiError(error: unknown, context = ''): never {
    console.error(`API Error ${context ? `(${context})` : ''}:`, error);

    // Default error message, code, status, and recoverability
    let message = 'An unknown API error occurred';
    let apiErrorCode: ApiErrorCode = ApiErrorCode.UNKNOWN_ERROR;
    let recoverable = false;
    let status: number | undefined = 500; // Default to 500 Internal Server Error

    // Extract error details if available
    if (error instanceof Error) {
      message = error.message;
    }

    // Check for common error patterns
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;

      // Check for status code
      if (typeof err.status === 'number') {
        status = err.status;
      } else if (typeof err.statusCode === 'number') {
        status = err.statusCode;
      }

      // Check for error message
      if (typeof err.message === 'string') {
        message = err.message;
      } else if (err.data?.message) {
        message = err.data.message;
      } else if (err.error?.message) {
        message = err.error.message;
      }

      // Determine ApiErrorCode based on status code and error content
      if (status !== undefined) {
        if (status === 401 || status === 403) {
          // Check for specific token/auth errors vs general permission errors
          if (
            err.data?.error === 'invalid_token' ||
            err.data?.error === 'invalid_request' ||
            err.code === 'invalid_grant' ||
            message.includes('token') ||
            message.includes('unauthorized')
          ) {
            apiErrorCode = ApiErrorCode.UNAUTHORIZED;
            // recoverable might be true if refresh is possible, but default to false here
          } else {
            apiErrorCode = ApiErrorCode.FORBIDDEN; // General permission denied
            recoverable = false;
          }
        } else if (status === 429) {
          apiErrorCode = ApiErrorCode.RATE_LIMITED;
          recoverable = true;
        } else if (status === 404) {
          apiErrorCode = ApiErrorCode.NOT_FOUND;
          recoverable = false;
        } else if (status >= 500) {
          apiErrorCode = ApiErrorCode.PLATFORM_UNAVAILABLE; // Or PLATFORM_ERROR? Let's use UNAVAILABLE for 5xx
          recoverable = true; // Server errors might be temporary
        }
        // Add other status code mappings if needed (e.g., 400 for validation)
      } else if (
        // Check for network errors if status is not available
        err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT'
      ) {
        apiErrorCode = ApiErrorCode.NETWORK_ERROR;
        recoverable = true;
        status = 502; // Set a default status for network errors
      }
    }

    // Throw PlatformError using ApiErrorCode
    throw new PlatformError(
      message,
      this.platform,
      apiErrorCode,
      recoverable,
      error, // Original error
      status as StatusCode | undefined, // Pass status, cast needed
      undefined, // userId
      undefined, // details
    );
  }
}
