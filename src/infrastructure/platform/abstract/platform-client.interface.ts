import { AuthToken } from '../../storage/auth-token-storage.ts';

/**
 * Platform Client Interface
 * Defines the common interface for platform-specific client implementations
 * Responsible for direct interactions with platform APIs
 */
export interface PlatformClient {
  /**
   * Initialize the client with necessary credentials
   */
  initialize(): Promise<void>;

  /**
   * Get a client instance for a specific user
   * @param userId The user ID to get a client for
   * @param token The token to use for authentication
   * @throws PlatformError if the client cannot be created
   */
  getClientForUser(userId: string, token: AuthToken): Promise<any>;

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  getAuthUrl(redirectUri: string, state: string, scopes: string[]): string;

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The tokens from the platform
   * @throws PlatformError if the exchange fails
   */
  exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<any>;

  /**
   * Refresh a platform token using a refresh token
   * This method only interacts with the platform API and does not update storage
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   * @throws PlatformError if the refresh fails
   */
  refreshPlatformToken(refreshToken: string): Promise<any>;

  /**
   * Revoke platform tokens
   * This method only interacts with the platform API and does not update storage
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean>;
}
