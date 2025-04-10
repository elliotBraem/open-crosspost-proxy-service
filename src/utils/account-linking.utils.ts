import { Env } from '../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { TokenManager } from '../infrastructure/security/token-manager.ts';

/**
 * Account Linking Utilities
 * Common functions for linking social media accounts to NEAR wallets
 */

/**
 * Link a social media account to a NEAR wallet
 * @param signerId NEAR account ID
 * @param platform Platform name (e.g., Platform.TWITTER)
 * @param userId User ID on the platform
 * @param tokens Tokens for the platform
 * @param env Environment configuration
 */
export async function linkAccountToNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  tokens: any,
  env: Env,
): Promise<void> {
  try {
    // Create token manager
    const tokenManager = new TokenManager(env);

    // Save tokens to token storage
    await tokenManager.saveTokens(userId, platform, tokens);
    
    // Link the account in NEAR auth service
    await tokenManager.linkAccount(signerId, platform, userId);

    console.log(`Linked ${platform} account ${userId} to NEAR wallet ${signerId}`);
  } catch (error) {
    console.error(`Error linking ${platform} account to NEAR wallet:`, error);
    throw new Error(`Failed to link ${platform} account to NEAR wallet`);
  }
}

/**
 * Unlink a social media account from a NEAR wallet
 * @param signerId NEAR account ID
 * @param platform Platform name (e.g., Platform.TWITTER)
 * @param userId User ID on the platform
 * @param env Environment configuration
 */
export async function unlinkAccountFromNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  env: Env,
): Promise<void> {
  try {
    // Create token manager
    const tokenManager = new TokenManager(env);

    // Unlink the account
    await tokenManager.unlinkAccount(signerId, platform, userId);

    console.log(`Unlinked ${platform} account ${userId} from NEAR wallet ${signerId}`);
  } catch (error) {
    console.error(`Error unlinking ${platform} account from NEAR wallet:`, error);
    throw new Error(`Failed to unlink ${platform} account from NEAR wallet`);
  }
}

/**
 * Get all accounts linked to a NEAR wallet
 * @param signerId NEAR account ID
 * @param env Environment configuration
 * @returns Array of platform and userId pairs
 */
export async function getLinkedAccounts(
  signerId: string,
  env: Env,
): Promise<Array<{ platform: PlatformName; userId: string }>> {
  try {
    // Create token manager
    const tokenManager = new TokenManager(env);

    // Get all connected accounts
    return await tokenManager.getLinkedAccounts(signerId);
  } catch (error) {
    console.error(`Error getting linked accounts for NEAR wallet:`, error);
    return [];
  }
}
