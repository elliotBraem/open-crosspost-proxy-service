import { TwitterApi } from 'twitter-api-v2';
import {
  MediaStatusResult,
  MediaUploadResult,
  PlatformMedia,
} from '../abstract/platform-media.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { Env } from '../../../config/env.ts';
import { Buffer } from 'node:buffer';
import { MediaContent } from '@crosspost/types';

// Media upload limitations
const MEDIA_LIMITS = {
  MAX_IMAGES_PER_TWEET: 4,
  MAX_VIDEOS_PER_TWEET: 1,
  MAX_VIDEO_SIZE_MB: 512,
  MAX_IMAGE_SIZE_MB: 5,
  CHUNK_SIZE_BYTES: 1024 * 1024, // 1MB chunks
};

/**
 * Twitter Media
 * Implements the PlatformMedia interface for Twitter
 */
export class TwitterMedia implements PlatformMedia {
  private env: Env;
  private twitterClient: TwitterClient;
  private oauth1Client: TwitterApi | null = null;

  constructor(env: Env, twitterClient: TwitterClient) {
    this.env = env;
    this.twitterClient = twitterClient;

    // Initialize OAuth 1.0a client for media uploads if credentials are provided
    if (
      env.TWITTER_API_KEY &&
      env.TWITTER_API_SECRET &&
      env.TWITTER_ACCESS_TOKEN &&
      env.TWITTER_ACCESS_SECRET
    ) {
      try {
        this.oauth1Client = new TwitterApi({
          appKey: env.TWITTER_API_KEY,
          appSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });
      } catch (error) {
        console.error('Failed to initialize OAuth 1.0a client:', error);
        this.oauth1Client = null;
      }
    } else {
      console.warn('Missing OAuth 1.0a credentials - media uploads will not work');
    }
  }

  /**
   * Upload media to Twitter
   * @param userId The user ID uploading the media
   * @param media The media content to upload
   * @returns The media upload result
   */
  async uploadMedia(userId: string, media: MediaContent): Promise<MediaUploadResult> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw new Error('Media uploads require OAuth 1.0a credentials which are not configured');
      }

      // Convert media data to buffer
      const mediaBuffer = await this.convertToBuffer(media.data);
      const mimeType = media.mimeType || 'application/octet-stream';

      // Check file size
      const isVideo = mimeType.startsWith('video/');
      const sizeInMB = mediaBuffer.byteLength / (1024 * 1024);

      if (isVideo && sizeInMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
        throw new Error(`Video size exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
      } else if (!isVideo && sizeInMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image size exceeds maximum of ${MEDIA_LIMITS.MAX_IMAGE_SIZE_MB}MB`);
      }

      // For large files, use chunked upload
      let mediaId: string;
      let processingInfo: any = null;

      if (mediaBuffer.byteLength > MEDIA_LIMITS.CHUNK_SIZE_BYTES) {
        const result = await this.uploadLargeMedia(mediaBuffer, mimeType);
        mediaId = result.mediaId;
        processingInfo = result.processingInfo;
      } else {
        // Upload the media using OAuth 1.0a client
        mediaId = await this.oauth1Client.v1.uploadMedia(mediaBuffer, { mimeType });
      }

      // Set alt text if provided
      if (media.altText && mediaId) {
        await this.updateMediaMetadata(mediaId, media.altText);
      }

      return {
        mediaId,
        processingInfo: processingInfo
          ? {
            state: processingInfo.state,
            checkAfterSecs: processingInfo.check_after_secs,
            progressPercent: processingInfo.progress_percent,
            error: processingInfo.error
              ? {
                code: processingInfo.error.code,
                message: processingInfo.error.message,
              }
              : undefined,
          }
          : undefined,
      };
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get the status of a media upload
   * @param mediaId The ID of the media to check
   * @returns The media status result
   */
  async getMediaStatus(mediaId: string): Promise<MediaStatusResult> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw new Error(
          'Media status checks require OAuth 1.0a credentials which are not configured',
        );
      }

      // Get the media status from Twitter
      const statusResult = await this.oauth1Client.v1.get(
        'media/upload',
        { command: 'STATUS', media_id: mediaId },
      );

      const processingInfo = statusResult.processing_info;

      return {
        mediaId,
        state: processingInfo ? processingInfo.state : 'succeeded',
        processingComplete: !processingInfo || processingInfo.state === 'succeeded',
        progressPercent: processingInfo ? processingInfo.progress_percent : 100,
        error: processingInfo && processingInfo.error
          ? {
            code: processingInfo.error.code,
            message: processingInfo.error.message,
          }
          : undefined,
      };
    } catch (error) {
      console.error('Error getting media status:', error);
      throw error;
    }
  }

  /**
   * Update media metadata (e.g., alt text)
   * @param mediaId The ID of the media to update
   * @param altText The alt text to set for the media
   * @returns True if the update was successful
   */
  async updateMediaMetadata(mediaId: string, altText: string): Promise<boolean> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw new Error('Media metadata requires OAuth 1.0a credentials which are not configured');
      }

      // Set the alt text
      await this.oauth1Client.v1.createMediaMetadata(mediaId, {
        alt_text: { text: altText },
      });

      return true;
    } catch (error) {
      console.error('Error setting media metadata:', error);
      throw error;
    }
  }

  /**
   * Upload large media in chunks
   * @param mediaBuffer The media buffer to upload
   * @param mimeType The MIME type of the media
   * @returns The media ID and processing info
   */
  private async uploadLargeMedia(
    mediaBuffer: Buffer,
    mimeType: string,
  ): Promise<{ mediaId: string; processingInfo: any }> {
    if (!this.oauth1Client) {
      throw new Error('Media uploads require OAuth 1.0a credentials which are not configured');
    }

    try {
      // Initialize the upload
      const init = await this.oauth1Client.v1.post('media/upload', {
        command: 'INIT',
        total_bytes: mediaBuffer.byteLength,
        media_type: mimeType,
      });

      const mediaId = init.media_id_string;

      // Upload the media in chunks
      const chunkSize = MEDIA_LIMITS.CHUNK_SIZE_BYTES;
      let segmentIndex = 0;

      for (let i = 0; i < mediaBuffer.byteLength; i += chunkSize) {
        const chunk = mediaBuffer.slice(i, i + chunkSize);

        await this.oauth1Client.v1.post('media/upload', {
          command: 'APPEND',
          media_id: mediaId,
          media: chunk.toString('base64'),
          segment_index: segmentIndex,
        });

        segmentIndex++;
      }

      // Finalize the upload
      const finalize = await this.oauth1Client.v1.post('media/upload', {
        command: 'FINALIZE',
        media_id: mediaId,
      });

      // For videos, we need to wait for processing
      if (mimeType.startsWith('video/') && finalize.processing_info) {
        // Wait for initial processing to complete
        let processingInfo = finalize.processing_info;

        if (processingInfo.state !== 'succeeded') {
          // Wait for the initial check after time
          const waitTime = processingInfo.check_after_secs
            ? processingInfo.check_after_secs * 1000
            : 2000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          // Check status
          const status = await this.oauth1Client.v1.get('media/upload', {
            command: 'STATUS',
            media_id: mediaId,
          });

          processingInfo = status.processing_info;
        }

        return { mediaId, processingInfo };
      }

      return { mediaId, processingInfo: finalize.processing_info };
    } catch (error) {
      console.error('Error uploading large media:', error);
      throw new Error('Failed to upload large media. The file may be too large.');
    }
  }

  /**
   * Convert media data to buffer
   * @param data The media data to convert
   * @returns The media data as a buffer
   */
  private async convertToBuffer(data: string | Blob): Promise<Buffer> {
    if (typeof data === 'string') {
      // Handle base64 data
      if (data.startsWith('data:')) {
        // Extract base64 data from data URL
        const base64Data = data.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's a URL or file path
        return Buffer.from(data);
      }
    } else {
      // Handle Blob data
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  }
}
