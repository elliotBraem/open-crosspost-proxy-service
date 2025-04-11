import { AuthToken, TokenType } from '../../src/infrastructure/storage/auth-token-storage.ts';
import { PlatformName } from '@crosspost/types';
import { mockToken } from './near-auth-service-mock.ts';

/**
 * Mock implementation of the TokenStorage class for testing
 */
export class TokenStorageMock {
  private tokens: Map<string, AuthToken> = new Map();

  constructor() {
    // Initialize with default mock token for test-user-id on twitter
    this.tokens.set('twitter:test-user-id', mockToken);
  }

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    const key = `${platform}:${userId}`;
    const token = this.tokens.get(key);

    if (!token) {
      const error = new Error(`Tokens not found for user ${userId} on platform ${platform}`);
      error.name = 'TokenNotFoundError';
      (error as any).userId = userId;
      (error as any).platform = platform;
      (error as any).details = { userId, platform, operation: 'getTokens' };
      throw error;
    }

    return token;
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param tokens The tokens to save
   * @param platform The platform name (e.g., 'twitter')
   */
  async saveTokens(userId: string, tokens: AuthToken, platform: PlatformName): Promise<void> {
    const key = `${platform}:${userId}`;
    this.tokens.set(key, tokens);
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    const key = `${platform}:${userId}`;
    this.tokens.delete(key);
  }

  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if tokens exist
   */
  async hasTokens(userId: string, platform: PlatformName): Promise<boolean> {
    const key = `${platform}:${userId}`;
    return this.tokens.has(key);
  }

  /**
   * Set a token for testing
   * @param userId The user ID
   * @param platform The platform name
   * @param token The token to set
   */
  setToken(userId: string, platform: PlatformName, token: AuthToken): void {
    const key = `${platform}:${userId}`;
    this.tokens.set(key, token);
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.tokens.clear();
  }
}

// Create a singleton instance
export const tokenStorageMock = new TokenStorageMock();
