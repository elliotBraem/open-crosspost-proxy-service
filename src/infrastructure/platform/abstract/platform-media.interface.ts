/**
 * Platform Media Interface
 * Defines the common interface for platform-specific media operations
 */

import { MediaContent } from '@crosspost/types';

export interface MediaStatusResult {
  mediaId: string;
  state: string;
  processingComplete: boolean;
  progressPercent?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface MediaUploadResult {
  mediaId: string;
  processingInfo?: {
    state: string;
    checkAfterSecs?: number;
    progressPercent?: number;
    error?: {
      code: string;
      message: string;
    };
  };
}

export interface PlatformMedia {
  /**
   * Upload media to the platform
   * @param userId The user ID uploading the media
   * @param media The media content to upload
   */
  uploadMedia(userId: string, media: MediaContent): Promise<MediaUploadResult>;

  /**
   * Get the status of a media upload
   * @param userId The user ID who uploaded the media
   * @param mediaId The ID of the media to check
   */
  getMediaStatus(userId: string, mediaId: string): Promise<MediaStatusResult>;

  /**
   * Update media metadata (e.g., alt text)
   * @param userId The user ID updating the media
   * @param mediaId The ID of the media to update
   * @param altText The alt text to set for the media
   */
  updateMediaMetadata(userId: string, mediaId: string, altText: string): Promise<boolean>;
}
