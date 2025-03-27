import { Env } from '../index';
import { MediaService } from '../services/MediaService';

/**
 * Media handlers
 */
export const mediaRoutes = {
  /**
   * Upload media for tweets
   */
  async uploadMedia(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Media service instance
    const mediaService = new MediaService(env);
    
    // Upload the media
    return await mediaService.uploadMedia(request);
  },
  
  /**
   * Check status of media upload
   */
  async getMediaStatus(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Media service instance
    const mediaService = new MediaService(env);
    
    // Get the media status
    return await mediaService.getMediaStatus(request);
  },
};
