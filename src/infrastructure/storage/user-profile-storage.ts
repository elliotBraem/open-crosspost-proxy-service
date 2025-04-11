import { Env } from '../../config/env.ts';
import { PlatformName, UserProfile } from '@crosspost/types';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';

/**
 * User Profile Storage using Deno KV
 * Handles storage and retrieval of user profiles
 */
export class UserProfileStorage {
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor(
    private env: Env,
    private profileStore: PrefixedKvStore,
  ) {}

  /**
   * Get a user profile
   * @param userId The user ID
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user profile or null if not found
   */
  async getProfile(userId: string, platform: PlatformName): Promise<UserProfile | null> {
    try {
      // Get the profile from KV using PrefixedKvStore
      return await this.profileStore.get<UserProfile>([platform, userId]);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Save a user profile
   * @param profile The user profile to save
   * @returns True if the profile was saved successfully
   */
  async saveProfile(profile: UserProfile): Promise<boolean> {
    try {
      // Set the last updated timestamp
      profile.lastUpdated = Date.now();

      // Save the profile to KV using PrefixedKvStore
      await this.profileStore.set([profile.platform, profile.userId], profile);
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  }

  /**
   * Delete a user profile
   * @param userId The user ID
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if the profile was deleted successfully
   */
  async deleteProfile(userId: string, platform: PlatformName): Promise<boolean> {
    try {
      // Delete the profile from KV using PrefixedKvStore
      await this.profileStore.delete([platform, userId]);
      return true;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }
  }

  /**
   * Check if a profile needs to be refreshed
   * @param profile The user profile to check
   * @returns True if the profile needs to be refreshed
   */
  needsRefresh(profile: UserProfile | null): boolean {
    if (!profile || !profile.lastUpdated) {
      return true;
    }

    const now = Date.now();
    return now - profile.lastUpdated > this.CACHE_DURATION_MS;
  }
}
