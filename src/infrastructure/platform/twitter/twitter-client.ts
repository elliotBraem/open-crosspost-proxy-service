import { ApiErrorCode, Platform, PlatformError } from '@crosspost/types'; // Import ApiErrorCode
import { TwitterApiCachePluginRedis } from '@twitter-api-v2/plugin-cache-redis';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiAutoTokenRefresher } from '@twitter-api-v2/plugin-token-refresher';
import { Redis } from '@upstash/redis';
import { ITwitterApiClientPlugin, TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { AuthToken, TokenType } from '../../storage/auth-token-storage.ts';
import { BasePlatformClient } from '../abstract/base-platform-client.ts';
import { PlatformClient } from '../abstract/platform-client.interface.ts';
import { NearAuthService } from './../../security/near-auth-service.ts';

/**
 * Twitter Client
 * Implements the PlatformClient interface for Twitter
 */
export class TwitterClient extends BasePlatformClient implements PlatformClient {
  private rateLimitPlugin: TwitterApiRateLimitPlugin;
  private redisPlugin: TwitterApiCachePluginRedis | null = null;
  private redisClient: Redis | null = null;

  constructor(
    env: Env,
    private nearAuthService: NearAuthService,
  ) {
    super(env, Platform.TWITTER);
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();

    // Initialize Redis client if Upstash Redis credentials are available
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redisClient = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        // Note: Upstash Redis adapter for twitter-api-v2 would need to be created
        // For now, we'll disable Redis caching until a compatible adapter is available
        this.redisPlugin = null;
      } catch (error) {
        console.error('Failed to initialize Redis client:', error);
      }
    }
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    // Upstash Redis doesn't require explicit connection
  }

  /**
   * Get a Twitter client for a specific user
   * @param userId The user ID to get a client for
   * @returns A Twitter client instance
   */
  async getClientForUser(userId: string): Promise<TwitterApi> {
    try {
      // Get the tokens from the token store
      const token = await this.nearAuthService.getTokens(userId, Platform.TWITTER);

      // Create the auto refresher plugin for OAuth 2.0
      const autoRefresherPlugin = new TwitterApiAutoTokenRefresher({
        refreshToken: token.refreshToken || '',
        refreshCredentials: {
          clientId: this.env.TWITTER_CLIENT_ID,
          clientSecret: this.env.TWITTER_CLIENT_SECRET,
        },
        onTokenUpdate: async (token) => {
          // Create new tokens object
          const newToken: AuthToken = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken || token.refreshToken, // Use old refresh token if new one isn't provided
            expiresAt: Date.now() + 7200 * 1000, // Twitter tokens typically expire in 2 hours
            scope: token.scope,
            tokenType: TokenType.OAUTH2,
          };

          // Save the new tokens
          await this.nearAuthService.saveTokens(userId, Platform.TWITTER, newToken);
        },
        onTokenRefreshError: async (error) => {
          console.error('Token refresh error:', error);

          // Handle specific Twitter API error for invalid token
          if (
            (error as any).data?.error === 'invalid_request' ||
            (error as any).data?.error_description?.includes('invalid') ||
            ((error as any).status === 400 && (error as any).code === 'invalid_grant')
          ) {
            await this.nearAuthService.deleteTokens(userId, Platform.TWITTER);

            // Throw a more descriptive error
            throw new Error(
              `User authentication expired (${
                (error as any).data?.error_description || 'invalid token'
              }). Please reconnect your Twitter account.`,
            );
          }

          // For other types of errors, provide more context
          throw new Error(`Token refresh failed: ${(error as any).message || 'Unknown error'}`);
        },
      });

      // Create plugins array with auto refresher and rate limit plugins
      const plugins: ITwitterApiClientPlugin[] = [autoRefresherPlugin, this.rateLimitPlugin];

      // Add Redis cache plugin if available
      if (this.redisPlugin) {
        plugins.push(this.redisPlugin);
      }

      // Create a Twitter client with the access token and plugins
      return new TwitterApi(token.accessToken, { plugins });
    } catch (error) {
      console.error('Error getting Twitter client:', error);
      throw error;
    }
  }

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  getAuthUrl(redirectUri: string, state: string, scopes: string[]): string {
    const client = new TwitterApi({
      clientId: this.env.TWITTER_CLIENT_ID,
      clientSecret: this.env.TWITTER_CLIENT_SECRET,
    });

    const authLink = client.generateOAuth2AuthLink(redirectUri, {
      scope: scopes,
      state,
    });

    return authLink.url;
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier
   * @returns The OAuth tokens
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<AuthToken> {
    const client = new TwitterApi({
      clientId: this.env.TWITTER_CLIENT_ID,
      clientSecret: this.env.TWITTER_CLIENT_SECRET,
    });

    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      redirectUri,
      codeVerifier: codeVerifier || '',
    });

    // Get the user ID
    const loggedClient = new TwitterApi(accessToken);
    const { data: user } = await loggedClient.v2.me();

    // Create tokens object
    const token: AuthToken = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
      tokenType: TokenType.OAUTH2,
    };

    // Save the tokens
    await this.nearAuthService.saveTokens(user.id, Platform.TWITTER, token);

    return token;
  }

  /**
   * Refresh a platform token using a refresh token
   * This method only interacts with the platform API and does not update storage
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   * @throws PlatformError if the refresh fails
   */
  async refreshPlatformToken(refreshToken: string): Promise<AuthToken> {
    try {
      const client = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client
        .refreshOAuth2Token(refreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken || refreshToken, // Use old refresh token if new one isn't provided
        expiresAt: Date.now() + expiresIn * 1000,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        tokenType: TokenType.OAUTH2,
      };
    } catch (error: any) {
      // Handle specific Twitter API error for invalid token
      if (
        error.data?.error === 'invalid_request' ||
        error.data?.error_description?.includes('invalid') ||
        (error.status === 400 && error.code === 'invalid_grant')
      ) {
        throw new PlatformError(
          `User authentication expired (${
            error.data?.error_description || 'invalid token'
          }). Please reconnect your Twitter account.`,
          Platform.TWITTER,
          ApiErrorCode.UNAUTHORIZED,
          false, // Not recoverable
          error, // Original error
        );
      }

      throw this.handleApiError(error, 'refreshPlatformToken');
    }
  }

  /**
   * Revoke platform tokens
   * This method only interacts with the platform API and does not update storage
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  async revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      // Create a Twitter API client
      const client = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Revoke the OAuth 2.0 tokens
      if (accessToken) {
        await client.revokeOAuth2Token(accessToken, 'access_token');
      }

      if (refreshToken) {
        await client.revokeOAuth2Token(refreshToken, 'refresh_token');
      }

      return true;
    } catch (error) {
      console.error('Error revoking tokens with Twitter API:', error);

      // If it's a 401 error, the token might already be invalid/revoked
      if (
        error instanceof Error &&
        (error.message.includes('401') || error.message.includes('unauthorized'))
      ) {
        return true;
      }

      throw this.handleApiError(error, 'revokePlatformToken');
    }
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   * @returns The rate limit status
   */
  async getRateLimitStatus(endpoint: string, version: 'v1' | 'v2' = 'v2'): Promise<any> {
    try {
      return await this.rateLimitPlugin[version].getRateLimit(endpoint);
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return false;
    return this.rateLimitPlugin.hasHitRateLimit(rateLimitStatus);
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return true;
    return this.rateLimitPlugin.isRateLimitStatusObsolete(rateLimitStatus);
  }
}
