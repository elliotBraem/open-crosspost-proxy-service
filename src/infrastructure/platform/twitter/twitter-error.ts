import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from 'twitter-api-v2';
import { ApiErrorCode, Platform, PlatformError } from '@crosspost/types';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * Twitter-specific error codes
 */
export enum TwitterErrorCode {
  // Common Twitter error codes
  RATE_LIMIT_EXCEEDED = 88,
  INVALID_OR_EXPIRED_TOKEN = 89,
  UNABLE_TO_VERIFY_CREDENTIALS = 32,
  RESOURCE_NOT_FOUND = 34,
  NOT_AUTHORIZED = 87,
  ACCOUNT_SUSPENDED = 64,
  DUPLICATE_STATUS = 187,
  OVER_CAPACITY = 130,
  INTERNAL_ERROR = 131,
  MEDIA_ID_NOT_FOUND = 324,
  MEDIA_TYPE_NOT_SUPPORTED = 324,
  MEDIA_TOO_LARGE = 323,
  INVALID_MEDIA = 93,
  FORBIDDEN_CONTENT = 226,
}

/**
 * Map of Twitter error codes to API error codes
 */
const twitterErrorToApiErrorCode: Record<number, ApiErrorCode> = {
  88: ApiErrorCode.RATE_LIMITED,
  89: ApiErrorCode.UNAUTHORIZED,
  32: ApiErrorCode.UNAUTHORIZED,
  34: ApiErrorCode.NOT_FOUND,
  87: ApiErrorCode.FORBIDDEN,
  64: ApiErrorCode.FORBIDDEN,
  187: ApiErrorCode.DUPLICATE_CONTENT,
  130: ApiErrorCode.PLATFORM_UNAVAILABLE,
  131: ApiErrorCode.PLATFORM_ERROR,
  324: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  323: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  93: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  226: ApiErrorCode.CONTENT_POLICY_VIOLATION,
};

/**
 * Twitter Error class for Twitter-specific errors
 * Extends PlatformError to ensure it can be handled generically
 */
export class TwitterError extends PlatformError {
  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    status: number = 502,
    originalError?: unknown,
    details?: Record<string, any>,
    recoverable: boolean = false,
    userId?: string,
  ) {
    super(
      message,
      Platform.TWITTER,
      code,
      recoverable,
      originalError,
      status as StatusCode,
      userId,
      details,
    );
  }

  /**
   * Parse a Twitter API error and convert it to our standardized PlatformError format
   * @param error The Twitter API error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  static fromTwitterApiError(error: unknown, userId?: string): TwitterError {
    // Handle ApiRequestError (network/connection errors)
    if (error instanceof ApiRequestError) {
      return TwitterError.fromRequestError(error, userId);
    }

    // Handle ApiPartialResponseError (partial response errors)
    if (error instanceof ApiPartialResponseError) {
      return TwitterError.fromPartialResponseError(error, userId);
    }

    // Handle ApiResponseError (Twitter API response errors)
    if (error instanceof ApiResponseError) {
      return TwitterError.fromResponseError(error, userId);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return new TwitterError(
        error.message,
        ApiErrorCode.UNKNOWN_ERROR,
        500,
        error,
        undefined,
        false,
        userId,
      );
    }

    // Handle unknown errors
    return new TwitterError(
      'Unknown Twitter API error',
      ApiErrorCode.UNKNOWN_ERROR,
      500,
      error,
      undefined,
      false,
      userId,
    );
  }

  /**
   * Parse a Twitter API request error
   * @param error The Twitter API request error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromRequestError(error: ApiRequestError, userId?: string): TwitterError {
    return new TwitterError(
      `Twitter API request error: ${error.message}`,
      ApiErrorCode.NETWORK_ERROR,
      502,
      error,
      {
        requestError: error.requestError?.message,
      },
      true, // Network errors are typically recoverable
      userId,
    );
  }

  /**
   * Parse a Twitter API partial response error
   * @param error The Twitter API partial response error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromPartialResponseError(
    error: ApiPartialResponseError,
    userId?: string,
  ): TwitterError {
    return new TwitterError(
      `Twitter API partial response error: ${error.message}`,
      ApiErrorCode.NETWORK_ERROR,
      502,
      error,
      {
        responseError: error.responseError?.message,
        rawContent: error.rawContent,
      },
      true, // Partial response errors are typically recoverable
      userId,
    );
  }

  /**
   * Parse a Twitter API response error
   * @param error The Twitter API response error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromResponseError(error: ApiResponseError, userId?: string): TwitterError {
    // Extract Twitter error details
    const twitterErrors = error.errors || [];
    const firstError = twitterErrors[0];

    // Handle different error formats (V1 vs V2)
    // V1 errors have code and message properties
    // V2 errors have a different structure
    let twitterErrorCode: number | undefined;
    let twitterErrorMessage: string = error.message;
    const errorDetails: Record<string, any> = {
      originalResponse: error.data,
      statusCode: error.code,
      headers: error.headers,
      allErrors: twitterErrors,
    };

    if (firstError) {
      // Check if it's a V1 error (has code property)
      if ('code' in firstError && typeof firstError.code === 'number') {
        twitterErrorCode = firstError.code;
        twitterErrorMessage = firstError.message || error.message;
        errorDetails.twitterErrorCode = firstError.code;
        errorDetails.twitterErrorMessage = firstError.message;
      } // For V2 errors, extract relevant information
      else if ('type' in firstError) {
        twitterErrorMessage = firstError.detail || firstError.title || error.message;
        errorDetails.errorType = firstError.type;
        errorDetails.errorDetail = firstError.detail;
        errorDetails.errorTitle = firstError.title;
      }
    }

    // Map Twitter error code to API error code
    let apiErrorCode = ApiErrorCode.PLATFORM_ERROR;
    let statusCode = error.code || 502;
    let recoverable = false;
    let errorMessage = `Twitter API error: ${twitterErrorMessage}`;

    // Check for rate limit errors
    if (error.rateLimitError || twitterErrorCode === TwitterErrorCode.RATE_LIMIT_EXCEEDED) {
      return new TwitterError(
        `Twitter rate limit exceeded: ${twitterErrorMessage}`,
        ApiErrorCode.RATE_LIMITED,
        429,
        error,
        errorDetails,
        true, // Rate limit errors are recoverable
        userId,
      );
    }

    // Check for authentication errors
    if (
      error.isAuthError ||
      twitterErrorCode === TwitterErrorCode.INVALID_OR_EXPIRED_TOKEN ||
      twitterErrorCode === TwitterErrorCode.UNABLE_TO_VERIFY_CREDENTIALS ||
      twitterErrorCode === TwitterErrorCode.NOT_AUTHORIZED
    ) {
      return new TwitterError(
        `Twitter authentication error: ${twitterErrorMessage}`,
        ApiErrorCode.UNAUTHORIZED,
        401,
        error,
        errorDetails,
        true, // Auth errors may be recoverable with token refresh
        userId,
      );
    }

    // Use the mapping for other error codes
    if (twitterErrorCode !== undefined && twitterErrorToApiErrorCode[twitterErrorCode]) {
      apiErrorCode = twitterErrorToApiErrorCode[twitterErrorCode];

      // Set appropriate status code and recoverable flag based on error type
      switch (apiErrorCode) {
        case ApiErrorCode.DUPLICATE_CONTENT:
          statusCode = 400;
          recoverable = true;
          errorMessage = `Duplicate content: ${twitterErrorMessage}`;
          break;
        case ApiErrorCode.CONTENT_POLICY_VIOLATION:
          statusCode = 400;
          recoverable = false;
          errorMessage = `Content policy violation: ${twitterErrorMessage}`;
          break;
        case ApiErrorCode.NOT_FOUND:
          statusCode = 404;
          recoverable = false;
          errorMessage = `Resource not found: ${twitterErrorMessage}`;
          break;
        case ApiErrorCode.FORBIDDEN:
          statusCode = 403;
          recoverable = false;
          errorMessage = `Account suspended: ${twitterErrorMessage}`;
          break;
        case ApiErrorCode.MEDIA_UPLOAD_FAILED:
          statusCode = 400;
          recoverable = true;
          errorMessage = `Media upload failed: ${twitterErrorMessage}`;
          break;
        case ApiErrorCode.PLATFORM_UNAVAILABLE:
          statusCode = 503;
          recoverable = true;
          errorMessage = `Twitter service error: ${twitterErrorMessage}`;
          break;
      }

      return new TwitterError(
        errorMessage,
        apiErrorCode,
        statusCode,
        error,
        errorDetails,
        recoverable,
        userId,
      );
    }

    // Default case for other errors
    return new TwitterError(
      `Twitter API error: ${twitterErrorMessage}`,
      ApiErrorCode.PLATFORM_ERROR,
      error.code || 502,
      error,
      errorDetails,
      false, // Default to not recoverable
      userId,
    );
  }
}
