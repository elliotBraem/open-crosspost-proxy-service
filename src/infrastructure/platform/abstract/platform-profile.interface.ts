import { UserProfile } from '@crosspost/types';

/**
 * Platform Profile Interface
 * Defines the common interface for platform-specific profile implementations
 */
export interface PlatformProfile {
  /**
   * Get a user's profile, fetching from the API if needed
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  getUserProfile(userId: string, forceRefresh?: boolean): Promise<UserProfile | null>;

  /**
   * Fetch a user's profile from the platform API
   * @param userId The user ID to fetch the profile for
   * @param isInitialAuth Whether this is being called during initial authentication
   * @param providedClient Optional platform client to use (for initial auth)
   * @returns The user profile or null if not found
   */
  fetchUserProfile(
    userId: string,
    isInitialAuth?: boolean,
    providedClient?: any,
  ): Promise<UserProfile | null>;
}
