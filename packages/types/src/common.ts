/**
 * Common Schemas and Types
 * Defines common Zod schemas and derived TypeScript types used across the API
 */

import { z } from 'zod';

/**
 * Platform schema
 */
export const PlatformSchema = z.enum([
  'unknown',
  'twitter',
  // Add more platforms as they're implemented
  // 'linkedin',
  // 'facebook',
  // 'instagram',
]).describe('Social media platform');

// Derive TypeScript types from Zod schemas
export type PlatformName = z.infer<typeof PlatformSchema>;

/**
 * Enum for supported platforms (for backward compatibility)
 */
export enum Platform {
  UNKNOWN = 'unknown',
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}
