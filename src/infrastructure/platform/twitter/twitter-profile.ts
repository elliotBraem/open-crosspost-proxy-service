import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { PlatformProfile } from '../abstract/platform-profile.interface.ts';
import { UserProfileStorage } from '../../storage/user-profile-storage.ts';
import { TwitterClient } from './twitter-client.ts';
import { UserProfile } from '@crosspost/types';

/**
 * Twitter Profile
 * Implements the PlatformProfile interface for Twitter
 */
export class TwitterProfile implements PlatformProfile {
  constructor(
    private env: Env,
    private twitterClient: TwitterClient,
    private profileStorage: UserProfileStorage,
  ) {}

  /**
   * Get a user's profile, fetching from the API if needed
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    try {
      // Get the profile from storage
      const profile = await this.profileStorage.getProfile(userId, 'twitter');

      // Check if we need to refresh the profile
      if (forceRefresh || this.profileStorage.needsRefresh(profile)) {
        return await this.fetchUserProfile(userId);
      }

      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Fetch a user's profile from the Twitter API
   * @param userId The user ID to fetch the profile for
   * @param isInitialAuth Whether this is being called during initial authentication
   * @param providedClient Optional Twitter client to use (for initial auth)
   * @returns The user profile or null if not found
   */
  async fetchUserProfile(
    userId: string,
    isInitialAuth = false,
    providedClient?: TwitterApi,
  ): Promise<UserProfile | null> {
    try {
      // Use provided client or get a new one
      let client: TwitterApi;

      if (isInitialAuth && providedClient) {
        // During initial auth, use the provided client
        client = providedClient;
      } else {
        // Otherwise, get a client for the user (which requires tokens)
        client = await this.twitterClient.getClientForUser(userId);
      }

      // Fetch the user data from the Twitter API with expanded fields
      const { data: user } = await client.v2.user(userId, {
        'user.fields': 'profile_image_url,username,url,verified',
      });

      if (!user) {
        return null;
      }

      // Create a user profile object
      const profile = this.createUserProfile(user);

      // Save the profile
      await this.profileStorage.saveProfile(profile);

      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Create a user profile object from Twitter API user data
   * @param user Twitter API user data
   * @returns User profile object
   */
  private createUserProfile(user: any): UserProfile {
    const profile: UserProfile = {
      userId: user.id,
      username: user.username,
      profileImageUrl: user.profile_image_url || '',
      isPremium: user.verified || false, // Use verified as a proxy for premium status
      platform: 'twitter',
      lastUpdated: Date.now(),
    };

    // Add URL if provided, otherwise generate it for Twitter
    if (user.url) {
      profile.url = user.url;
    } else {
      profile.url = `https://x.com/${user.username}`;
    }

    return profile;
  }
}
