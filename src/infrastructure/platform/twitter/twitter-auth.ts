import { Platform } from '@crosspost/types';
import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { PrefixedKvStore } from '../../../utils/kv-store.utils.ts';
import { AuthToken, TokenType } from '../../storage/auth-token-storage.ts';
import { BasePlatformAuth } from '../abstract/base-platform-auth.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { PlatformClient } from '../abstract/platform-client.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TwitterProfile } from './twitter-profile.ts';
import { NearAuthService } from '../../security/near-auth-service.ts';

/**
 * Twitter Auth
 * Implements the PlatformAuth interface for Twitter
 */
export class TwitterAuth extends BasePlatformAuth implements PlatformAuth {
  constructor(
    env: Env,
    nearAuthService: NearAuthService,
    kvStore: PrefixedKvStore,
    private twitterClient: TwitterClient,
    private twitterProfile: TwitterProfile,
  ) {
    super(env, Platform.TWITTER, nearAuthService, kvStore);
  }

  /**
   * Get the platform client
   * @returns The platform client
   */
  getPlatformClient(): PlatformClient {
    return this.twitterClient;
  }

  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state
   */
  async initializeAuth(
    redirectUri: string,
    scopes: string[],
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Generate the OAuth 2.0 auth link with PKCE
      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        redirectUri,
        {
          scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        },
      );

      return {
        authUrl: url,
        state,
        codeVerifier,
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }

  /**
   * Exchange an authorization code for tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The user ID and tokens
   * @throws PlatformError if the exchange fails
   */
  protected async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<{ userId: string; token: AuthToken }> {
    try {
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Exchange the code for tokens using PKCE
      const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient
        .loginWithOAuth2({
          code,
          codeVerifier: codeVerifier || '',
          redirectUri,
        });

      // Get the user ID from the Twitter API
      const { data: userObject } = await loggedClient.v2.me();
      const userId = userObject.id;

      // Fetch and store the user profile
      // Pass isInitialAuth=true and the logged client to avoid token retrieval
      await this.twitterProfile.fetchUserProfile(userId, true, loggedClient);

      // Create tokens object
      const token: AuthToken = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: Date.now() + expiresIn * 1000,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        tokenType: TokenType.OAUTH2,
      };

      return {
        userId,
        token,
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }
}
