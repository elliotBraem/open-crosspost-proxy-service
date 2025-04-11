import { MediaContent } from '@crosspost/types';
import { Env } from '../../config/env.ts';
import {
  MediaStatusResult,
  MediaUploadResult,
  PlatformMedia,
} from '../../infrastructure/platform/abstract/platform-media.interface.ts';
import { TwitterMedia } from '../../infrastructure/platform/twitter/twitter-media.ts';

/**
 * Media Service
 * Domain service for media-related operations
 */
export class MediaService {
  private platformMedia: PlatformMedia;

  constructor(env: Env) {
    // For now, we only support Twitter
    this.platformMedia = new TwitterMedia(env);
  }

  /**
   * Upload media
   * @param userId The user ID uploading the media
   * @param media The media content to upload
   * @returns The media upload result
   */
  async uploadMedia(userId: string, media: MediaContent): Promise<MediaUploadResult> {
    try {
      return await this.platformMedia.uploadMedia(userId, media);
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get the status of a media upload
   * @param userId The user ID who uploaded the media
   * @param mediaId The ID of the media to check
   * @returns The media status result
   */
  async getMediaStatus(userId: string, mediaId: string): Promise<MediaStatusResult> {
    try {
      return await this.platformMedia.getMediaStatus(userId, mediaId);
    } catch (error) {
      console.error('Error getting media status:', error);
      throw error;
    }
  }

  /**
   * Update media metadata (e.g., alt text)
   * @param userId The user ID updating the media
   * @param mediaId The ID of the media to update
   * @param altText The alt text to set for the media
   * @returns True if the update was successful
   */
  async updateMediaMetadata(userId: string, mediaId: string, altText: string): Promise<boolean> {
    try {
      return await this.platformMedia.updateMediaMetadata(userId, mediaId, altText);
    } catch (error) {
      console.error('Error updating media metadata:', error);
      throw error;
    }
  }

  /**
   * Parse media content from form data
   * @param formData The form data containing the media
   * @returns The media content
   */
  parseMediaFromFormData(formData: FormData): MediaContent {
    const media = formData.get('media');
    const mimeType = formData.get('mimeType') as string || 'application/octet-stream';
    const altText = formData.get('altText') as string || undefined;

    if (!media) {
      throw new Error('Media is required');
    }

    return {
      data: media as Blob | string,
      mimeType,
      altText,
    };
  }
}
