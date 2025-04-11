/**
 * User Profile Schemas and Types
 * Defines Zod schemas for user profile-related data
 * TypeScript types are derived from Zod schemas for type safety
 */

import { z } from 'zod';
import { PlatformSchema } from './common.ts';
import { EnhancedResponseSchema } from './response.ts';

/**
 * User profile schema
 */
export const UserProfileSchema = z.object({
  userId: z.string().describe('User ID on the platform'),
  username: z.string().describe('Username on the platform'),
  url: z.string().url().optional().describe('URL to the user profile'),
  profileImageUrl: z.string().describe('URL to the user profile image'),
  isPremium: z.boolean().optional().describe('Whether the user has a premium account'),
  platform: PlatformSchema.describe('The platform the user profile is from'),
  lastUpdated: z.number().describe('Timestamp when the profile was last updated'),
}).describe('User profile');

/**
 * Profile refresh result schema
 */
export const ProfileRefreshResultSchema = z.object({
  success: z.boolean().describe('Whether the profile refresh was successful'),
  profile: UserProfileSchema.optional().describe('The refreshed user profile (if successful)'),
  error: z.string().optional().describe('Error message (if unsuccessful)'),
}).describe('Profile refresh result');

/**
 * Profile refresh response schema
 */
export const ProfileRefreshResponseSchema = EnhancedResponseSchema(
  ProfileRefreshResultSchema,
).describe('Profile refresh response');

// Derive TypeScript types from Zod schemas
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProfileRefreshResult = z.infer<typeof ProfileRefreshResultSchema>;
export type ProfileRefreshResponse = z.infer<typeof ProfileRefreshResponseSchema>;
