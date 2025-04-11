import { ApiErrorCode, DeleteResult } from '@crosspost/types';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';

/**
 * Twitter Delete Post
 * Handles deleting posts on Twitter
 */
export class TwitterDeletePost extends TwitterPostBase {
  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Delete the tweet
      const result = await client.v2.deleteTweet(postId);

      return {
        success: result.data.deleted,
        id: postId,
      };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new TwitterError(
        'Failed to delete post',
        ApiErrorCode.POST_DELETION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }
}
