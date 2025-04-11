import { Platform, PlatformName, UserProfile } from '@crosspost/types';
import { Env } from '../../config/env.ts';
import { DEFAULT_CONFIG } from '../../config/index.ts';
import {
  AuthState,
  PlatformAuth,
} from '../../infrastructure/platform/abstract/platform-auth.interface.ts';
import { PlatformProfile } from '../../infrastructure/platform/abstract/platform-profile.interface.ts';
import { TwitterAuth } from '../../infrastructure/platform/twitter/twitter-auth.ts';
import { TwitterProfile } from '../../infrastructure/platform/twitter/twitter-profile.ts';
import { NearAuthService } from '../../infrastructure/security/near-auth-service.ts';
import { AuthToken } from '../../infrastructure/storage/auth-token-storage.ts';
import { linkAccountToNear } from '../../utils/account-linking.utils.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';

/**
 * Auth Service
 * Domain service for authentication-related operations
 */
export class AuthService {
  constructor(
    private env: Env,
    private nearAuthService: NearAuthService,
    private authStateStore: PrefixedKvStore,
    private platformAuthMap: Map<PlatformName, PlatformAuth>,
    private platformProfileMap: Map<PlatformName, PlatformProfile>,
  ) {}

  /**
   * Get the platform-specific auth implementation
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns The platform-specific auth implementation
   * @throws Error if the platform is not supported
   */
  getPlatformAuth(platform: PlatformName): PlatformAuth {
    const platformAuth = this.platformAuthMap.get(platform.toLowerCase() as PlatformName);
    if (!platformAuth) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return platformAuth;
  }

  /**
   * Get the platform-specific profile implementation
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns The platform-specific profile implementation
   * @throws Error if the platform is not supported
   */
  getPlatformProfile(platform: PlatformName): PlatformProfile {
    const platformProfile = this.platformProfileMap.get(platform.toLowerCase() as PlatformName);
    if (!platformProfile) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return platformProfile;
  }

  /**
   * Initialize the authentication process
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    platform: PlatformName,
    signerId: string,
    redirectUri: string,
    scopes: string[] = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
    successUrl: string,
    errorUrl?: string,
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      // Get platform specific auth service
      const platformAuth = this.getPlatformAuth(platform);
      const result = await platformAuth.initializeAuth(redirectUri, scopes);
      const { state, codeVerifier } = result;

      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier: codeVerifier || '',
        state,
        createdAt: Date.now(),
        successUrl: successUrl,
        errorUrl: errorUrl || successUrl,
        signerId, // Store the NEAR account ID
      };

      // Store the state in KV with 1 hour expiration, this is needed for the callback
      await this.authStateStore.set([state], authState, {
        expireIn: 3600000, // 1 hour in milliseconds
      });

      return result;
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
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
      // Get the auth state directly from the authStateStore
      const authState = await this.authStateStore.get<AuthState>([state]);

      if (!authState) {
        return null;
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
   * Handle the OAuth callback
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    platform: PlatformName,
    code: string,
    state: string,
  ): Promise<{ userId: string; token: AuthToken; successUrl: string }> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.handleCallback(code, state);
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Refresh a user's access token
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(platform: PlatformName, userId: string): Promise<AuthToken> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.refreshToken(userId);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Revoke a user's tokens
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(platform: PlatformName, userId: string): Promise<boolean> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.revokeToken(userId);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }

  /**
   * Check if a user has valid tokens
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID to check
   * @returns True if the user has valid tokens
   */
  async hasValidTokens(platform: PlatformName, userId: string): Promise<boolean> {
    try {
      return await this.nearAuthService.hasTokens(userId, platform);
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }

  /**
   * Link a social media account to a NEAR wallet
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Success status
   */
  async linkAccount(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<boolean> {
    try {
      // Get the tokens for the user
      const platformAuth = this.getPlatformAuth(platform);
      const tokens = await platformAuth.refreshToken(userId);

      // Link the account using the utility function
      await linkAccountToNear(signerId, platform, userId, tokens, this.nearAuthService);

      return true;
    } catch (error) {
      console.error(`Error linking ${platform} account to NEAR wallet:`, error);
      throw new Error(`Failed to link ${platform} account to NEAR wallet`);
    }
  }

  /**
   * Get a user's profile
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  async getUserProfile(
    platform: PlatformName,
    userId: string,
    forceRefresh = false,
  ): Promise<UserProfile | null> {
    try {
      const platformProfile = this.getPlatformProfile(platform);
      return await platformProfile.getUserProfile(userId, forceRefresh);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    try {
      return await this.nearAuthService.hasAccess(signerId, platform, userId);
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }
}
