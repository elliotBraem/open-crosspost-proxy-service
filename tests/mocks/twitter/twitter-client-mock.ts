import { TwitterClient } from '../../../src/infrastructure/platform/twitter/twitter-client.ts';
import { AuthToken, TokenType } from '../../../src/infrastructure/storage/auth-token-storage.ts';
import { MockNearAuthService, mockToken } from './../near-auth-service-mock.ts';
import { createMockTwitterApi } from './twitter-api-mock.ts';

/**
 * Mock Twitter Client for testing
 * This class mocks the TwitterClient class for testing purposes
 */
export class TwitterClientMock extends TwitterClient {
  private mockTokens: Map<string, AuthToken> = new Map();
  private errorScenario?: string;
  private mockNearAuthService: MockNearAuthService;

  /**
   * Constructor
   * @param env Environment configuration
   * @param errorScenario Optional error scenario to simulate
   */
  constructor(env: any, errorScenario?: string) {
    // Create a mock NearAuthService instance
    const mockNearAuthService = new MockNearAuthService(env);
    super(env, mockNearAuthService as any);

    this.mockNearAuthService = mockNearAuthService;
    this.errorScenario = errorScenario;
  }

  /**
   * Set mock tokens for a user
   * @param userId User ID
   * @param tokens Auth tokens
   */
  setMockTokens(userId: string, tokens: AuthToken): void {
    this.mockTokens.set(userId, tokens);
  }

  /**
   * Get a Twitter client for a specific user
   * @param userId The user ID to get a client for
   * @param token The token to use for authentication
   * @returns A Twitter client instance
   */
  override async getClientForUser(userId: string): Promise<any> {
    // If error scenario is set, simulate the error
    if (this.errorScenario === 'getClientForUser') {
      throw new Error('Failed to get client for user');
    }

    // Use the mock token directly
    const token = this.mockTokens.get(userId) || mockToken;

    // Return a mock Twitter API client
    return createMockTwitterApi(userId, this.errorScenario);
  }

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  override getAuthUrl(redirectUri: string, state: string, scopes: string[]): string {
    // If error scenario is set, simulate the error
    if (this.errorScenario === 'getAuthUrl') {
      throw new Error('Failed to get auth URL');
    }

    return `https://x.com/i/oauth2/authorize?client_id=mock&redirect_uri=${
      encodeURIComponent(
        redirectUri,
      )
    }&state=${state}&scope=${
      scopes.join('%20')
    }&response_type=code&code_challenge=mock&code_challenge_method=S256`;
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier
   * @returns The OAuth tokens
   */
  override async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<AuthToken> {
    // If error scenario is set, simulate the error
    if (this.errorScenario === 'exchangeCodeForToken') {
      throw new Error('Failed to exchange code for token');
    }

    // Return mock tokens
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: Date.now() + 7200 * 1000, // 2 hours from now
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
      tokenType: TokenType.OAUTH2,
    };
  }

  /**
   * Refresh a platform token using a refresh token
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   */
  override async refreshPlatformToken(refreshToken: string): Promise<AuthToken> {
    // If error scenario is set, simulate the error
    if (this.errorScenario === 'refreshPlatformToken') {
      throw new Error('Failed to refresh platform token');
    }

    // Return mock tokens
    return {
      accessToken: 'mock-refreshed-access-token',
      refreshToken: 'mock-refreshed-refresh-token',
      expiresAt: Date.now() + 7200 * 1000, // 2 hours from now
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
      tokenType: TokenType.OAUTH2,
    };
  }

  /**
   * Revoke platform tokens
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   */
  override async revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean> {
    // If error scenario is set, simulate the error
    if (this.errorScenario === 'revokePlatformToken') {
      throw new Error('Failed to revoke platform token');
    }

    return true;
  }
}
