import {
  ApiResponseError,
  TweetV2,
  TweetV2DeleteTweetResult,
  TweetV2LikeResult,
  TweetV2PostTweetResult,
  TweetV2RetweetResult,
  TweetV2SingleResult,
  TwitterApi,
  UserV2,
  UserV2Result,
} from 'twitter-api-v2';
import { createMockTwitterError } from '../../utils/twitter-utils.ts';

/**
 * Mock Twitter API client for testing
 * This class mocks the behavior of the twitter-api-v2 library
 */
export class TwitterApiMock {
  private userId: string;
  private errorScenario?: string;
  private mediaIds: string[] = [];
  private tweets: Map<string, TweetV2> = new Map();
  private users: Map<string, UserV2> = new Map();
  private likes: Set<string> = new Set();
  private retweets: Set<string> = new Set();

  /**
   * Constructor
   * @param userId User ID for the mock client
   * @param errorScenario Optional error scenario to simulate
   */
  constructor(userId: string, errorScenario?: string) {
    this.userId = userId;
    this.errorScenario = errorScenario;

    // Initialize default user
    this.users.set(userId, {
      id: userId,
      name: 'Test User',
      username: 'testuser',
    });
  }

  /**
   * Get the v2 API client
   * @returns Mock v2 API client
   */
  get v2() {
    return {
      // Tweet operations
      tweet: this.tweet.bind(this),
      tweetThread: this.tweetThread.bind(this),
      reply: this.reply.bind(this),
      deleteTweet: this.deleteTweet.bind(this),
      singleTweet: this.singleTweet.bind(this),

      // Like operations
      like: this.like.bind(this),
      unlike: this.unlike.bind(this),

      // Retweet operations
      retweet: this.retweet.bind(this),
      unretweet: this.unretweet.bind(this),

      // User operations
      me: this.me.bind(this),
    };
  }

  /**
   * Get the v1 API client
   * @returns Mock v1 API client
   */
  get v1() {
    return {
      uploadMedia: this.uploadMedia.bind(this),
      mediaMetadata: this.mediaMetadata.bind(this),
      createMediaMetadata: this.createMediaMetadata.bind(this),
    };
  }

  /**
   * Create a tweet
   * @param params Tweet parameters
   * @returns Tweet response
   */
  async tweet(params: string | any): Promise<TweetV2PostTweetResult> {
    // Check for error scenarios
    this.checkForErrors('tweet');

    // Handle string parameter (just the text)
    const tweetParams = typeof params === 'string' ? { text: params } : params;

    // Generate a unique ID
    const id = `tweet-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create the tweet object
    const tweet: TweetV2 = {
      id,
      text: tweetParams.text || '',
      edit_history_tweet_ids: [id],
    };

    // Store the tweet
    this.tweets.set(id, tweet);

    // Return mock tweet data
    return {
      data: tweet,
    };
  }

  /**
   * Create a thread of tweets
   * @param params Array of tweet parameters
   * @returns Array of tweet responses
   */
  async tweetThread(params: any[]): Promise<Array<TweetV2PostTweetResult>> {
    // Check for error scenarios
    this.checkForErrors('tweetThread');

    // Create the thread
    const results: Array<TweetV2PostTweetResult> = [];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const tweetParams = typeof param === 'string' ? { text: param } : param;

      // Generate a unique ID
      const id = `tweet-${Date.now()}-${Math.floor(Math.random() * 1000)}-${i}`;

      // Create the tweet object
      const tweet: TweetV2 = {
        id,
        text: tweetParams.text || '',
        edit_history_tweet_ids: [id],
      };

      // Store the tweet
      this.tweets.set(id, tweet);

      // Add to results
      results.push({ data: tweet });
    }

    return results;
  }

  /**
   * Reply to a tweet
   * @param text Reply text
   * @param tweetId Tweet ID to reply to
   * @param params Additional parameters
   * @returns Tweet response
   */
  async reply(text: string, tweetId: string, params?: any): Promise<TweetV2PostTweetResult> {
    // Check for error scenarios
    this.checkForErrors('reply');

    // Check if the tweet exists
    if (!this.tweets.has(tweetId) && tweetId !== 'mock-tweet-id') {
      throw new ApiResponseError(
        'Tweet not found',
        createMockTwitterError(34, 'Tweet not found'),
      );
    }

    // Generate a unique ID
    const id = `reply-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create the reply tweet object
    const tweet: TweetV2 = {
      id,
      text: text || '',
      edit_history_tweet_ids: [id],
      in_reply_to_user_id: this.userId,
      referenced_tweets: [
        {
          type: 'replied_to',
          id: tweetId,
        },
      ],
    };

    // Store the tweet
    this.tweets.set(id, tweet);

    // Return mock tweet data
    return {
      data: tweet,
    };
  }

  /**
   * Delete a tweet
   * @param tweetId Tweet ID to delete
   * @returns Delete response
   */
  async deleteTweet(tweetId: string): Promise<TweetV2DeleteTweetResult> {
    // Check for error scenarios
    this.checkForErrors('deleteTweet');

    // Check if the tweet exists
    if (!this.tweets.has(tweetId) && tweetId !== 'mock-tweet-id') {
      throw new ApiResponseError(
        'Tweet not found',
        createMockTwitterError(34, 'Tweet not found'),
      );
    }

    // Delete the tweet
    this.tweets.delete(tweetId);

    // Return mock delete data
    return {
      data: {
        deleted: true,
      },
    };
  }

  /**
   * Get a single tweet
   * @param tweetId Tweet ID
   * @param options Optional parameters
   * @returns Tweet response
   */
  async singleTweet(tweetId: string, options?: any): Promise<TweetV2SingleResult> {
    // Check for error scenarios
    this.checkForErrors('singleTweet');

    // Check if the tweet exists
    if (!this.tweets.has(tweetId)) {
      // If not in our mock store, create a mock tweet
      const tweet: TweetV2 = {
        id: tweetId,
        text: `Mock tweet ${tweetId}`,
        edit_history_tweet_ids: [tweetId],
      };

      return {
        data: tweet,
        includes: {},
      };
    }

    // Return the tweet
    return {
      data: this.tweets.get(tweetId)!,
      includes: {},
    };
  }

  /**
   * Like a tweet
   * @param userId User ID liking the tweet
   * @param tweetId Tweet ID to like
   * @returns Like response
   */
  async like(userId: string, tweetId: string): Promise<TweetV2LikeResult> {
    // Check for error scenarios
    this.checkForErrors('like');

    // Add to likes
    this.likes.add(`${userId}-${tweetId}`);

    // Return mock like data
    return {
      data: {
        liked: true,
      },
    };
  }

  /**
   * Unlike a tweet
   * @param userId User ID unliking the tweet
   * @param tweetId Tweet ID to unlike
   * @returns Unlike response
   */
  async unlike(userId: string, tweetId: string): Promise<TweetV2LikeResult> {
    // Check for error scenarios
    this.checkForErrors('unlike');

    // Remove from likes
    this.likes.delete(`${userId}-${tweetId}`);

    // Return mock unlike data
    return {
      data: {
        liked: false,
      },
    };
  }

  /**
   * Retweet a tweet
   * @param userId User ID retweeting the tweet
   * @param tweetId Tweet ID to retweet
   * @returns Retweet response
   */
  async retweet(userId: string, tweetId: string): Promise<TweetV2RetweetResult> {
    // Check for error scenarios
    this.checkForErrors('retweet');

    // Add to retweets
    this.retweets.add(`${userId}-${tweetId}`);

    // Return mock retweet data
    return {
      data: {
        retweeted: true,
      },
    };
  }

  /**
   * Unretweet a tweet
   * @param userId User ID unretweeting the tweet
   * @param tweetId Tweet ID to unretweet
   * @returns Unretweet response
   */
  async unretweet(userId: string, tweetId: string): Promise<TweetV2RetweetResult> {
    // Check for error scenarios
    this.checkForErrors('unretweet');

    // Remove from retweets
    this.retweets.delete(`${userId}-${tweetId}`);

    // Return mock unretweet data
    return {
      data: {
        retweeted: false,
      },
    };
  }

  /**
   * Get the current user
   * @param options Optional parameters
   * @returns User response
   */
  async me(options?: any): Promise<UserV2Result> {
    // Check for error scenarios
    this.checkForErrors('me');

    // Return the current user
    return {
      data: this.users.get(this.userId)!,
      includes: {},
    };
  }

  /**
   * Upload media
   * @param buffer Media buffer
   * @param options Upload options
   * @returns Media ID
   */
  async uploadMedia(buffer: Uint8Array | string, options?: any): Promise<string> {
    // Check for error scenarios
    this.checkForErrors('uploadMedia');

    // Generate a mock media ID
    const mediaId = `media-${Date.now()}`;
    this.mediaIds.push(mediaId);

    return mediaId;
  }

  /**
   * Update media metadata
   * @param mediaId Media ID
   * @param metadata Media metadata
   * @returns Success indicator
   */
  async mediaMetadata(mediaId: string, metadata: any): Promise<void> {
    // Check for error scenarios
    this.checkForErrors('mediaMetadata');

    // Check if media ID exists
    if (!this.mediaIds.includes(mediaId)) {
      throw new ApiResponseError(
        'Media not found',
        createMockTwitterError(324, 'Media not found'),
      );
    }

    // Return success (void)
    return;
  }

  /**
   * Create media metadata (alt text)
   * @param mediaId Media ID
   * @param metadata Media metadata
   * @returns Success indicator
   */
  async createMediaMetadata(mediaId: string, metadata: any): Promise<void> {
    // Check for error scenarios
    this.checkForErrors('createMediaMetadata');

    // Check if media ID exists
    if (!this.mediaIds.includes(mediaId)) {
      throw new ApiResponseError(
        'Media not found',
        createMockTwitterError(324, 'Media not found'),
      );
    }

    // Return success (void)
    return;
  }

  /**
   * Check for error scenarios and throw appropriate errors
   * @param operation Operation being performed
   */
  private checkForErrors(operation: string): void {
    if (!this.errorScenario) return;

    // Check if the error scenario matches the current operation
    if (this.errorScenario === operation || this.errorScenario === 'all') {
      this.throwError();
    }

    // Check for specific error scenarios
    if (this.errorScenario === 'rate_limit') {
      throw new ApiResponseError(
        'Rate limit exceeded',
        createMockTwitterError(88, 'Rate limit exceeded'),
      );
    }

    if (this.errorScenario === 'auth_error') {
      throw new ApiResponseError(
        'Invalid or expired token',
        createMockTwitterError(89, 'Invalid or expired token'),
      );
    }

    if (this.errorScenario === 'network_error') {
      // Create a simplified network error
      const error = new Error('Network error') as any;
      error.code = 'NETWORK_ERROR';
      throw error;
    }

    if (this.errorScenario === 'partial_response') {
      // Create a simplified partial response error
      const error = new Error('Partial response') as any;
      error.code = 'PARTIAL_RESPONSE';
      throw error;
    }
  }

  /**
   * Throw an error based on the error scenario
   */
  private throwError(): void {
    switch (this.errorScenario) {
      case 'rate_limit':
        throw new ApiResponseError(
          'Rate limit exceeded',
          createMockTwitterError(88, 'Rate limit exceeded'),
        );
      case 'auth_error':
        throw new ApiResponseError(
          'Invalid or expired token',
          createMockTwitterError(89, 'Invalid or expired token'),
        );
      case 'not_found':
        throw new ApiResponseError(
          'Resource not found',
          createMockTwitterError(34, 'Resource not found'),
        );
      case 'forbidden':
        throw new ApiResponseError(
          'Forbidden',
          createMockTwitterError(87, 'Forbidden'),
        );
      case 'duplicate':
        throw new ApiResponseError(
          'Duplicate content',
          createMockTwitterError(187, 'Duplicate content'),
        );
      case 'content_policy':
        throw new ApiResponseError(
          'Content policy violation',
          createMockTwitterError(226, 'Content policy violation'),
        );
      case 'media_error':
        throw new ApiResponseError(
          'Media upload failed',
          createMockTwitterError(324, 'Media upload failed'),
        );
      case 'service_error':
        throw new ApiResponseError(
          'Twitter service error',
          createMockTwitterError(130, 'Over capacity'),
        );
      case 'network_error':
        // Create a simplified network error
        const networkError = new Error('Network error') as any;
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      case 'partial_response':
        // Create a simplified partial response error
        const partialError = new Error('Partial response') as any;
        partialError.code = 'PARTIAL_RESPONSE';
        throw partialError;
      default:
        throw new ApiResponseError(
          'Unknown error',
          createMockTwitterError(131, 'Internal error'),
        );
    }
  }
}

/**
 * Create a mock Twitter API client
 * @param userId User ID for the mock client
 * @param errorScenario Optional error scenario to simulate
 * @returns Mock Twitter API client
 */
export function createMockTwitterApi(
  userId: string,
  errorScenario?: string,
): TwitterApi {
  return new TwitterApiMock(userId, errorScenario) as unknown as TwitterApi;
}
