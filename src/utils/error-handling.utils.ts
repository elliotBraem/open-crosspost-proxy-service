import { ApiErrorCode, PlatformError } from '@crosspost/types';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * Map of API error codes to HTTP status codes
 * This ensures consistent HTTP status codes across the application
 */
export const errorCodeToStatusCode: Record<ApiErrorCode, StatusCode> = {
  [ApiErrorCode.UNKNOWN_ERROR]: 500,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.PLATFORM_ERROR]: 500,
  [ApiErrorCode.PLATFORM_UNAVAILABLE]: 503,
  [ApiErrorCode.CONTENT_POLICY_VIOLATION]: 400,
  [ApiErrorCode.DUPLICATE_CONTENT]: 400,
  [ApiErrorCode.MEDIA_UPLOAD_FAILED]: 400,
  [ApiErrorCode.POST_CREATION_FAILED]: 500,
  [ApiErrorCode.THREAD_CREATION_FAILED]: 500,
  [ApiErrorCode.POST_DELETION_FAILED]: 500,
  [ApiErrorCode.POST_INTERACTION_FAILED]: 500,
  [ApiErrorCode.NETWORK_ERROR]: 503,
};

/**
 * Get the appropriate HTTP status code for an error
 *
 * @param errorCode The API error code
 * @returns The corresponding HTTP status code
 */
export function getStatusCodeForError(errorCode: ApiErrorCode): StatusCode {
  return errorCodeToStatusCode[errorCode] || 500;
}

/**
 * Enhance a PlatformError with operation context
 *
 * @param error The PlatformError to enhance
 * @param operation The operation being performed (e.g., 'createPost', 'createThread')
 * @returns The enhanced PlatformError
 */
export function enhanceErrorWithContext(
  error: PlatformError,
  operation: string,
): PlatformError {
  // Only modify the message if it doesn't already mention the operation
  if (!error.message.includes(`Failed to ${operation}`)) {
    error.message = `Failed to ${operation}: ${error.message}`;
  }
  return error;
}
