/**
 * @crosspost/sdk
 * SDK for interacting with the Crosspost API
 */

// Export main client
export { CrosspostClient } from './core/client.ts';
export type { CrosspostClientConfig } from './core/config.ts';

// Export API modules for advanced usage
export { ActivityApi } from './api/activity.ts';
export { AuthApi } from './api/auth.ts';
export { PostApi } from './api/post.ts';
export { SystemApi } from './api/system.ts';

// Export utility functions
export {
  apiWrapper,
  createNetworkError,
  enrichErrorWithContext,
  ERROR_CATEGORIES,
  getErrorDetails,
  getErrorMessage,
  handleErrorResponse,
  isAuthError,
  isContentError,
  isErrorOfCategory,
  isMediaError,
  isNetworkError,
  isPlatformError,
  isPostError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from './utils/error.ts';

// Re-export types from @crosspost/types for convenience
export * from '@crosspost/types';
