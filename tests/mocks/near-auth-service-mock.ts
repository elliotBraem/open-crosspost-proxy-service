import { Context } from 'hono';
import { PlatformName } from '@crosspost/types';
import { AuthToken } from '../../src/infrastructure/storage/auth-token-storage.ts';
import { mockKvStore } from './kv-store-mock.ts';

/**
 * Mock implementation of the NearAuthService for testing
 */

// Mock token
export const mockToken = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
  tokenType: 'oauth2',
};

// Mock NEAR auth data
export const mockNearAuthData = {
  account_id: 'test.near',
  public_key: 'ed25519:mock-public-key',
  signature: 'mock-signature',
  message: 'mock-message',
  nonce: 'mock-nonce',
  recipient: 'crosspost.near',
};

// Mock NearAuthService
export class MockNearAuthService {
  // Required properties to match NearAuthService interface
  tokenStorage: any = {};
  nearAuthKvStore: any = mockKvStore;

  constructor(private env: any = {}) {}

  /**
   * Extract and validate NEAR auth data from request headers
   * @param c The Hono context
   * @returns Validated NEAR auth data and result
   */
  async extractAndValidateNearAuth(c: Context): Promise<{
    authData: any;
    signerId: string;
  }> {
    return {
      authData: mockNearAuthData,
      signerId: 'test.near',
    };
  }

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    return mockToken;
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @param token The tokens to save
   */
  async saveTokens(userId: string, platform: PlatformName, token: AuthToken): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if tokens exist
   */
  async hasTokens(userId: string, platform: PlatformName): Promise<boolean> {
    return true;
  }

  /**
   * Store a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @param token Token to store
   */
  async storeToken(
    signerId: string,
    platform: PlatformName,
    userId: string,
    token: any,
  ): Promise<void> {
    const key = ['token', signerId, platform, userId];
    await mockKvStore.set(key, token);
  }

  /**
   * Get a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Token or null if not found
   */
  async getToken(signerId: string, platform: PlatformName, userId: string): Promise<any | null> {
    // Always return the mock token for testing
    return mockToken;
  }

  /**
   * Delete a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  async deleteToken(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    const key = ['token', signerId, platform, userId];
    await mockKvStore.delete(key);
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    return [
      { platform: 'twitter' as PlatformName, userId: 'test-user-id' },
    ];
  }

  /**
   * Check if a NEAR account is authorized
   * @param signerId NEAR account ID
   * @returns True if the account is authorized, false otherwise
   */
  async isNearAccountAuthorized(signerId: string): Promise<boolean> {
    return true; // Always authorized for testing
  }

  /**
   * Authorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  async authorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Unauthorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Get the authorization status of a NEAR account
   * @param signerId NEAR account ID
   * @returns Authorization status
   */
  async getNearAuthorizationStatus(signerId: string): Promise<number> {
    return 1; // Authorized with 1 connected account
  }

  /**
   * Link a NEAR account to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   */
  async linkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    await this.storeToken(signerId, platform, userId, {
      userId,
      platform,
      linkedAt: new Date().toISOString(),
    });
  }

  /**
   * Unlink a NEAR account from a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   */
  async unlinkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    await this.deleteToken(signerId, platform, userId);
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    return true;
  }

  /**
   * Get linked accounts for a NEAR account
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async getLinkedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    return this.listConnectedAccounts(signerId);
  }
}

// Create a singleton instance for use in tests
export const nearAuthServiceMock = new MockNearAuthService();
