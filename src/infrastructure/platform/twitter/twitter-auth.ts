import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { linkAccountToNear } from '../../../utils/account-linking.utils.ts';
import { TokenStorage, TokenType, TwitterTokens } from '../../storage/token-storage.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TwitterProfile } from './twitter-profile.ts';

// Define the auth state structure
interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
  successUrl: string; // Store the original client return URL
  errorUrl: string; // Store the URL to redirect to on error
  signerId: string; // Store the NEAR account ID for linking
}

/**
 * Twitter Auth
 * Implements the PlatformAuth interface for Twitter
 */
export class TwitterAuth implements PlatformAuth {
  private env: Env;
  private twitterClient: TwitterClient;
  private twitterProfile: TwitterProfile;
  private tokenStorage: TokenStorage;
  private kv: Deno.Kv | null = null;

  constructor(env: Env) {
    this.env = env;
    this.twitterClient = new TwitterClient(env);
    this.twitterProfile = new TwitterProfile(env);
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, env);
  }

  /**
   * Initialize the KV store
   */
  private async initializeKv(): Promise<void> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
  }

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  async getAuthState(
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null> {
    try {
      // Initialize KV store
      await this.initializeKv();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Get the auth state from KV
      const authStateEntry = await this.kv.get<AuthState>(['auth', state]);
      const authState = authStateEntry.value;

      if (!authState) {
        return null;
      }

      // Ensure signerId is always returned
      if (!authState.signerId) {
        console.warn('Auth state missing signerId, using default');
        return {
          successUrl: authState.successUrl,
          errorUrl: authState.errorUrl,
          signerId: 'unknown.near', // Default value if missing
        };
      }

      return {
        successUrl: authState.successUrl,
        errorUrl: authState.errorUrl,
        signerId: authState.signerId,
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  /**
   * Initialize the authentication process
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    signerId: string,
    redirectUri: string,
    scopes: string[],
    successUrl?: string,
    errorUrl?: string,
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

      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier,
        state,
        createdAt: Date.now(),
        successUrl: successUrl || redirectUri, // Use redirect URI as fallback
        errorUrl: errorUrl || (successUrl || redirectUri), // Use success URL or redirect URI as fallback
        signerId, // Store the NEAR account ID
      };

      // Initialize KV store
      await this.initializeKv();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Store the state in KV with 1 hour expiration
      await this.kv.set(['auth', state], authState, {
        expireIn: 3600000, // 1 hour in milliseconds
      });

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
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: TwitterTokens; successUrl: string }> {
    try {
      // Initialize KV store
      await this.initializeKv();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Get the auth state from KV
      const authStateEntry = await this.kv.get<AuthState>(['auth', state]);
      const authState = authStateEntry.value;

      if (!authState) {
        throw new Error('Invalid or expired state');
      }

      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Exchange the code for tokens using PKCE
      const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient
        .loginWithOAuth2({
          code,
          codeVerifier: authState.codeVerifier,
          redirectUri: authState.redirectUri,
        });

      // Get the user ID from the Twitter API
      const { data: userObject } = await loggedClient.v2.me();
      const userId = userObject.id;

      // Fetch and store the user profile
      await this.twitterProfile.fetchUserProfile(userId);

      // Create tokens object
      const tokens: TwitterTokens = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: Date.now() + expiresIn * 1000,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        tokenType: TokenType.OAUTH2,
      };

      // Save the tokens
      await this.tokenStorage.saveTokens(userId, tokens, 'twitter');

      // Link the Twitter account to the NEAR wallet
      await linkAccountToNear(authState.signerId, 'twitter', userId, tokens, this.env);

      // Delete the auth state from KV
      await this.kv.delete(['auth', state]);

      return {
        userId,
        tokens,
        successUrl: authState.successUrl,
      };
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Refresh a user's access token
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(userId: string): Promise<TwitterTokens> {
    try {
      // Get the current tokens
      const tokens = await this.tokenStorage.getTokens(userId, 'twitter');

      // Check if refresh token exists
      if (!tokens.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      try {
        // Refresh the token
        const { accessToken, refreshToken: newRefreshToken, expiresIn } = await twitterClient
          .refreshOAuth2Token(tokens.refreshToken);

        // Create new tokens object
        const newTokens: TwitterTokens = {
          accessToken,
          refreshToken: newRefreshToken || tokens.refreshToken, // Use old refresh token if new one isn't provided
          expiresAt: Date.now() + expiresIn * 1000,
          scope: tokens.scope,
          tokenType: TokenType.OAUTH2,
        };

        // Save the new tokens
        await this.tokenStorage.saveTokens(userId, newTokens, 'twitter');

        return newTokens;
      } catch (error: any) {
        // Handle specific Twitter API error for invalid token
        if (
          error.data?.error === 'invalid_request' ||
          (error.status === 400 && error.code === 'invalid_grant')
        ) {
          await this.tokenStorage.deleteTokens(userId, 'twitter');
          throw new Error('User authentication expired. Please reconnect your Twitter account.');
        }

        throw error;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(userId: string): Promise<boolean> {
    try {
      // Get the tokens from storage
      const tokens = await this.tokenStorage.getTokens(userId, 'twitter');

      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      try {
        // Revoke the OAuth 2.0 tokens
        if (tokens.accessToken) {
          await twitterClient.revokeOAuth2Token(tokens.accessToken, 'access_token');
        }

        if (tokens.refreshToken) {
          await twitterClient.revokeOAuth2Token(tokens.refreshToken, 'refresh_token');
        }
      } catch (error) {
        // Log but continue - we still want to delete the tokens locally
        console.error('Error revoking tokens with Twitter API:', error);
      }

      // Delete the tokens from storage
      await this.tokenStorage.deleteTokens(userId, 'twitter');

      // No need to explicitly delete the profile here as it's handled by the token storage

      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }
}
