import { Platform, PlatformName } from '@crosspost/types';
import { Env } from '../../config/env.ts';
import { DeleteResult, LikeResult, PostContent, PostResult } from '@crosspost/types';
import { TwitterPost } from '../../infrastructure/platform/twitter/twitter-post.ts';
import { PlatformPost } from '../../infrastructure/platform/abstract/platform-post.interface.ts';

/**
 * Post Service
 * Domain service for post-related operations
 */
export class PostService {
  private platformPosts: Map<string, PlatformPost>;
  private env: Env;

  constructor(env: Env, platformPosts?: Map<string, PlatformPost>) {
    this.env = env;

    if (platformPosts) {
      // Use the provided platform posts map
      this.platformPosts = platformPosts;
    } else {
      // For backward compatibility, create an empty map
      // This should be removed once all code is updated to use dependency injection
      this.platformPosts = new Map();
      console.warn('PostService created without platformPosts map. This is deprecated.');
    }
  }

  /**
   * Get the appropriate platform implementation
   * @param platform The platform name
   * @returns The platform implementation
   */
  private getPlatformPost(platform: PlatformName): PlatformPost {
    const platformPost = this.platformPosts.get(platform);

    if (!platformPost) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return platformPost;
  }

  /**
   * Create a new post
   * @param platform The platform to post to
   * @param userId The user ID creating the post
   * @param content The content of the post or an array of contents for a thread
   * @returns The created post result
   */
  async createPost(
    platform: PlatformName,
    userId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.createPost(userId, content);
    } catch (error) {
      console.error(`Error creating post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Repost/retweet an existing post
   * @param platform The platform to post to
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(platform: PlatformName, userId: string, postId: string): Promise<PostResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.repost(userId, postId);
    } catch (error) {
      console.error(`Error reposting on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Quote an existing post
   * @param platform The platform to post to
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote or an array of contents for a thread
   * @returns The quote post result
   */
  async quotePost(
    platform: PlatformName,
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.quotePost(userId, postId, content);
    } catch (error) {
      console.error(`Error quoting post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Delete a post
   * @param platform The platform to post to
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(platform: PlatformName, userId: string, postId: string): Promise<DeleteResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.deletePost(userId, postId);
    } catch (error) {
      console.error(`Error deleting post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Reply to an existing post
   * @param platform The platform to post to
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply or an array of contents for a thread
   * @returns The reply post result
   */
  async replyToPost(
    platform: PlatformName,
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.replyToPost(userId, postId, content);
    } catch (error) {
      console.error(`Error replying to post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Like a post
   * @param platform The platform to post to
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(platform: PlatformName, userId: string, postId: string): Promise<LikeResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.likePost(userId, postId);
    } catch (error) {
      console.error(`Error liking post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Unlike a post
   * @param platform The platform to post to
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(platform: PlatformName, userId: string, postId: string): Promise<LikeResult> {
    try {
      const platformPost = this.getPlatformPost(platform);
      return await platformPost.unlikePost(userId, postId);
    } catch (error) {
      console.error(`Error unliking post on ${platform}:`, error);
      throw error;
    }
  }
}
