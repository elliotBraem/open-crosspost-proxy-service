import { SendTweetV2Params } from 'twitter-api-v2';
import { MediaCache } from '../../../../utils/media-cache.utils.ts';
import { TwitterClient } from '../twitter-client.ts';
import { TwitterMedia } from '../twitter-media.ts';
import { MediaContent } from '@crosspost/types';

/**
 * Base class for Twitter post operations
 * Contains common utilities and shared functionality
 */
export abstract class TwitterPostBase {
  protected twitterClient: TwitterClient;
  protected twitterMedia: TwitterMedia;

  constructor(twitterClient: TwitterClient, twitterMedia: TwitterMedia) {
    this.twitterClient = twitterClient;
    this.twitterMedia = twitterMedia;
  }

  /**
   * Upload media files and return media IDs
   * @param userId The user ID uploading the media
   * @param mediaFiles The media files to upload
   * @returns Array of media IDs
   */
  protected async uploadMediaFiles(userId: string, mediaFiles: MediaContent[]): Promise<string[]> {
    if (!mediaFiles || mediaFiles.length === 0) return [];

    const mediaIds: string[] = [];
    const mediaCache = MediaCache.getInstance();

    for (const mediaFile of mediaFiles) {
      try {
        // Check if we already have this media file cached
        const cachedMediaId = await mediaCache.getCachedMediaId(mediaFile);

        if (cachedMediaId) {
          console.log('Using cached media ID:', cachedMediaId);
          mediaIds.push(cachedMediaId);
          continue;
        }

        // Upload the media using the TwitterMedia service
        const result = await this.twitterMedia.uploadMedia(userId, mediaFile);

        if (result.mediaId) {
          // Cache the media ID for potential reuse
          await mediaCache.cacheMediaId(mediaFile, result.mediaId);
          mediaIds.push(result.mediaId);
        }
      } catch (error) {
        console.error('Error uploading media file:', error);
        // Continue with other files even if one fails
      }
    }

    return mediaIds;
  }

  /**
   * Helper method to add media IDs to a tweet
   * @param tweetData The tweet data to add media to
   * @param mediaIds The media IDs to add
   */
  protected addMediaToTweet(tweetData: SendTweetV2Params, mediaIds: string[]): void {
    if (!mediaIds || mediaIds.length === 0) return;

    // Twitter API expects a tuple with 1-4 elements
    const ids = mediaIds.slice(0, 4);

    // Cast to the specific tuple types that Twitter API expects
    switch (ids.length) {
      case 1:
        tweetData.media = { media_ids: [ids[0]] as [string] };
        break;
      case 2:
        tweetData.media = { media_ids: [ids[0], ids[1]] as [string, string] };
        break;
      case 3:
        tweetData.media = { media_ids: [ids[0], ids[1], ids[2]] as [string, string, string] };
        break;
      case 4:
        tweetData.media = {
          media_ids: [ids[0], ids[1], ids[2], ids[3]] as [string, string, string, string],
        };
        break;
    }
  }
}
