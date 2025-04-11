/**
 * Enhanced Response Schemas and Types
 * Defines schemas and types for the enhanced API response format
 */

import { z } from 'zod';
import type { PlatformName } from './common.ts';

/**
 * Standard API response schema
 */
export const ApiResponseSchema = z.object({
  data: z.any().describe('Response data'),
  meta: z.object({
    rateLimit: z.object({
      remaining: z.number().describe('Number of requests remaining in the current window'),
      limit: z.number().describe('Total number of requests allowed in the window'),
      reset: z.number().describe('Timestamp when the rate limit resets (in seconds since epoch)'),
    }).optional().describe('Rate limit information'),
    pagination: z.object({
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of items per page'),
      total: z.number().describe('Total number of items'),
      totalPages: z.number().describe('Total number of pages'),
      nextCursor: z.string().optional().describe('Next page cursor (if applicable)'),
      prevCursor: z.string().optional().describe('Previous page cursor (if applicable)'),
    }).optional().describe('Pagination information'),
  }).optional().describe('Response metadata'),
}).describe('Standard API response');

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    type: z.string().describe('Error type'),
    message: z.string().describe('Error message'),
    code: z.string().optional().describe('Error code (if applicable)'),
    details: z.any().optional().describe('Additional error details'),
  }).describe('Error information'),
}).describe('Error response');

/**
 * Schema for enhanced response metadata
 */
export const EnhancedResponseMetaSchema = z.object({
  requestId: z.string().optional().describe('Unique request identifier'),
  timestamp: z.string().optional().describe('Request timestamp'),
  rateLimit: z.object({
    remaining: z.number().describe('Number of requests remaining in the current window'),
    limit: z.number().describe('Total number of requests allowed in the window'),
    reset: z.number().describe('Timestamp when the rate limit resets (in seconds since epoch)'),
  }).optional().describe('Rate limit information'),
  pagination: z.object({
    page: z.number().describe('Current page number'),
    perPage: z.number().describe('Number of items per page'),
    total: z.number().describe('Total number of items'),
    totalPages: z.number().describe('Total number of pages'),
    nextCursor: z.string().optional().describe('Next page cursor (if applicable)'),
    prevCursor: z.string().optional().describe('Previous page cursor (if applicable)'),
  }).optional().describe('Pagination information'),
}).optional().describe('Response metadata');

/**
 * Schema for error details
 */
export const ErrorDetailSchema = z.object({
  platform: z.string().optional().describe('Platform associated with the error (if applicable)'),
  userId: z.string().optional().describe('User ID associated with the error (if applicable)'),
  status: z.literal('error').describe('Error status'),
  error: z.string().describe('Human-readable error message'),
  errorCode: z.string().describe('Machine-readable error code'),
  recoverable: z.boolean().describe('Whether the error is recoverable (can be retried)'),
  details: z.record(z.any()).optional().describe('Additional error details (platform-specific)'),
}).describe('Error detail');

/**
 * Schema for enhanced error response
 */
export const EnhancedErrorResponseSchema = z.object({
  success: z.literal(false).describe('Success indicator (always false for error responses)'),
  errors: z.array(ErrorDetailSchema).describe('Error information'),
}).describe('Enhanced error response');

/**
 * Schema for success details
 */
export const SuccessDetailSchema = z.object({
  platform: z.string().describe('Platform associated with the success'),
  userId: z.string().describe('User ID associated with the success'),
  status: z.literal('success').describe('Success status'),
  postId: z.string().optional().describe('Post ID (if applicable)'),
  postUrl: z.string().optional().describe('Post URL (if applicable)'),
}).catchall(z.any()).describe('Success detail');

/**
 * Schema for multi-status response
 */
export const MultiStatusResponseSchema = z.object({
  success: z.boolean().describe('Success indicator (true if at least one operation succeeded)'),
  data: z.object({
    summary: z.object({
      total: z.number().describe('Total number of operations'),
      succeeded: z.number().describe('Number of successful operations'),
      failed: z.number().describe('Number of failed operations'),
    }).describe('Summary of operations'),
    results: z.array(SuccessDetailSchema).describe('Successful results'),
    errors: z.array(ErrorDetailSchema).describe('Failed results'),
  }).describe('Response data'),
}).describe('Multi-status response');

/**
 * Function to create an enhanced response schema
 * @param schema The schema to wrap
 * @returns A schema for an enhanced response
 */
export function EnhancedResponseSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    success: z.boolean().describe('Whether the request was successful'),
    data: schema,
    meta: EnhancedResponseMetaSchema,
  });
}

// Derive TypeScript types from Zod schemas
export type EnhancedResponseMeta = z.infer<typeof EnhancedResponseMetaSchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type EnhancedErrorResponse = z.infer<typeof EnhancedErrorResponseSchema>;
export type SuccessDetail = z.infer<typeof SuccessDetailSchema>;
export type MultiStatusResponse = z.infer<typeof MultiStatusResponseSchema>;
export type ApiResponse<T> = {
  data: T;
  meta?: {
    rateLimit?: { remaining: number; limit: number; reset: number };
    pagination?: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
      nextCursor?: string;
      prevCursor?: string;
    };
  };
};
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Enhanced API response type
 */
export interface EnhancedApiResponse<T> {
  success: boolean;
  data: T;
  meta?: EnhancedResponseMeta;
}

/**
 * Helper function to create an enhanced API response
 * @param data The response data
 * @param meta Optional metadata
 * @returns An enhanced API response
 */
export function createEnhancedApiResponse<T>(
  data: T,
  meta?: EnhancedResponseMeta,
): EnhancedApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create a standard API response
 * @param data The response data
 * @param meta The response metadata
 * @returns A standard API response
 */
export function createApiResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    data,
    meta,
  };
}

/**
 * Create an error response
 * @param type The error type
 * @param message The error message
 * @param code The error code (if applicable)
 * @param details Additional error details
 * @returns An error response
 */
export function createErrorResponse(
  type: string,
  message: string,
  code?: string,
  details?: any,
): ErrorResponse {
  return {
    error: {
      type,
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
  };
}

/**
 * Helper function to create an enhanced error response
 * @param errors Array of error details
 * @returns An enhanced error response
 */
export function createEnhancedErrorResponse(errors: ErrorDetail[]): EnhancedErrorResponse {
  return {
    success: false,
    errors,
  };
}

/**
 * Helper function to create an error detail
 * @param error Error message
 * @param errorCode Error code
 * @param recoverable Whether the error is recoverable
 * @param platform Optional platform
 * @param userId Optional user ID
 * @param details Optional additional details
 * @returns An error detail
 */
export function createErrorDetail(
  error: string,
  errorCode: string,
  recoverable: boolean,
  platform?: PlatformName,
  userId?: string,
  details?: Record<string, any>,
): ErrorDetail {
  return {
    platform,
    userId,
    status: 'error',
    error,
    errorCode,
    recoverable,
    details,
  };
}

/**
 * Helper function to create a success detail
 * @param platform Platform
 * @param userId User ID
 * @param additionalData Additional data
 * @returns A success detail
 */
export function createSuccessDetail(
  platform: PlatformName,
  userId: string,
  additionalData?: Record<string, any>,
): SuccessDetail {
  return {
    platform,
    userId,
    status: 'success',
    ...additionalData,
  };
}

/**
 * Helper function to create a multi-status response
 * @param results Successful results
 * @param errors Failed results
 * @returns A multi-status response
 */
export function createMultiStatusResponse(
  results: SuccessDetail[],
  errors: ErrorDetail[],
): MultiStatusResponse {
  const total = results.length + errors.length;
  const succeeded = results.length;
  const failed = errors.length;

  return {
    success: succeeded > 0,
    data: {
      summary: {
        total,
        succeeded,
        failed,
      },
      results,
      errors,
    },
  };
}
