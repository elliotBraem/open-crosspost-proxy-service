import { Env } from '../../../config/env.ts';
import { TwitterClient } from './twitter-client.ts';
import { TwitterMedia } from './twitter-media.ts';
import {
  TwitterCreatePost,
  TwitterDeletePost,
  TwitterLikePost,
  TwitterQuotePost,
  TwitterReplyPost,
  TwitterRepost,
} from './post/index.ts';
import { PlatformPost } from '../abstract/platform-post.interface.ts';
import { DeleteResult, LikeResult, PostContent, PostResult } from '@crosspost/types';

/**
 * Twitter Post
 * Implements the PlatformPost interface for Twitter
 * Delegates to specialized classes for different operations
 */
export class TwitterPost implements PlatformPost {
  private env: Env;
  private twitterClient: TwitterClient;
  private twitterMedia: TwitterMedia;
  private createPostService: TwitterCreatePost;
  private repostService: TwitterRepost;
  private quotePostService: TwitterQuotePost;
  private replyPostService: TwitterReplyPost;
  private likePostService: TwitterLikePost;
  private deletePostService: TwitterDeletePost;

  constructor(env: Env, twitterClient: TwitterClient, twitterMedia: TwitterMedia) {
    this.env = env;
    this.twitterClient = twitterClient;
    this.twitterMedia = twitterMedia;

    // Pass the shared client and media service to each specialized service
    this.createPostService = new TwitterCreatePost(this.twitterClient, this.twitterMedia);
    this.repostService = new TwitterRepost(this.twitterClient, this.twitterMedia);
    this.quotePostService = new TwitterQuotePost(this.twitterClient, this.twitterMedia);
    this.replyPostService = new TwitterReplyPost(this.twitterClient, this.twitterMedia);
    this.likePostService = new TwitterLikePost(this.twitterClient, this.twitterMedia);
    this.deletePostService = new TwitterDeletePost(this.twitterClient, this.twitterMedia);
  }

  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post
   * @returns The created post result
   */
  async createPost(userId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    return await this.createPostService.createPost(userId, content);
  }

  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    return await this.repostService.repost(userId, postId);
  }

  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote
   * @returns The quote post result
   */
  async quotePost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    return await this.quotePostService.quotePost(userId, postId, content);
  }

  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    return await this.deletePostService.deletePost(userId, postId);
  }

  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    return await this.replyPostService.replyToPost(userId, postId, content);
  }

  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    return await this.likePostService.likePost(userId, postId);
  }

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    return await this.likePostService.unlikePost(userId, postId);
  }
}
