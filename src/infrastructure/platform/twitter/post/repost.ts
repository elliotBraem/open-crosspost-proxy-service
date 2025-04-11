import { ApiErrorCode, PostResult } from '@crosspost/types';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';

/**
 * Twitter Repost
 * Handles reposting/retweeting on Twitter
 */
export class TwitterRepost extends TwitterPostBase {
  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Retweet the tweet
      const result = await client.v2.retweet(userId, postId);

      return {
        id: result.data.retweeted ? postId : '',
        createdAt: new Date().toISOString(),
        success: result.data.retweeted,
      };
    } catch (error) {
      console.error('Error reposting:', error);
      throw new TwitterError(
        'Failed to repost',
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
