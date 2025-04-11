import { Env } from '../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';

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
 * @param nearAuthService Token manager for handling tokens
 */
export async function linkAccountToNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  tokens: any,
  nearAuthService: NearAuthService,
): Promise<void> {
  try {
    // Save tokens to token storage
    await nearAuthService.saveTokens(userId, platform, tokens);

    // Link the account in NEAR auth service
    await nearAuthService.linkAccount(signerId, platform, userId);

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
 * @param nearAuthService Token manager for handling tokens
 */
export async function unlinkAccountFromNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  nearAuthService: NearAuthService,
): Promise<void> {
  try {
    // Unlink the account
    await nearAuthService.unlinkAccount(signerId, platform, userId);

    console.log(`Unlinked ${platform} account ${userId} from NEAR wallet ${signerId}`);
  } catch (error) {
    console.error(`Error unlinking ${platform} account from NEAR wallet:`, error);
    throw new Error(`Failed to unlink ${platform} account from NEAR wallet`);
  }
}

/**
 * Get all accounts linked to a NEAR wallet
 * @param signerId NEAR account ID
 * @param nearAuthService Token manager for handling tokens
 * @returns Array of platform and userId pairs
 */
export async function getLinkedAccounts(
  signerId: string,
  nearAuthService: NearAuthService,
): Promise<Array<{ platform: PlatformName; userId: string }>> {
  try {
    // Get all connected accounts
    return await nearAuthService.getLinkedAccounts(signerId);
  } catch (error) {
    console.error(`Error getting linked accounts for NEAR wallet:`, error);
    return [];
  }
}
