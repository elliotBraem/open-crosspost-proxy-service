/**
 * Token Type enum
 */
export enum TokenType {
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenSecret?: string;
  expiresAt?: number;
  scope?: string | string[];
  tokenType: TokenType | string;
}

import { Env } from '../../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';
import { TokenAccessLogger, TokenOperation } from '../security/token-access-logger.ts';

/**
 * Token Storage using Deno KV
 * Handles secure storage and retrieval of OAuth tokens
 */
export class TokenStorage {
  // Version constants for encryption
  private readonly ENCRYPTION_VERSION_1 = 0x01;
  private readonly CURRENT_ENCRYPTION_VERSION = this.ENCRYPTION_VERSION_1;

  constructor(
    private encryptionKey: string,
    private tokenStore: PrefixedKvStore,
    private logger: TokenAccessLogger,
  ) {}

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   * @throws Error if tokens are not found
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    try {
      // Use platform-specific key with PrefixedKvStore
      const encryptedTokens = await this.tokenStore.get<string>([platform, userId]);

      if (!encryptedTokens) {
        await this.logger.logAccess(TokenOperation.GET, userId, false, 'Tokens not found');

        const error = new Error(`Tokens not found for user ${userId} on platform ${platform}`);
        error.name = 'TokenNotFoundError';
        (error as any).userId = userId;
        (error as any).platform = platform;

        throw error;
      }

      // Decrypt the tokens
      const tokens = await this.decryptTokens(encryptedTokens);

      // Log successful access
      await this.logger.logAccess(TokenOperation.GET, userId, true);

      return tokens;
    } catch (error) {
      // Log failed access
      await this.logger.logAccess(
        TokenOperation.GET,
        userId,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('Error getting tokens:', error);

      const enhancedError = new Error('Failed to retrieve tokens');
      enhancedError.name = 'TokenRetrievalError';

      throw enhancedError;
    }
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param tokens The tokens to save
   * @param platform The platform name (e.g., 'twitter')
   */
  async saveTokens(userId: string, tokens: AuthToken, platform: PlatformName): Promise<void> {
    try {
      // Encrypt the tokens
      const encryptedTokens = await this.encryptTokens(tokens);

      // Save the encrypted tokens to KV using platform-specific key with PrefixedKvStore
      await this.tokenStore.set([platform, userId], encryptedTokens);

      // Log successful save
      await this.logger.logAccess(TokenOperation.SAVE, userId, true);
    } catch (error) {
      // Log failed save
      await this.logger.logAccess(
        TokenOperation.SAVE,
        userId,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('Error saving tokens:', error);
      throw new Error('Failed to save tokens');
    }
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    try {
      // Delete the tokens from KV using platform-specific key with PrefixedKvStore
      await this.tokenStore.delete([platform, userId]);

      // Log successful deletion
      await this.logger.logAccess(TokenOperation.DELETE, userId, true);
    } catch (error) {
      // Log failed deletion
      await this.logger.logAccess(
        TokenOperation.DELETE,
        userId,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('Error deleting tokens:', error);
      throw new Error('Failed to delete tokens');
    }
  }

  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if tokens exist
   */
  async hasTokens(userId: string, platform: PlatformName): Promise<boolean> {
    try {
      // Check if tokens exist in KV using platform-specific key with PrefixedKvStore
      const tokens = await this.tokenStore.get([platform, userId]);
      const exists = tokens !== null;

      // Log check operation
      await this.logger.logAccess(TokenOperation.CHECK, userId, true);

      return exists;
    } catch (error) {
      // Log failed check
      await this.logger.logAccess(
        TokenOperation.CHECK,
        userId,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('Error checking tokens:', error);
      return false;
    }
  }

  /**
   * Encrypt tokens
   * @param tokens The tokens to encrypt
   * @returns The encrypted tokens
   */
  private async encryptTokens(tokens: AuthToken): Promise<string> {
    try {
      // Get the encryption key bytes
      const rawKeyData = new TextEncoder().encode(this.encryptionKey);

      // Normalize the key to a valid AES-GCM size (16, 24, or 32 bytes)
      // We'll use a cryptographic hash to derive a key of the right size
      let keyData: Uint8Array;

      if (rawKeyData.length === 16 || rawKeyData.length === 24 || rawKeyData.length === 32) {
        // Key is already a valid size, use it directly
        keyData = rawKeyData;
      } else {
        // Use SHA-256 to derive a 32-byte key
        const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);
        keyData = new Uint8Array(hashBuffer);
      }

      // Convert the encryption key to a CryptoKey
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt'],
      );

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Convert tokens to string
      const tokenString = JSON.stringify(tokens);
      const tokenData = new TextEncoder().encode(tokenString);

      // Encrypt the tokens
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        tokenData,
      );

      // Create result with version byte + IV + encrypted data
      const result = new Uint8Array(1 + iv.length + encryptedData.byteLength);
      result[0] = this.CURRENT_ENCRYPTION_VERSION; // Version byte
      result.set(iv, 1);
      result.set(new Uint8Array(encryptedData), 1 + iv.length);

      // Return as base64 string
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('Error encrypting tokens:', error);
      throw new Error('Failed to encrypt tokens');
    }
  }

  /**
   * Decrypt tokens
   * @param encryptedTokens The encrypted tokens
   * @returns The decrypted tokens
   */
  private async decryptTokens(encryptedTokens: string): Promise<AuthToken> {
    try {
      // Get the encryption key bytes
      const rawKeyData = new TextEncoder().encode(this.encryptionKey);

      // Normalize the key to a valid AES-GCM size (16, 24, or 32 bytes)
      // We'll use a cryptographic hash to derive a key of the right size
      let keyData: Uint8Array;

      if (rawKeyData.length === 16 || rawKeyData.length === 24 || rawKeyData.length === 32) {
        // Key is already a valid size, use it directly
        keyData = rawKeyData;
      } else {
        // Use SHA-256 to derive a 32-byte key
        const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);
        keyData = new Uint8Array(hashBuffer);
      }

      // Convert the encryption key to a CryptoKey
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      // Convert base64 to Uint8Array
      const data = Uint8Array.from(atob(encryptedTokens), (c) => c.charCodeAt(0));

      // Check if the data has a version byte
      if (data.length > 0) {
        const version = data[0];

        // Handle different versions
        if (version === this.ENCRYPTION_VERSION_1) {
          // Version 1: version byte + 12-byte IV + encrypted data
          const iv = data.slice(1, 13);
          const encryptedData = data.slice(13);

          // Decrypt the tokens
          const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData,
          );

          // Convert to string and parse JSON
          const tokenString = new TextDecoder().decode(decryptedData);
          return JSON.parse(tokenString);
        } else {
          // Legacy format (no version byte): IV + encrypted data
          // This handles tokens encrypted with the old format
          const iv = data.slice(0, 12);
          const encryptedData = data.slice(12);

          // Decrypt the tokens
          const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData,
          );

          // Convert to string and parse JSON
          const tokenString = new TextDecoder().decode(decryptedData);
          return JSON.parse(tokenString);
        }
      } else {
        throw new Error('Invalid encrypted data format');
      }
    } catch (error) {
      console.error('Error decrypting tokens:', error);
      throw new Error('Failed to decrypt tokens');
    }
  }
}
