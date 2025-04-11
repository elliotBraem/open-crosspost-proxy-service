import { ApiErrorCode, LikeResult } from '@crosspost/types';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';

/**
 * Twitter Like Post
 * Handles liking and unliking posts on Twitter
 */
export class TwitterLikePost extends TwitterPostBase {
  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Like the tweet
      const result = await client.v2.like(userId, postId);

      return {
        success: result.data.liked,
        id: postId,
      };
    } catch (error) {
      console.error('Error liking post:', error);
      throw new TwitterError(
        'Failed to like post',
        ApiErrorCode.POST_INTERACTION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Unlike the tweet
      const result = await client.v2.unlike(userId, postId);

      return {
        success: !result.data.liked,
        id: postId,
      };
    } catch (error) {
      console.error('Error unliking post:', error);
      throw new TwitterError(
        'Failed to unlike post',
        ApiErrorCode.POST_INTERACTION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }
}
