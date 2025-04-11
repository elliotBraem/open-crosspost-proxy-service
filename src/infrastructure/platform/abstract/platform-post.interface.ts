/**
 * Platform Post Interface
 * Defines the common interface for platform-specific post operations
 */
import { DeleteResult, LikeResult, PostContent, PostResult } from '@crosspost/types';
export interface PlatformPost {
  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post or an array of contents for a thread
   */
  createPost(userId: string, content: PostContent | PostContent[]): Promise<PostResult>;

  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   */
  repost(userId: string, postId: string): Promise<PostResult>;

  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote or an array of contents for a thread
   */
  quotePost(
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult>;

  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   */
  deletePost(userId: string, postId: string): Promise<DeleteResult>;

  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply or an array of contents for a thread
   */
  replyToPost(
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult>;

  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   */
  likePost(userId: string, postId: string): Promise<LikeResult>;

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   */
  unlikePost(userId: string, postId: string): Promise<LikeResult>;
}
