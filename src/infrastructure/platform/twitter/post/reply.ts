import { SendTweetV2Params } from 'twitter-api-v2';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';
import { ApiErrorCode, PostContent, PostResult } from '@crosspost/types';

/**
 * Twitter Reply Post
 * Handles replying to posts on Twitter
 */
export class TwitterReplyPost extends TwitterPostBase {
  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Handle thread of replies
      if (Array.isArray(content)) {
        return this.createReplyThread(userId, postId, content);
      }

      // Prepare tweet data
      const tweetData: SendTweetV2Params = {
        text: content.text || '',
        reply: { in_reply_to_tweet_id: postId },
      };

      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addMediaToTweet(tweetData, mediaIds);
      }

      // Post the reply
      const result = await client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        mediaIds: tweetData.media?.media_ids || [],
        inReplyToId: postId,
      };
    } catch (error) {
      console.error('Error replying to post:', error);
      throw new TwitterError(
        'Failed to reply to post',
        ApiErrorCode.POST_CREATION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }

  /**
   * Create a thread of replies
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to reply to
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createReplyThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Process each tweet in the thread
      const formattedTweets: SendTweetV2Params[] = [];

      // First tweet replies to the original
      const firstContent = contentArray[0];
      const firstTweetData: SendTweetV2Params = {
        text: firstContent.text || '',
        reply: { in_reply_to_tweet_id: postId },
      };

      // Handle media if present
      if (firstContent.media && firstContent.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, firstContent.media);
        this.addMediaToTweet(firstTweetData, mediaIds);
      }

      formattedTweets.push(firstTweetData);

      // Add the rest of the thread
      for (let i = 1; i < contentArray.length; i++) {
        const content = contentArray[i];
        const tweetData: SendTweetV2Params = { text: content.text || '' };

        // Handle media if present
        if (content.media && content.media.length > 0) {
          const mediaIds = await this.uploadMediaFiles(userId, content.media);
          this.addMediaToTweet(tweetData, mediaIds);
        }

        formattedTweets.push(tweetData);
      }

      // Post the thread
      const result = await client.v2.tweetThread(formattedTweets);

      // Return the first tweet's info
      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        inReplyToId: postId,
        threadIds: result.map((tweet) => tweet.data.id),
      };
    } catch (error) {
      console.error('Error creating reply thread:', error);
      throw new TwitterError(
        'Failed to create reply thread',
        ApiErrorCode.THREAD_CREATION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }
}
