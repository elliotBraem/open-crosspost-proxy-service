import { ApiError, ApiErrorCode, PlatformName } from '@crosspost/types';
import { Context, NearSimpleSigning } from '../../../deps.ts';
import { Env } from '../../config/env.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';
import { AuthToken, TokenStorage } from '../storage/auth-token-storage.ts';
import { TokenAccessLogger } from './token-access-logger.ts';

/**
 * NEAR Authentication Data
 */
export interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: string;
  recipient?: string;
  callback_url?: string;
}

/**
 * NearAuthService
 * Centralized manager for NEAR authentication and token operations
 */
export class NearAuthService {
  /**
   * Get all platform accounts linked to a NEAR account
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async getLinkedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    try {
      return await this.listConnectedAccounts(signerId);
    } catch (error) {
      console.error(`Error getting linked accounts for NEAR account ${signerId}:`, error);
      return [];
    }
  }
  constructor(
    private env: Env,
    private tokenStorage: TokenStorage,
    private nearAuthKvStore: PrefixedKvStore,
    private tokenAccessLogger?: TokenAccessLogger,
  ) {}

  /**
   * Extract and validate NEAR auth data from request headers
   * @param c The Hono context
   * @returns Validated NEAR auth data and result
   */
  async extractAndValidateNearAuth(c: Context): Promise<{
    authData: NearAuthData;
    signerId: string;
  }> {
    // Extract NEAR auth data from Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError('Missing or invalid Authorization header', ApiErrorCode.UNAUTHORIZED, 401);
    }

    // Extract the token part (after 'Bearer ')
    const token = authHeader.substring(7);

    // Parse the JSON token
    let authObject: NearAuthData;
    try {
      authObject = JSON.parse(token);
    } catch (error) {
      throw new ApiError('Invalid JSON in Authorization token', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    // Validate required fields
    if (
      !authObject.account_id || !authObject.public_key || !authObject.signature ||
      !authObject.message || !authObject.nonce
    ) {
      throw new ApiError(
        'Missing required NEAR auth data in token',
        ApiErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Use validated data with defaults applied
    const authData = {
      ...authObject,
      recipient: authObject.recipient || 'crosspost.near',
      callback_url: authObject.callback_url || c.req.url, // Use current URL as callback if not provided
    };

    // Create a temporary NearSigner instance for validation
    const tempSigner = new NearSimpleSigning.NearSigner({
      networkId: 'mainnet', // This doesn't matter for validation
      nodeUrl: 'https://rpc.mainnet.near.org', // This doesn't matter for validation
      defaultRecipient: 'crosspost.near',
    });

    // Validate signature
    const result = await tempSigner.validateSignature(
      authData.signature,
      authData.message,
      authData.public_key,
      authData.nonce,
      authData.recipient,
    );

    if (!result.valid) {
      throw new ApiError(
        `NEAR auth failed: ${result.error}`,
        ApiErrorCode.UNAUTHORIZED,
        401,
      );
    }

    // The signerId is the account_id from the auth data
    const signerId = authData.account_id;

    // Check if the account is authorized
    const authStatus = await this.getNearAuthorizationStatus(signerId);
    if (authStatus < 0) { // -1 means not authorized
      throw new ApiError(
        'NEAR account is not authorized',
        ApiErrorCode.UNAUTHORIZED,
        401,
      );
    }

    return {
      authData,
      signerId,
    };
  }

  // ===== Token Storage Methods =====

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   * @throws Error if tokens are not found or expired
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    try {
      // Get tokens from TokenStorage
      const tokens = await this.tokenStorage.getTokens(userId, platform);

      // Check if tokens are expired
      if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
        // Tokens are expired, try to refresh them if a refresh token is available
        if (tokens.refreshToken) {
          console.log(`Tokens for ${userId} on ${platform} are expired. Attempting refresh.`);
          // The actual refresh will be handled by the platform auth service
          // This just returns the expired tokens, and the platform auth will handle refresh
          return tokens;
        } else {
          // No refresh token, delete the tokens
          await this.deleteTokens(userId, platform);
          throw new ApiError(
            'Tokens expired and no refresh token available',
            ApiErrorCode.UNAUTHORIZED,
            401,
          );
        }
      }

      return tokens;
    } catch (error) {
      console.error(`Error getting tokens for ${userId} on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @param tokens The tokens to save
   */
  async saveTokens(userId: string, platform: PlatformName, token: AuthToken): Promise<void> {
    try {
      // Save tokens to TokenStorage
      await this.tokenStorage.saveTokens(userId, token, platform);

      // Update tokens in NearAuthService for all linked NEAR accounts
      try {
        const linkedAccounts = await this.listConnectedAccounts(userId);
        for (const account of linkedAccounts) {
          if (account.platform === platform && account.userId === userId) {
            // Store reference to tokens in NearAuthService
            // We only store the userId and platform, not the actual tokens
            // This maintains the link between NEAR accounts and platform accounts
            await this.storeToken(account.userId, platform, userId, {
              userId,
              platform,
              linkedAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error(`Error updating token references for ${userId}:`, error);
        // Continue even if update fails - TokenStorage is updated
      }
    } catch (error) {
      console.error(`Error saving tokens for ${userId} on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    try {
      // Delete tokens from TokenStorage
      await this.tokenStorage.deleteTokens(userId, platform);

      // Update for all linked NEAR accounts
      try {
        const linkedAccounts = await this.listConnectedAccounts(userId);
        for (const account of linkedAccounts) {
          if (account.platform === platform && account.userId === userId) {
            // Remove token reference
            await this.deleteToken(account.userId, platform, userId);
          }
        }
      } catch (error) {
        console.error(`Error removing token references for ${userId}:`, error);
        // Continue even if update fails - TokenStorage is updated
      }
    } catch (error) {
      console.error(`Error deleting tokens for ${userId} on ${platform}:`, error);
      // Don't throw - deletion errors should not block the application
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
      return await this.tokenStorage.hasTokens(userId, platform);
    } catch (error) {
      console.error(`Error checking tokens for ${userId} on ${platform}:`, error);
      return false;
    }
  }

  // ===== NEAR Account Management Methods =====

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
    try {
      const key = ['token', signerId, platform, userId];
      await this.nearAuthKvStore.set(key, token);

      // Update the connected accounts index
      await this.addToConnectedAccountsIndex(signerId, platform, userId);
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }

  /**
   * Get a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Token or null if not found
   */
  async getToken(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<AuthToken | null> {
    try {
      const key = ['token', signerId, platform, userId];
      return await this.nearAuthKvStore.get(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Delete a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  async deleteToken(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      const key = ['token', signerId, platform, userId];
      await this.nearAuthKvStore.delete(key);

      // Update the connected accounts index
      await this.removeFromConnectedAccountsIndex(signerId, platform, userId);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.nearAuthKvStore.get<
        Array<{ platform: PlatformName; userId: string }>
      >(
        indexKey,
      );

      // Convert platform strings to PlatformName
      const typedAccounts = (accounts || []).map((account) => ({
        platform: account.platform as PlatformName,
        userId: account.userId,
      }));

      return typedAccounts;
    } catch (error) {
      console.error('Error listing connected accounts:', error);
      return [];
    }
  }

  /**
   * Add a connected account to the index
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  private async addToConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts =
        await this.nearAuthKvStore.get<Array<{ platform: PlatformName; userId: string }>>(
          indexKey,
        ) || [];

      // Check if the account is already in the index
      const exists = accounts.some((acc) => acc.platform === platform && acc.userId === userId);

      if (!exists) {
        accounts.push({ platform, userId });
        await this.nearAuthKvStore.set(indexKey, accounts);
      }
    } catch (error) {
      console.error('Error adding to connected accounts index:', error);
      throw new Error('Failed to update connected accounts index');
    }
  }

  /**
   * Remove a connected account from the index
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  private async removeFromConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.nearAuthKvStore.get<
        Array<{ platform: PlatformName; userId: string }>
      >(
        indexKey,
      );

      if (!accounts) {
        return;
      }

      // Filter out the account to remove
      const updatedAccounts = accounts.filter(
        (acc) => !(acc.platform === platform && acc.userId === userId),
      );

      await this.nearAuthKvStore.set(indexKey, updatedAccounts);
    } catch (error) {
      console.error('Error removing from connected accounts index:', error);
      throw new Error('Failed to update connected accounts index');
    }
  }

  /**
   * Link a NEAR account to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   */
  async linkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      // Store reference to tokens
      await this.storeToken(signerId, platform, userId, {
        userId,
        platform,
        linkedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `Error linking NEAR account ${signerId} to ${platform} account ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Unlink a NEAR account from a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   */
  async unlinkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      // Remove token reference
      await this.deleteToken(signerId, platform, userId);
    } catch (error) {
      console.error(
        `Error unlinking NEAR account ${signerId} from ${platform} account ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    try {
      const token = await this.getToken(signerId, platform, userId);
      return token !== null;
    } catch (error) {
      console.error(
        `Error checking access for NEAR account ${signerId} to ${platform} account ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Authorize a NEAR account for interaction with the proxy
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure of authorization
   */
  async authorizeNearAccount(signerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const key = [signerId];
      const value = { authorized: true, timestamp: new Date().toISOString() };
      await this.nearAuthKvStore.set(key, value);

      console.log(`NEAR account ${signerId} authorized successfully.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to store authorization';
      console.error(
        `Error authorizing NEAR account ${signerId}:`,
        errorMessage,
        error,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a NEAR account is authorized.
   * @param signerId NEAR account ID.
   * @returns True if the account is authorized, false otherwise.
   */
  async isNearAccountAuthorized(signerId: string): Promise<boolean> {
    try {
      const key = [signerId];
      const result = await this.nearAuthKvStore.get<{ authorized: boolean }>(key);

      return result?.authorized === true;
    } catch (error) {
      console.error(`Error checking authorization for NEAR account ${signerId}:`, error);
      return false; // Assume not authorized if there's an error
    }
  }

  /**
   * Unauthorize a NEAR account, removing its ability to interact with the proxy.
   * @param signerId The NEAR account ID to unauthorize.
   * @returns Result indicating success or failure.
   */
  async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = [signerId];
      // Check if the key exists before attempting deletion
      const existing = await this.nearAuthKvStore.get(key);
      if (existing === null) {
        console.log(`NEAR account ${signerId} was already not authorized.`);
        // Consider it a success if the goal state (unauthorized) is already met
        return { success: true };
      }

      await this.nearAuthKvStore.delete(key);

      console.log(`NEAR account ${signerId} unauthorized successfully.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to remove authorization';
      console.error(
        `Error unauthorizing NEAR account ${signerId}:`,
        errorMessage,
        error,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check the authorization status of a NEAR account
   * @param signerId NEAR account ID
   * @returns Authorization status:
   *   -1: Not authorized
   *    0: Authorized but no accounts connected
   *   >0: Number of connected accounts
   */
  async getNearAuthorizationStatus(signerId: string): Promise<number> {
    try {
      // First check if the account is authorized
      const isAuthorized = await this.isNearAccountAuthorized(signerId);

      if (!isAuthorized) {
        return -1; // Not authorized
      }

      // If authorized, check how many accounts are connected
      const linkedAccounts = await this.listConnectedAccounts(signerId);
      return linkedAccounts.length; // 0 if no accounts, >0 if accounts connected
    } catch (error) {
      console.error(`Error checking authorization status for NEAR account ${signerId}:`, error);
      return -1; // Default to not authorized on error
    }
  }
}
