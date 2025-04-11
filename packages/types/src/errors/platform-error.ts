import { ApiErrorCode } from './api-error.ts';
import type { PlatformName } from '../common.ts';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * Platform Error
 * Custom error class for platform-specific errors
 */
export class PlatformError extends Error {
  public readonly code: ApiErrorCode;
  public readonly recoverable: boolean;
  public readonly platform: PlatformName;
  public readonly userId?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    platform: PlatformName,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    recoverable: boolean = false,
    public originalError?: unknown,
    public status?: StatusCode,
    userId?: string,
    details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'PlatformError';
    this.code = code;
    this.recoverable = recoverable;
    this.platform = platform;
    this.userId = userId;
    this.details = details;
  }
}
