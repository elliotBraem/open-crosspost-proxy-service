import { AuthToken } from '../../storage/auth-token-storage.ts';
import { PlatformClient } from './platform-client.interface.ts';

/**
 * Auth State Interface
 * Defines the structure for storing OAuth state data
 */
export interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
  successUrl: string; // Store the original client return URL
  errorUrl: string; // Store the URL to redirect to on error
  signerId: string; // Store the NEAR account ID for linking
}

/**
 * Platform Auth Interface
 * Defines the common interface for platform-specific authentication implementations
 * Responsible for managing the authentication flow and token storage
 */
export interface PlatformAuth {
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback (platform specific, internal url)
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state, and optional codeVerifier (PKCE)
   * @throws PlatformError if the initialization fails
   */
  initializeAuth(
    redirectUri: string,
    scopes: string[],
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   * @throws PlatformError if the state is invalid or expired
   */
  getAuthState(
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null>;

  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID, tokens, and success URL
   * @throws PlatformError if the callback handling fails
   */
  handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; token: AuthToken; successUrl: string }>;

  /**
   * Refresh a user's access token
   * This method manages the entire refresh process including storage
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   * @throws PlatformError if the refresh fails
   */
  refreshToken(userId: string): Promise<AuthToken>;

  /**
   * Revoke a user's tokens
   * This method manages the entire revocation process including storage
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  revokeToken(userId: string): Promise<boolean>;

  /**
   * Get the platform client
   * @returns The platform client
   */
  getPlatformClient(): PlatformClient;
}
