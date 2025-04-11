import { SendTweetV2Params } from 'twitter-api-v2';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';
import { ApiErrorCode, PostContent, PostResult } from '@crosspost/types'; // Import ApiErrorCode

/**
 * Twitter Quote Post
 * Handles quoting posts on Twitter
 */
export class TwitterQuotePost extends TwitterPostBase {
  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote
   * @returns The quote post result
   */
  async quotePost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Handle thread of quote tweets
      if (Array.isArray(content)) {
        return this.createQuoteThread(userId, postId, content);
      }

      // Prepare tweet data with the quoted tweet URL
      const tweetData: SendTweetV2Params = {
        text: `${content.text || ''} https://twitter.com/i/web/status/${postId}`,
      };

      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addMediaToTweet(tweetData, mediaIds);
      }

      // Post the quote tweet
      const result = await client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        mediaIds: tweetData.media?.media_ids || [],
        quotedPostId: postId,
      };
    } catch (error) {
      console.error('Error quoting post:', error);
      throw new TwitterError(
        'Failed to quote post',
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
   * Create a thread of quote tweets
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to quote
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createQuoteThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Process each tweet in the thread
      const formattedTweets: SendTweetV2Params[] = [];

      // First tweet quotes the original
      const firstContent = contentArray[0];
      const firstTweetData: SendTweetV2Params = {
        text: `${firstContent.text || ''} https://twitter.com/i/web/status/${postId}`,
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
        quotedPostId: postId,
        threadIds: result.map((tweet) => tweet.data.id),
      };
    } catch (error) {
      console.error('Error creating quote thread:', error);
      throw new TwitterError(
        'Failed to create quote thread',
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
