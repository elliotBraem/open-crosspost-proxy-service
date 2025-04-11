import type { StatusCode } from 'hono/utils/http-status';
import { BaseError } from './base-error.ts';

/**
 * API Error codes for standardized error identification
 */
export enum ApiErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',

  // Platform-specific errors
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',

  // Content errors
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  DUPLICATE_CONTENT = 'DUPLICATE_CONTENT',

  // Media errors
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',

  // Post errors
  POST_CREATION_FAILED = 'POST_CREATION_FAILED',
  THREAD_CREATION_FAILED = 'THREAD_CREATION_FAILED',
  POST_DELETION_FAILED = 'POST_DELETION_FAILED',
  POST_INTERACTION_FAILED = 'POST_INTERACTION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * API Error class for application-level errors
 */
export class ApiError extends BaseError {
  public readonly code: ApiErrorCode;
  public readonly status: StatusCode;
  public readonly details?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
    status: StatusCode = 500,
    details?: Record<string, any>,
    recoverable: boolean = false,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }

  /**
   * Create a validation error
   */
  static validation(message: string, details?: Record<string, any>): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.VALIDATION_ERROR,
      400,
      details,
      true,
    );
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.UNAUTHORIZED,
      401,
      undefined,
      true,
    );
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.FORBIDDEN,
      403,
      undefined,
      false,
    );
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.NOT_FOUND,
      404,
      undefined,
      false,
    );
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.RATE_LIMITED,
      429,
      details,
      true,
    );
  }

  /**
   * Create an internal server error
   */
  static internal(
    message: string = 'Internal server error',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.INTERNAL_ERROR,
      500,
      details,
      false,
    );
  }
}
