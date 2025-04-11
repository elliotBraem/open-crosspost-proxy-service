/**
 * Post Schemas and Types
 * Defines Zod schemas for post-related requests and responses
 * TypeScript types are derived from Zod schemas for type safety
 */

import { z } from 'zod';
import { PlatformSchema } from './common.ts';
import { EnhancedResponseSchema, ErrorDetailSchema } from './response.ts';

/**
 * Media content schema
 */
export const MediaContentSchema = z.object({
  data: z.union([z.string(), z.instanceof(Blob)]).describe('Media data as string or Blob'),
  mimeType: z.string().optional().describe('Media MIME type'),
  altText: z.string().optional().describe('Alt text for the media'),
}).describe('Media content object');

/**
 * Media schema
 */
export const MediaSchema = z.object({
  id: z.string().describe('Media ID'),
  type: z.enum(['image', 'video', 'gif']).describe('Media type'),
  url: z.string().optional().describe('Media URL'),
  altText: z.string().optional().describe('Alt text for the media'),
}).describe('Media object');

/**
 * Post metrics schema
 */
export const PostMetricsSchema = z.object({
  retweets: z.number().describe('Number of retweets'),
  quotes: z.number().describe('Number of quotes'),
  likes: z.number().describe('Number of likes'),
  replies: z.number().describe('Number of replies'),
}).describe('Post metrics');

/**
 * Post schema
 */
export const PostSchema = z.object({
  id: z.string().describe('Post ID'),
  text: z.string().describe('Post text content'),
  createdAt: z.string().describe('Post creation date'),
  authorId: z.string().describe('Author ID'),
  media: z.array(MediaSchema).optional().describe('Media attached to the post'),
  metrics: PostMetricsSchema.optional().describe('Post metrics'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting'),
}).describe('Post object');

/**
 * Post content schema
 */
export const PostContentSchema = z.object({
  text: z.string().optional().describe('Text content for the post'),
  media: z.array(MediaContentSchema).optional().describe('Media attachments for the post'),
}).describe('Post content');

/**
 * Post result schema
 */
export const PostResultSchema = z.object({
  id: z.string().describe('Post ID'),
  text: z.string().optional().describe('Post text content'),
  createdAt: z.string().describe('Post creation date'),
  mediaIds: z.array(z.string()).optional().describe('Media IDs attached to the post'),
  threadIds: z.array(z.string()).optional().describe('Thread IDs for threaded posts'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to'),
  success: z.boolean().optional().describe('Whether the operation was successful'),
}).catchall(z.any()).describe('Post result');

/**
 * Delete result schema
 */
export const DeleteResultSchema = z.object({
  success: z.boolean().describe('Whether the deletion was successful'),
  id: z.string().describe('ID of the deleted post'),
}).describe('Delete result');

/**
 * Like result schema
 */
export const LikeResultSchema = z.object({
  success: z.boolean().describe('Whether the like was successful'),
  id: z.string().describe('ID of the liked post'),
}).describe('Like result');

/**
 * Success detail schema for post operations
 */
export const PostSuccessDetailSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID'),
  status: z.literal('success'),
  postId: z.string().optional().describe('Post ID'),
  postUrl: z.string().optional().describe('URL to the post'),
}).catchall(z.any()).describe('Post success detail');

/**
 * Request schemas
 */

/**
 * Target schema - common for all operations
 */
export const TargetSchema = z.object({
  platform: PlatformSchema.describe('The platform to post to (e.g., "twitter")'),
  userId: z.string().describe('User ID on the platform'),
}).describe('Target for posting operations');

/**
 * Create post request schema
 */
export const CreatePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to post to (can be a single target)'),
  content: z.array(PostContentSchema).describe(
    'The content of the post, always an array of PostContent objects, even for a single post',
  ),
}).describe('Create post request');

/**
 * Repost request schema
 */
export const RepostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to post to'),
  platform: PlatformSchema.describe('Platform of the post being reposted'),
  postId: z.string().describe('ID of the post to repost'),
}).describe('Repost request');

/**
 * Quote post request schema
 */
export const QuotePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to post to (must be on the same platform as the post being quoted)',
  ),
  platform: PlatformSchema.describe('Platform of the post being quoted'),
  postId: z.string().describe('ID of the post to quote'),
  content: z.array(PostContentSchema).describe(
    'Content for the quote post(s), always an array, even for a single post',
  ),
}).describe('Quote post request');

/**
 * Reply to post request schema
 */
export const ReplyToPostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to post to (must be on the same platform as the post being replied to)',
  ),
  platform: PlatformSchema.describe('Platform of the post being replied to'),
  postId: z.string().describe('ID of the post to reply to'),
  content: z.array(PostContentSchema).describe(
    'Content for the reply post(s), always an array, even for a single post',
  ),
}).describe('Reply to post request');

/**
 * Post to delete schema
 */
export const PostToDeleteSchema = z.object({
  platform: PlatformSchema.describe('Platform of the post to delete'),
  userId: z.string().describe('User ID on the platform'),
  postId: z.string().describe('ID of the post to delete'),
}).describe('Post to delete');

/**
 * Delete post request schema
 */
export const DeletePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to delete posts'),
  posts: z.array(PostToDeleteSchema).describe('Array of posts to delete'),
}).describe('Delete post request');

/**
 * Like post request schema
 */
export const LikePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to like the post (must be on the same platform as the post being liked)',
  ),
  platform: PlatformSchema.describe('Platform of the post being liked'),
  postId: z.string().describe('ID of the post to like'),
}).describe('Like post request');

/**
 * Unlike post request schema
 */
export const UnlikePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to unlike the post (must be on the same platform as the post being unliked)',
  ),
  platform: PlatformSchema.describe('Platform of the post being unliked'),
  postId: z.string().describe('ID of the post to unlike'),
}).describe('Unlike post request');

/**
 * Response schemas
 */

/**
 * Post response schema
 */
export const PostResponseSchema = EnhancedResponseSchema(
  z.union([PostSchema, z.array(PostSchema)]),
).describe('Post response');

/**
 * Create post response schema (legacy)
 */
export const CreatePostResponseLegacySchema = PostResponseSchema.describe(
  'Create post response (legacy)',
);

/**
 * Repost response schema
 */
export const RepostResponseSchema = PostResponseSchema.describe('Repost response');

/**
 * Quote post response schema
 */
export const QuotePostResponseSchema = PostResponseSchema.describe('Quote post response');

/**
 * Reply to post response schema
 */
export const ReplyToPostResponseSchema = PostResponseSchema.describe('Reply to post response');

/**
 * Delete post response schema
 */
export const DeletePostResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    id: z.string().describe('ID of the deleted post'),
  }),
).describe('Delete post response');

/**
 * Like post response schema
 */
export const LikePostResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the like was successful'),
    id: z.string().describe('ID of the liked post'),
  }),
).describe('Like post response');

/**
 * Unlike post response schema
 */
export const UnlikePostResponseSchema = EnhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the unlike was successful'),
    id: z.string().describe('ID of the unliked post'),
  }),
).describe('Unlike post response');

/**
 * Multi-status response schema for batch operations
 */
export const PostMultiStatusResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation was partially or fully successful'),
  data: z.object({
    summary: z.object({
      total: z.number().describe('Total number of operations'),
      succeeded: z.number().describe('Number of successful operations'),
      failed: z.number().describe('Number of failed operations'),
    }),
    results: z.array(PostSuccessDetailSchema).describe('Successful operations'),
    errors: z.array(ErrorDetailSchema).describe('Failed operations'),
  }),
}).describe('Multi-status response for post operations');

// Derive TypeScript types from Zod schemas
export type Media = z.infer<typeof MediaSchema>;
export type MediaContent = z.infer<typeof MediaContentSchema>;
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
export type Post = z.infer<typeof PostSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type LikeResult = z.infer<typeof LikeResultSchema>;
export type PostSuccessDetail = z.infer<typeof PostSuccessDetailSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type PostToDelete = z.infer<typeof PostToDeleteSchema>;

// Request types
export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type RepostRequest = z.infer<typeof RepostRequestSchema>;
export type QuotePostRequest = z.infer<typeof QuotePostRequestSchema>;
export type ReplyToPostRequest = z.infer<typeof ReplyToPostRequestSchema>;
export type DeletePostRequest = z.infer<typeof DeletePostRequestSchema>;
export type LikePostRequest = z.infer<typeof LikePostRequestSchema>;
export type UnlikePostRequest = z.infer<typeof UnlikePostRequestSchema>;

// Response types
export type PostResponse = z.infer<typeof PostResponseSchema>;
export type CreatePostResponse = z.infer<typeof CreatePostResponseLegacySchema>;
export type RepostResponse = z.infer<typeof RepostResponseSchema>;
export type QuotePostResponse = z.infer<typeof QuotePostResponseSchema>;
export type ReplyToPostResponse = z.infer<typeof ReplyToPostResponseSchema>;
export type DeletePostResponse = z.infer<typeof DeletePostResponseSchema>;
export type LikePostResponse = z.infer<typeof LikePostResponseSchema>;
export type UnlikePostResponse = z.infer<typeof UnlikePostResponseSchema>;
export type PostMultiStatusResponse = z.infer<typeof PostMultiStatusResponseSchema>;

/**
 * Create post target result schema
 */
export const CreatePostTargetResultSchema = z.object({
  platform: PlatformSchema.describe('The platform the post was created on'),
  userId: z.string().describe('The user ID on the platform'),
  result: z.array(z.any()).describe('The result of the post creation'),
}).describe('Create post target result');

/**
 * Create post target error schema
 */
export const CreatePostTargetErrorSchema = z.object({
  platform: PlatformSchema.optional().describe(
    'The platform where the error occurred (if applicable)',
  ),
  userId: z.string().optional().describe('The user ID where the error occurred (if applicable)'),
  error: z.string().describe('The error message'),
}).describe('Create post target error');

/**
 * Create post response schema
 */
export const CreatePostResponseSchema = EnhancedResponseSchema(
  z.object({
    results: z.array(CreatePostTargetResultSchema).describe('Array of successful post results'),
    errors: z.array(CreatePostTargetErrorSchema).optional().describe(
      'Array of errors that occurred (if any)',
    ),
  }),
).describe('Create post response');

// Additional derived types
export type CreatePostTargetResult = z.infer<typeof CreatePostTargetResultSchema>;
export type CreatePostTargetError = z.infer<typeof CreatePostTargetErrorSchema>;
