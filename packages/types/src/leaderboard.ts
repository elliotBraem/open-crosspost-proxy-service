/**
 * Leaderboard Schemas and Types
 * Defines Zod schemas for leaderboard-related requests and responses
 * TypeScript types are derived from Zod schemas for type safety
 */

import { z } from 'zod';
import { EnhancedResponseSchema } from './response.ts';
import { PlatformSchema } from './common.ts';

/**
 * Leaderboard query schema
 */
export const LeaderboardQuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).optional().describe(
    'Timeframe for the leaderboard',
  ),
  limit: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(1).max(100).optional())
    .describe('Maximum number of results to return (1-100)'),
  offset: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(0).optional())
    .describe('Offset for pagination'),
}).describe('Leaderboard query');

/**
 * Account activity entry schema
 */
export const AccountActivityEntrySchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  totalPosts: z.number().describe('Total number of posts'),
  totalLikes: z.number().describe('Total number of likes'),
  totalReposts: z.number().describe('Total number of reposts'),
  totalReplies: z.number().describe('Total number of replies'),
  totalQuotes: z.number().describe('Total number of quote posts'),
  totalScore: z.number().describe('Total activity score'),
  rank: z.number().describe('Rank on the leaderboard'),
  lastActive: z.string().datetime().describe('Timestamp of last activity'),
}).describe('Account activity entry');

/**
 * Leaderboard response schema
 */
export const LeaderboardResponseSchema = EnhancedResponseSchema(
  z.object({
    timeframe: z.enum(['day', 'week', 'month', 'all']).describe('Timeframe for the leaderboard'),
    entries: z.array(AccountActivityEntrySchema).describe('Leaderboard entries'),
    total: z.number().describe('Total number of entries in the leaderboard'),
    limit: z.number().describe('Maximum number of results returned'),
    offset: z.number().describe('Offset for pagination'),
    generatedAt: z.string().datetime().describe('Timestamp when the leaderboard was generated'),
  }),
).describe('Leaderboard response');

/**
 * Account activity params schema
 */
export const AccountActivityParamsSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
}).describe('Account activity params');

/**
 * Account activity query schema
 */
export const AccountActivityQuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).optional().describe(
    'Timeframe for the activity',
  ),
}).describe('Account activity query');

/**
 * Platform activity schema
 */
export const PlatformActivitySchema = z.object({
  platform: PlatformSchema,
  posts: z.number().describe('Number of posts on this platform'),
  likes: z.number().describe('Number of likes on this platform'),
  reposts: z.number().describe('Number of reposts on this platform'),
  replies: z.number().describe('Number of replies on this platform'),
  quotes: z.number().describe('Number of quote posts on this platform'),
  score: z.number().describe('Activity score on this platform'),
  lastActive: z.string().datetime().describe('Timestamp of last activity on this platform'),
}).describe('Platform activity');

/**
 * Account activity response schema
 */
export const AccountActivityResponseSchema = EnhancedResponseSchema(
  z.object({
    signerId: z.string().describe('NEAR account ID'),
    timeframe: z.enum(['day', 'week', 'month', 'all']).describe('Timeframe for the activity'),
    totalPosts: z.number().describe('Total number of posts across all platforms'),
    totalLikes: z.number().describe('Total number of likes across all platforms'),
    totalReposts: z.number().describe('Total number of reposts across all platforms'),
    totalReplies: z.number().describe('Total number of replies across all platforms'),
    totalQuotes: z.number().describe('Total number of quote posts across all platforms'),
    totalScore: z.number().describe('Total activity score across all platforms'),
    rank: z.number().describe('Rank on the leaderboard'),
    lastActive: z.string().datetime().describe('Timestamp of last activity across all platforms'),
    platforms: z.array(PlatformActivitySchema).describe('Activity breakdown by platform'),
  }),
).describe('Account activity response');

/**
 * Account posts params schema
 */
export const AccountPostsParamsSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
}).describe('Account posts params');

/**
 * Account posts query schema
 */
export const AccountPostsQuerySchema = z.object({
  platform: z.string().optional().describe('Filter by platform (optional)'),
  limit: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(1).max(100).optional())
    .describe('Maximum number of results to return (1-100)'),
  offset: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(0).optional())
    .describe('Offset for pagination'),
  type: z.enum(['post', 'repost', 'reply', 'quote', 'like', 'all']).optional().describe(
    'Filter by post type (optional)',
  ),
}).describe('Account posts query');

/**
 * Account post schema
 */
export const AccountPostSchema = z.object({
  id: z.string().describe('Post ID'),
  platform: PlatformSchema,
  type: z.enum(['post', 'repost', 'reply', 'quote', 'like']).describe('Type of post'),
  content: z.string().optional().describe('Post content (if available)'),
  url: z.string().url().optional().describe('URL to the post on the platform (if available)'),
  createdAt: z.string().datetime().describe('Timestamp when the post was created'),
  metrics: z.object({
    likes: z.number().optional().describe('Number of likes (if available)'),
    reposts: z.number().optional().describe('Number of reposts (if available)'),
    replies: z.number().optional().describe('Number of replies (if available)'),
    quotes: z.number().optional().describe('Number of quotes (if available)'),
  }).optional().describe('Post metrics (if available)'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to (if applicable)'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting (if applicable)'),
}).describe('Account post');

/**
 * Account posts response schema
 */
export const AccountPostsResponseSchema = EnhancedResponseSchema(
  z.object({
    signerId: z.string().describe('NEAR account ID'),
    posts: z.array(AccountPostSchema).describe('List of posts'),
    total: z.number().describe('Total number of posts matching the query'),
    limit: z.number().describe('Maximum number of results returned'),
    offset: z.number().describe('Offset for pagination'),
    platform: z.string().optional().describe('Platform filter (if applied)'),
    type: z.enum(['post', 'repost', 'reply', 'quote', 'like', 'all']).optional().describe(
      'Post type filter (if applied)',
    ),
  }),
).describe('Account posts response');

// Derive TypeScript types from Zod schemas
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type AccountActivityEntry = z.infer<typeof AccountActivityEntrySchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type AccountActivityParams = z.infer<typeof AccountActivityParamsSchema>;
export type AccountActivityQuery = z.infer<typeof AccountActivityQuerySchema>;
export type PlatformActivity = z.infer<typeof PlatformActivitySchema>;
export type AccountActivityResponse = z.infer<typeof AccountActivityResponseSchema>;
export type AccountPostsParams = z.infer<typeof AccountPostsParamsSchema>;
export type AccountPostsQuery = z.infer<typeof AccountPostsQuerySchema>;
export type AccountPost = z.infer<typeof AccountPostSchema>;
export type AccountPostsResponse = z.infer<typeof AccountPostsResponseSchema>;
